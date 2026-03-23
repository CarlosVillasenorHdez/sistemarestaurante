'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import TableMap from './TableMap';
import type { LayoutTablePosition } from './TableMap';
import MenuGrid from './MenuGrid';
import OrderPanel from './OrderPanel';
import PaymentModal from './PaymentModal';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Merge, X } from 'lucide-react';

export type TableStatus = 'libre' | 'ocupada' | 'espera';

export interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  waiter?: string;
  openedAt?: string;
  itemCount?: number;
  partialTotal?: number;
  mergeGroupId?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
  emoji: string;
  popular?: boolean;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3 p-5">
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} className="rounded-xl animate-pulse" style={{ minHeight: '100px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }} />
      ))}
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse border" style={{ borderColor: '#e5e7eb' }}>
          <div className="h-24 bg-gray-100" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function POSClient() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [view, setView] = useState<'tables' | 'menu'>('tables');
  const [discount, setDiscount] = useState<{ type: 'pct' | 'fixed'; value: number }>({ type: 'pct', value: 0 });
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Layout state
  const [layoutTables, setLayoutTables] = useState<LayoutTablePosition[]>([]);
  const [layoutId, setLayoutId] = useState<string | null>(null);

  // Merge mode state
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [branchName, setBranchName] = useState('Sucursal Principal');

  const supabase = createClient();
  const IVA_RATE = 0.16;

  const subtotal = orderItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const discountAmount = discount.type === 'pct' ? subtotal * (discount.value / 100) : discount.value;
  const taxableAmount = subtotal - discountAmount;
  const iva = taxableAmount * IVA_RATE;
  const total = taxableAmount + iva;

  const fetchTables = useCallback(async () => {
    setLoadingTables(true);
    // First check system_config for table_count to sync
    const { data: configData } = await supabase.from('system_config').select('config_value').eq('config_key', 'table_count').single();
    const configuredCount = configData ? parseInt(configData.config_value) : 0;

    const { data, error } = await supabase.from('restaurant_tables').select('*').order('number');
    if (!error && data) {
      let tableList = data.map((t) => ({
        id: t.id,
        number: t.number,
        name: t.name,
        capacity: t.capacity,
        status: t.status as TableStatus,
        currentOrderId: t.current_order_id || undefined,
        waiter: t.waiter || undefined,
        openedAt: t.opened_at || undefined,
        itemCount: t.item_count || undefined,
        partialTotal: t.partial_total ? Number(t.partial_total) : undefined,
        mergeGroupId: t.merge_group_id || undefined,
      }));

      // If system_config has more tables than DB, auto-create missing ones
      if (configuredCount > tableList.length) {
        const existing = new Set(tableList.map((t) => t.number));
        const toInsert = [];
        for (let n = 1; n <= configuredCount; n++) {
          if (!existing.has(n)) {
            toInsert.push({ number: n, name: `Mesa ${n}`, capacity: 4, status: 'libre' });
          }
        }
        if (toInsert.length > 0) {
          const { data: inserted } = await supabase.from('restaurant_tables').insert(toInsert).select();
          if (inserted) {
            const newTables = inserted.map((t: any) => ({
              id: t.id,
              number: t.number,
              name: t.name,
              capacity: t.capacity,
              status: t.status as TableStatus,
              currentOrderId: undefined,
              waiter: undefined,
              openedAt: undefined,
              itemCount: undefined,
              partialTotal: undefined,
              mergeGroupId: undefined,
            }));
            tableList = [...tableList, ...newTables].sort((a, b) => a.number - b.number);
          }
        }
      }

      setTables(tableList);
    }

    // Fetch restaurant layout
    try {
      const { data: layoutData } = await supabase.from('restaurant_layout').select('*').limit(1).single();
      if (layoutData) {
        setLayoutId(layoutData.id);
        setLayoutTables((layoutData.tables_layout as LayoutTablePosition[]) || []);
      } else {
        setLayoutTables([]);
        setLayoutId(null);
      }
    } catch {
      setLayoutTables([]);
      setLayoutId(null);
    }

    setLoadingTables(false);
  }, [supabase]);

  const fetchMenu = useCallback(async () => {
    setLoadingMenu(true);
    const { data, error } = await supabase.from('dishes').select('*').eq('available', true).order('category').order('name');
    if (!error && data) {
      setMenuItems(data.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        price: Number(d.price),
        description: d.description,
        available: d.available,
        emoji: d.emoji,
        popular: d.popular,
      })));
    }
    setLoadingMenu(false);
  }, []);

  useEffect(() => {
    fetchTables();
    fetchMenu();
  }, [fetchTables, fetchMenu]);

  useEffect(() => {
    supabase.from('system_config')
      .select('config_value')
      .eq('config_key', 'branch_name')
      .single()
      .then(({ data }) => { if (data?.config_value) setBranchName(data.config_value); });
  }, []);

  // ─── Merge helpers ────────────────────────────────────────────────────────

  /** Given a table, find all sibling tables in the same merge group */
  const getMergeGroup = useCallback((table: Table): Table[] => {
    if (!table.mergeGroupId) return [table];
    return tables.filter((t) => t.mergeGroupId === table.mergeGroupId);
  }, [tables]);

  /** Resolve the canonical table for a merge group (the one with currentOrderId) */
  const getGroupPrimary = useCallback((table: Table): Table => {
    if (!table.mergeGroupId) return table;
    const group = tables.filter((t) => t.mergeGroupId === table.mergeGroupId);
    return group.find((t) => t.currentOrderId) ?? group[0] ?? table;
  }, [tables]);

  // ─── Table select ─────────────────────────────────────────────────────────

  const handleTableSelect = (table: Table) => {
    if (mergeMode) {
      // In merge mode, toggle selection
      setMergeSelection((prev) =>
        prev.includes(table.id) ? prev.filter((id) => id !== table.id) : [...prev, table.id]
      );
      return;
    }

    // If table belongs to a merge group, use the primary table's order
    const primary = getGroupPrimary(table);
    setSelectedTable(primary);
    setOrderItems([]);
    setDiscount({ type: 'pct', value: 0 });
    setView('menu');
  };

  // ─── Confirm merge ────────────────────────────────────────────────────────

  const handleConfirmMerge = async () => {
    if (mergeSelection.length < 2) {
      toast.error('Selecciona al menos 2 mesas para unir');
      return;
    }

    const selectedTables = tables.filter((t) => mergeSelection.includes(t.id));

    // Check if any already has a different merge group — unify them
    const existingGroups = Array.from(new Set(selectedTables.map((t) => t.mergeGroupId).filter(Boolean)));
    const groupId = existingGroups[0] ?? crypto.randomUUID();

    // Assign all selected tables to the same merge group
    await supabase
      .from('restaurant_tables')
      .update({ merge_group_id: groupId, updated_at: new Date().toISOString() })
      .in('id', mergeSelection);

    setMergeMode(false);
    setMergeSelection([]);
    await fetchTables();
    const names = selectedTables.map((t) => t.name).join(', ');
    toast.success(`Mesas unidas: ${names} — comparten el mismo ticket`);
  };

  // ─── Unmerge ──────────────────────────────────────────────────────────────

  const handleUnmerge = async (table: Table) => {
    if (!table.mergeGroupId) return;
    const group = tables.filter((t) => t.mergeGroupId === table.mergeGroupId);
    await supabase
      .from('restaurant_tables')
      .update({ merge_group_id: null, updated_at: new Date().toISOString() })
      .in('id', group.map((t) => t.id));
    await fetchTables();
    toast.success('Mesas separadas correctamente');
    if (selectedTable?.mergeGroupId === table.mergeGroupId) {
      setSelectedTable(null);
      setOrderItems([]);
      setView('tables');
    }
  };

  // ─── Cancel / Free table ──────────────────────────────────────────────────
  const handleCancelTable = async () => {
    if (!selectedTable) return;
    const groupIds = selectedTable.mergeGroupId
      ? tables.filter((t) => t.mergeGroupId === selectedTable.mergeGroupId).map((t) => t.id)
      : [selectedTable.id];

    await supabase.from('restaurant_tables').update({
      status: 'libre',
      current_order_id: null,
      waiter: null,
      opened_at: null,
      item_count: null,
      partial_total: null,
      merge_group_id: null,
      updated_at: new Date().toISOString(),
    }).in('id', groupIds);

    await fetchTables();
    setSelectedTable(null);
    setOrderItems([]);
    setView('tables');
    toast.success(`${selectedTable.name} liberada`);
  };

  const handleAddItem = (item: MenuItem) => {
    if (!item.available) return;
    setOrderItems((prev) => {
      const existing = prev.find((o) => o.menuItem.id === item.id);
      if (existing) return prev.map((o) => o.menuItem.id === item.id ? { ...o, quantity: o.quantity + 1 } : o);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setOrderItems((prev) =>
      prev.map((o) => o.menuItem.id === itemId ? { ...o, quantity: Math.max(0, o.quantity + delta) } : o).filter((o) => o.quantity > 0)
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setOrderItems((prev) => prev.filter((o) => o.menuItem.id !== itemId));
  };

  const handlePaymentComplete = async (method: 'efectivo' | 'tarjeta', amountPaid: number) => {
    if (selectedTable) {
      const orderId = `ORD-${Date.now()}`;
      const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      await supabase.from('orders').insert({
        id: orderId,
        mesa: selectedTable.name,
        mesa_num: selectedTable.number,
        mesero: selectedTable.waiter || 'Sin asignar',
        subtotal,
        iva,
        discount: discountAmount,
        total,
        status: 'cerrada',
        pay_method: method,
        opened_at: selectedTable.openedAt || now,
        closed_at: now,
        branch: branchName,
      });

      if (orderItems.length > 0) {
        await supabase.from('order_items').insert(
          orderItems.map((item) => ({
            order_id: orderId,
            name: item.menuItem.name,
            qty: item.quantity,
            price: item.menuItem.price,
            emoji: item.menuItem.emoji,
          }))
        );

        // ─── Deduct inventory based on dish recipes ───────────────────────
        // For each sold item, fetch its recipe and deduct ingredient quantities
        for (const orderItem of orderItems) {
          const { data: recipeItems } = await supabase
            .from('dish_recipes')
            .select('ingredient_id, quantity, ingredients(stock, name, unit)')
            .eq('dish_id', orderItem.menuItem.id);

          if (recipeItems && recipeItems.length > 0) {
            for (const recipeItem of recipeItems) {
              const ingredient = (recipeItem as any).ingredients;
              if (!ingredient) continue;
              const deductQty = Number(recipeItem.quantity) * orderItem.quantity;
              const currentStock = Number(ingredient.stock);
              const newStock = Math.max(0, currentStock - deductQty);

              // Update ingredient stock
              await supabase
                .from('ingredients')
                .update({ stock: newStock, updated_at: new Date().toISOString() })
                .eq('id', recipeItem.ingredient_id);

              // Log stock movement
              await supabase.from('stock_movements').insert({
                ingredient_id: recipeItem.ingredient_id,
                movement_type: 'salida',
                quantity: deductQty,
                previous_stock: currentStock,
                new_stock: newStock,
                reason: `Venta: ${orderItem.menuItem.name} x${orderItem.quantity} — Orden ${orderId}`,
                created_by: 'Sistema POS',
              });
            }
          }
        }
        // ─────────────────────────────────────────────────────────────────
      }

      // Free all tables in the merge group
      const groupIds = selectedTable.mergeGroupId
        ? tables.filter((t) => t.mergeGroupId === selectedTable.mergeGroupId).map((t) => t.id)
        : [selectedTable.id];

      await supabase.from('restaurant_tables').update({
        status: 'libre',
        current_order_id: null,
        waiter: null,
        opened_at: null,
        item_count: null,
        partial_total: null,
        merge_group_id: null,
        updated_at: new Date().toISOString(),
      }).in('id', groupIds);

      await fetchTables();
    }

    setShowPaymentModal(false);
    setOrderItems([]);
    setSelectedTable(null);
    setView('tables');
    toast.success(`Pago de $${total.toFixed(2)} procesado con ${method === 'efectivo' ? 'Efectivo' : 'Tarjeta'}. ¡Orden cerrada!`);
  };

  const handleMarkTableOccupied = async (table: Table) => {
    const now = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    await supabase.from('restaurant_tables').update({
      status: 'ocupada',
      opened_at: now,
      updated_at: new Date().toISOString(),
    }).eq('id', table.id);
    await fetchTables();
    handleTableSelect({ ...table, status: 'ocupada', openedAt: now });
  };

  // Merged tables label for the selected table
  const mergeGroupLabel = selectedTable?.mergeGroupId
    ? tables.filter((t) => t.mergeGroupId === selectedTable.mergeGroupId).map((t) => t.name).join(' + ')
    : null;

  // ─── Move table in layout ─────────────────────────────────────────────────
  const handleMoveTable = useCallback(
    async (tableNumber: number, newX: number, newY: number) => {
      const updated = layoutTables.map((lt) =>
        lt.number === tableNumber ? { ...lt, x: newX, y: newY } : lt
      );
      setLayoutTables(updated);

      // Persist to restaurant_layout
      const payload = { tables_layout: updated, updated_at: new Date().toISOString() };
      if (layoutId) {
        await supabase.from('restaurant_layout').update(payload).eq('id', layoutId);
      }
    },
    [layoutTables, layoutId, supabase]
  );

  // ─── Delete table from layout ─────────────────────────────────────────────
  const handleDeleteTable = useCallback(
    async (tableNumber: number) => {
      const updated = layoutTables.filter((lt) => lt.number !== tableNumber);
      setLayoutTables(updated);

      // Remove from restaurant_tables
      const tableToDelete = tables.find((t) => t.number === tableNumber);
      if (tableToDelete) {
        await supabase.from('restaurant_tables').delete().eq('id', tableToDelete.id);
        setTables((prev) => prev.filter((t) => t.number !== tableNumber));
      }

      // Persist updated layout
      const payload = { tables_layout: updated, updated_at: new Date().toISOString() };
      if (layoutId) {
        await supabase.from('restaurant_layout').update(payload).eq('id', layoutId);
      }

      // Update table_count in system_config
      await supabase.from('system_config').upsert(
        { config_key: 'table_count', config_value: String(updated.length) },
        { onConflict: 'config_key' }
      );
    },
    [layoutTables, layoutId, tables, supabase]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Punto de Venta" subtitle="Gestión de mesas y órdenes" />
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Panel tab bar */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-0 bg-white border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
              <button onClick={() => setView('tables')} className="px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-150" style={{ borderColor: view === 'tables' ? '#f59e0b' : 'transparent', color: view === 'tables' ? '#d97706' : '#6b7280' }}>
                Mapa de Mesas
              </button>
              <button onClick={() => setView('menu')} className="px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-150" style={{ borderColor: view === 'menu' ? '#f59e0b' : 'transparent', color: view === 'menu' ? '#d97706' : '#6b7280' }}>
                Menú
                {selectedTable && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                    {mergeGroupLabel ?? selectedTable.name}
                  </span>
                )}
              </button>

              {selectedTable && (
                <div className="ml-auto flex items-center gap-2 pb-1">
                  {selectedTable.mergeGroupId && (
                    <button
                      onClick={() => handleUnmerge(selectedTable)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                      style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <X size={12} />Separar mesas
                    </button>
                  )}
                  <button
                    onClick={handleCancelTable}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                    title="Cancelar y liberar mesa sin cobrar"
                  >
                    <X size={12} />Cancelar mesa
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-semibold text-amber-800">{mergeGroupLabel ?? selectedTable.name} — {orderItems.length} items</span>
                  </div>
                  <button onClick={() => { setSelectedTable(null); setOrderItems([]); setView('tables'); }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1">
                    Cambiar mesa
                  </button>
                </div>
              )}

              {!selectedTable && (
                <div className="ml-auto flex items-center gap-2 pb-1">
                  {mergeMode ? (
                    <>
                      <span className="text-xs text-gray-500">{mergeSelection.length} mesa(s) seleccionada(s)</span>
                      <button
                        onClick={handleConfirmMerge}
                        disabled={mergeSelection.length < 2}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40"
                        style={{ backgroundColor: '#1B3A6B', color: 'white' }}
                      >
                        <Merge size={12} />Confirmar unión
                      </button>
                      <button
                        onClick={() => { setMergeMode(false); setMergeSelection([]); }}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                        style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setMergeMode(true)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                      style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
                    >
                      <Merge size={12} />Unir mesas
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Merge mode banner */}
            {mergeMode && (
              <div className="flex items-center gap-3 px-4 py-2.5 text-sm flex-shrink-0" style={{ backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                <Merge size={15} style={{ color: '#d97706' }} />
                <span className="font-semibold text-amber-800">Modo unión de mesas:</span>
                <span className="text-amber-700">Selecciona 2 o más mesas para unirlas en un solo ticket</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {view === 'tables' ? (
                loadingTables ? <TableSkeleton /> : (
                  <TableMap
                    tables={tables}
                    onTableSelect={handleTableSelect}
                    onMarkOccupied={handleMarkTableOccupied}
                    selectedTableId={selectedTable?.id}
                    mergeMode={mergeMode}
                    mergeSelection={mergeSelection}
                    onUnmerge={handleUnmerge}
                    layoutTables={layoutTables.length > 0 ? layoutTables : undefined}
                    onMoveTable={handleMoveTable}
                    onDeleteTable={handleDeleteTable}
                  />
                )
              ) : (
                loadingMenu ? <MenuSkeleton /> : (
                  <MenuGrid
                    items={menuItems}
                    onAddItem={handleAddItem}
                    orderItems={orderItems}
                    selectedTable={selectedTable}
                  />
                )
              )}
            </div>
          </div>

          {/* Order Panel */}
          <OrderPanel
            selectedTable={selectedTable}
            mergeGroupLabel={mergeGroupLabel}
            orderItems={orderItems}
            subtotal={subtotal}
            discountAmount={discountAmount}
            iva={iva}
            total={total}
            discount={discount}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onDiscountChange={setDiscount}
            onCheckout={() => setShowPaymentModal(true)}
          />
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          total={total}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}