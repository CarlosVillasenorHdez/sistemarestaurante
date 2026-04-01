'use client';

// useOrderFlow — shared order lifecycle logic for POS and Mesero Móvil.
//
// Encapsulates:
//   - Opening an order in DB when the first item is added (ensureOpenOrder)
//   - Syncing order_items + partial_total to DB with debounce (syncItems)
//   - Closing/paying an order (closeOrder)
//   - Cancelling an order (cancelOrder)
//   - Loading existing order items when a table is re-selected (loadOrderItems)
//
// Both POSClient and MeseroMobileView use this hook so the DB logic stays
// in one place. UI concerns (which view to show, modals, etc.) stay in the
// component.

import { useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DbOrderItem, DbDish } from '@/lib/supabase/types';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface OrderFlowItem {
  dishId: string;
  name: string;
  price: number;
  qty: number;
  emoji: string;
  notes?: string;
}

export interface OrderFlowTable {
  id: string;
  number: number;
  name: string;
  currentOrderId?: string;
  mergeGroupIds?: string[];  // all table ids in merge group (including self)
}

export interface OpenOrderResult {
  orderId: string;
  isNew: boolean;
}

export interface CloseOrderParams {
  orderId: string;
  tableIds: string[];
  items: OrderFlowItem[];
  subtotal: number;
  discountAmount: number;
  iva: number;
  total: number;
  payMethod: 'efectivo' | 'tarjeta';
  waiterName: string;
  branchName: string;
  openedAt: string | null;
  loyaltyCustomerId?: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrderFlow() {
  const supabase = createClient();
  const { tenantId } = useAuth();
  const DEFAULT_TENANT = tenantId ?? '00000000-0000-0000-0000-000000000001';
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load existing order items when reopening a table ─────────────────────

  const loadOrderItems = useCallback(async (orderId: string): Promise<OrderFlowItem[]> => {
    const { data: rows, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (error) {
      toast.error('Error al cargar orden existente: ' + error.message);
      return [];
    }
    if (!rows || rows.length === 0) return [];

    // Hydrate with dish data where available
    const dishIds = [...new Set((rows as DbOrderItem[]).map(i => i.dish_id).filter(Boolean))] as string[];
    let dishMap: Record<string, DbDish> = {};

    if (dishIds.length > 0) {
      const { data: dishes } = await supabase.from('dishes').select('*').in('id', dishIds);
      (dishes || []).forEach((d: DbDish) => { dishMap[d.id] = d; });
    }

    return (rows as DbOrderItem[]).map(i => {
      const dish = i.dish_id ? dishMap[i.dish_id] : null;
      return {
        dishId: i.dish_id ?? i.id,
        name: dish?.name ?? i.name,
        price: dish ? Number(dish.price) : Number(i.price),
        qty: i.qty,
        emoji: dish?.emoji ?? i.emoji ?? '🍽️',
        notes: i.notes ?? '',
      };
    });
  }, [supabase]);

  // ── Open order in DB (idempotent — returns existing orderId if already open) ─

  const ensureOpenOrder = useCallback(async (
    table: OrderFlowTable,
    waiterName: string,
    branchName: string,
  ): Promise<string> => {
    if (table.currentOrderId) return table.currentOrderId;

    const orderId = `ORD-${Date.now()}`;
    const now = new Date().toISOString();
    const tableIds = table.mergeGroupIds ?? [table.id];

    const { error: orderErr } = await supabase.from('orders').insert({
      id: orderId,
      mesa: table.name,
      mesa_num: table.number,
      mesero: waiterName,
      subtotal: 0,
      iva: 0,
      discount: 0,
      total: 0,
      status: 'abierta',
      kitchen_status: 'en_edicion',
      branch: branchName,
      tenant_id: DEFAULT_TENANT,
    });

    if (orderErr) {
      toast.error('Error al abrir orden: ' + orderErr.message);
      throw orderErr;
    }

    const { error: tableErr } = await supabase.from('restaurant_tables').update({
      status: 'ocupada',
      current_order_id: orderId,
      waiter: waiterName,
      opened_at: now,
      item_count: 0,
      partial_total: 0,
      updated_at: now,
    }).in('id', tableIds);

    if (tableErr) {
      console.error('[useOrderFlow] Failed to update table status:', tableErr.message);
    }

    return orderId;
  }, [supabase]);

  // ── Sync items to DB with debounce (prevents race conditions on rapid clicks) ─

  const syncItems = useCallback((
    orderId: string,
    tableIds: string[],
    items: OrderFlowItem[],
    totalAmount: number,
    debounceMs = 400,
  ) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(async () => {
      const count = items.reduce((s, i) => s + i.qty, 0);

      const { error: delErr } = await supabase.from('order_items').delete().eq('order_id', orderId);
      if (delErr) { console.error('[useOrderFlow] sync delete error:', delErr.message); return; }

      if (items.length > 0) {
        const { error: insErr } = await supabase.from('order_items').insert(
          items.map(item => ({
            order_id: orderId,
            dish_id: item.dishId,
            name: item.name,
            qty: item.qty,
            price: item.price,
            emoji: item.emoji,
            notes: item.notes || null,
          }))
        );
        if (insErr) { console.error('[useOrderFlow] sync insert error:', insErr.message); return; }
      }

      await supabase.from('restaurant_tables').update({
        item_count: count,
        partial_total: totalAmount,
        updated_at: new Date().toISOString(),
      }).in('id', tableIds);
    }, debounceMs);
  }, [supabase]);

  // ── Close (pay) order ─────────────────────────────────────────────────────

  const closeOrder = useCallback(async (params: CloseOrderParams): Promise<boolean> => {
    const { orderId, tableIds, items, subtotal, discountAmount, iva, total,
            payMethod, openedAt, branchName, waiterName, loyaltyCustomerId } = params;
    const now = new Date().toISOString();

    try {
      // Update order to closed
      const { error: orderErr } = await supabase.from('orders').update({
        subtotal, iva, discount: discountAmount, total,
        status: 'cerrada', kitchen_status: 'entregada',
        pay_method: payMethod,
        opened_at: openedAt ?? now,
        closed_at: now,
        updated_at: now,
        branch: branchName,
        mesero: waiterName,
        ...(loyaltyCustomerId ? { loyalty_customer_id: loyaltyCustomerId } : {}),
      }).eq('id', orderId);

      if (orderErr) throw orderErr;

      // Sync final items
      await supabase.from('order_items').delete().eq('order_id', orderId);
      if (items.length > 0) {
        await supabase.from('order_items').insert(
          items.map(item => ({
            order_id: orderId,
            dish_id: item.dishId,
            name: item.name,
            qty: item.qty,
            price: item.price,
            emoji: item.emoji,
            notes: item.notes || null,
          }))
        );
      }

      // Deduct inventory in parallel
      const recipeResults = await Promise.all(
        items.map(item =>
          supabase
            .from('dish_recipes')
            .select('ingredient_id, quantity, ingredients(stock, name, unit)')
            .eq('dish_id', item.dishId)
            .then(res => ({ item, data: res.data }))
        )
      );

      type StockUpdate = {
        ingredientId: string; deductQty: number;
        currentStock: number; newStock: number;
        dishName: string; dishQty: number;
      };
      const stockUpdates: StockUpdate[] = [];

      for (const { item, data: recipeItems } of recipeResults) {
        if (!recipeItems) continue;
        for (const ri of recipeItems) {
          const ingredient = (ri as any).ingredients;
          if (!ingredient) continue;
          const deductQty = Number(ri.quantity) * item.qty;
          const currentStock = Number(ingredient.stock);
          stockUpdates.push({
            ingredientId: ri.ingredient_id,
            deductQty, currentStock,
            newStock: Math.max(0, currentStock - deductQty),
            dishName: item.name, dishQty: item.qty,
          });
        }
      }

      if (stockUpdates.length > 0) {
        await Promise.allSettled([
          ...stockUpdates.map(u =>
            supabase.from('ingredients')
              .update({ stock: u.newStock, updated_at: now })
              .eq('id', u.ingredientId)
          ),
          ...stockUpdates.map(u =>
            supabase.from('stock_movements').insert({
              ingredient_id: u.ingredientId,
              movement_type: 'salida',
              quantity: u.deductQty,
              previous_stock: u.currentStock,
              new_stock: u.newStock,
              reason: `Venta: ${u.dishName} x${u.dishQty} — Orden ${orderId}`,
              created_by: 'Sistema',
            })
          ),
        ]);
      }

      // Free tables
      await supabase.from('restaurant_tables').update({
        status: 'libre',
        current_order_id: null,
        waiter: null,
        opened_at: null,
        item_count: null,
        partial_total: null,
        merge_group_id: null,
        updated_at: now,
      }).in('id', tableIds);

      return true;
    } catch (err: any) {
      toast.error('Error al procesar pago: ' + (err?.message ?? 'Intenta de nuevo'));
      return false;
    }
  }, [supabase]);

  // ── Cancel order ──────────────────────────────────────────────────────────

  const cancelOrder = useCallback(async (
    orderId: string | null,
    tableIds: string[],
  ): Promise<boolean> => {
    try {
      if (orderId) {
        const { error } = await supabase.from('orders')
          .update({
            status: 'cancelada',
            kitchen_status: 'en_edicion',  // hide from KDS immediately
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
        if (error) throw error;
      }

      await supabase.from('restaurant_tables').update({
        status: 'libre',
        current_order_id: null,
        waiter: null,
        opened_at: null,
        item_count: null,
        partial_total: null,
        merge_group_id: null,
        updated_at: new Date().toISOString(),
      }).in('id', tableIds);

      return true;
    } catch (err: any) {
      toast.error('Error al cancelar orden: ' + (err?.message ?? 'Intenta de nuevo'));
      return false;
    }
  }, [supabase]);

  // ── Send order to kitchen — supports comandas ──────────────────────────────
  // First send: sets kitchen_status = 'pendiente' (order becomes visible in KDS).
  // Subsequent sends (comanda): if order is already visible in KDS (pendiente/preparacion/lista),
  // appends the new items as a kitchen_note with a unique batch ID instead of resetting status.
  // This ensures in-progress orders are never reverted to pendiente.

  const sendToKitchen = useCallback(async (
    orderId: string,
    newItems?: { name: string; qty: number; notes?: string }[],
  ): Promise<boolean> => {
    // Fetch current status first
    const { data: orderData } = await supabase
      .from('orders')
      .select('kitchen_status, kitchen_notes')
      .eq('id', orderId)
      .single();

    const currentStatus = orderData?.kitchen_status ?? 'en_edicion';
    // Any status other than 'en_edicion' means the order is already visible in KDS
    const alreadyInKDS = currentStatus !== 'en_edicion';

    if (alreadyInKDS && newItems && newItems.length > 0) {
      // COMANDA: append new items as a kitchen note with unique batch ID — never change status
      const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
      const comandaText = `🔔 COMANDA [${batchId}]:\n` +
        newItems.map(i => `  • ${i.qty}x ${i.name}${i.notes ? ` (${i.notes})` : ''}`).join('\n');
      const existingNotes = orderData?.kitchen_notes || '';
      const separator = existingNotes ? '\n\n' : '';
      const { error } = await supabase.from('orders').update({
        kitchen_notes: existingNotes + separator + comandaText,
        updated_at: new Date().toISOString(),
      }).eq('id', orderId);
      if (error) { toast.error('Error al enviar comanda: ' + error.message); return false; }
      toast.success('✅ Comanda adicional enviada a cocina');
      return true;
    }

    if (alreadyInKDS) {
      // Order already in KDS but no new items to append — nothing to do
      return true;
    }

    // First send: order is still 'en_edicion' — set to pendiente
    const { error } = await supabase.from('orders').update({
      kitchen_status: 'pendiente',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);

    if (error) {
      toast.error('Error al enviar a cocina: ' + error.message);
      return false;
    }
    return true;
  }, [supabase]);

  return { ensureOpenOrder, syncItems, closeOrder, cancelOrder, loadOrderItems, sendToKitchen };
}