'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Plus, Minus, Send, X, ChevronLeft, Search, MessageSquare } from 'lucide-react';
import { useOrderFlow, type OrderFlowItem } from '@/hooks/useOrderFlow';
import type { DbTable, DbDish } from '@/lib/supabase/types';

interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: string;
  currentOrderId?: string;
}

const CATEGORIES = ['Todos', 'Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Extras'];

export default function MeseroMobileView() {
  const supabase = createClient();
  const { } = useAuth();
  const { ensureOpenOrder, syncItems, loadOrderItems, sendToKitchen } = useOrderFlow();

  const [tables, setTables] = useState<Table[]>([]);
  const [dishes, setDishes] = useState<DbDish[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orderItems, setOrderItems] = useState<OrderFlowItem[]>([]);
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'tables' | 'menu'>('tables');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('Sucursal Principal');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'branch_name')
      .single()
      .then(({ data }) => { if (data?.config_value) setBranchName(data.config_value); });
  }, [supabase]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: tablesData }, { data: dishesData }] = await Promise.all([
        supabase.from('restaurant_tables').select('*').order('number'),
        supabase.from('dishes').select('*').eq('available', true).order('category').order('name'),
      ]);
      setTables((tablesData || []).map((t: DbTable) => ({
        id: t.id, number: t.number, name: t.name, capacity: t.capacity,
        status: t.status, currentOrderId: t.current_order_id ?? undefined,
      })));
      setDishes((dishesData || []) as DbDish[]);
    } catch (err: any) {
      toast.error('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: refresh when table status changes from another terminal
  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      channel = supabase
        .channel(`mesero-tables-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
          loadData();
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (channel) { supabase.removeChannel(channel); channel = null; }
            const delay = Math.min(3000 * Math.pow(2, retryCount), 30000);
            retryCount += 1;
            if (!destroyed) retryTimeout = setTimeout(connect, delay);
          } else if (status === 'SUBSCRIBED') {
            retryCount = 0;
          }
        });
    };

    connect();
    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, loadData]);

  // ─── Table selection: load existing order if mesa already open ────────────

  const selectTable = async (table: Table) => {
    setSelectedTable(table);
    setShowCart(false);

    if (table.currentOrderId) {
      // Mesa ocupada — cargar items existentes
      const existing = await loadOrderItems(table.currentOrderId);
      setOrderItems(existing);
      setCurrentOrderId(table.currentOrderId);
    } else {
      setOrderItems([]);
      setCurrentOrderId(null);
    }

    setView('menu');
  };

  // ─── Item management ──────────────────────────────────────────────────────

  const computeTotal = (items: OrderFlowItem[]) =>
    items.reduce((s, i) => s + i.qty * i.price, 0);

  const syncToDb = useCallback(async (
    newItems: OrderFlowItem[],
    table: Table,
    orderId: string,
  ) => {
    const total = computeTotal(newItems) * 1.16;
    syncItems(orderId, [table.id], newItems, total);
  }, [syncItems]);

  const addItem = async (dish: DbDish) => {
    if (!selectedTable) return;

    const newItems = (() => {
      const existing = orderItems.find(i => i.dishId === dish.id);
      if (existing) return orderItems.map(i => i.dishId === dish.id ? { ...i, qty: i.qty + 1 } : i);
      return [...orderItems, {
        dishId: dish.id, name: dish.name, price: Number(dish.price),
        qty: 1, emoji: dish.emoji, notes: '',
      }];
    })();

    setOrderItems(newItems);

    // Ensure open order exists, then sync
    const waiter = 'Administrador';
    const flowTable = { id: selectedTable.id, number: selectedTable.number, name: selectedTable.name, currentOrderId: currentOrderId ?? undefined };
    const orderId = await ensureOpenOrder(flowTable, waiter, branchName);
    if (!currentOrderId) {
      setCurrentOrderId(orderId);
      setSelectedTable(prev => prev ? { ...prev, currentOrderId: orderId } : prev);
    }
    syncToDb(newItems, selectedTable, orderId);
  };

  const removeItem = async (dishId: string) => {
    if (!selectedTable || !currentOrderId) {
      // No order yet — just update local state
      setOrderItems(prev => {
        const ex = prev.find(i => i.dishId === dishId);
        if (ex && ex.qty > 1) return prev.map(i => i.dishId === dishId ? { ...i, qty: i.qty - 1 } : i);
        return prev.filter(i => i.dishId !== dishId);
      });
      return;
    }
    const newItems = orderItems.reduce<OrderFlowItem[]>((acc, i) => {
      if (i.dishId !== dishId) return [...acc, i];
      if (i.qty > 1) return [...acc, { ...i, qty: i.qty - 1 }];
      return acc;
    }, []);
    setOrderItems(newItems);
    syncToDb(newItems, selectedTable, currentOrderId);
  };

  const updateNote = (dishId: string, note: string) => {
    setOrderItems(prev => prev.map(i => i.dishId === dishId ? { ...i, notes: note } : i));
  };

  const getQty = (dishId: string) => orderItems.find(i => i.dishId === dishId)?.qty || 0;

  const subtotal = computeTotal(orderItems);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const itemCount = orderItems.reduce((s, i) => s + i.qty, 0);

  // ─── Send order to kitchen ────────────────────────────────────────────────

  const sendOrder = async () => {
    if (!selectedTable || orderItems.length === 0) return;
    setSending(true);
    try {
      const waiter = 'Administrador';
      const flowTable = { id: selectedTable.id, number: selectedTable.number, name: selectedTable.name, currentOrderId: currentOrderId ?? undefined };
      const orderId = await ensureOpenOrder(flowTable, waiter, branchName);

      // Final sync: flush debounce immediately
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('order_items').insert(
        orderItems.map(item => ({
          order_id: orderId,
          dish_id: item.dishId,
          name: item.name,
          qty: item.qty,
          price: item.price,
          emoji: item.emoji,
        }))
      );
      await supabase.from('restaurant_tables').update({
        status: 'ocupada',
        current_order_id: orderId,
        waiter,
        item_count: itemCount,
        partial_total: total,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedTable.id);

      // Mark kitchen_status as 'pendiente' so the KDS picks it up
      await sendToKitchen(orderId);

      toast.success(`Orden enviada a cocina — ${selectedTable.name}`);
      setOrderItems([]);
      setCurrentOrderId(null);
      setShowCart(false);
      setView('tables');
      setSelectedTable(null);
      loadData();
    } catch (err: any) {
      toast.error('Error al enviar orden: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const filteredDishes = dishes.filter(d => {
    const matchCat = category === 'Todos' || d.category === category;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {view === 'tables' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Selecciona una mesa para tomar el pedido</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {tables.map(table => (
              <button
                key={table.id}
                onClick={() => selectTable(table)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95 ${
                  table.status === 'libre' ? 'border-green-200 bg-green-50 hover:bg-green-100'
                    : table.status === 'ocupada'? 'border-red-200 bg-red-50 hover:bg-red-100' :'border-amber-200 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <span className="text-2xl">🪑</span>
                <span className="text-xs font-bold text-gray-800">{table.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  table.status === 'libre' ? 'bg-green-100 text-green-700' :
                  table.status === 'ocupada' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {table.status === 'libre' ? 'Libre' : table.status === 'ocupada' ? 'Ocupada' : 'Espera'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'menu' && selectedTable && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('tables'); setSelectedTable(null); setOrderItems([]); setCurrentOrderId(null); }}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{selectedTable.name}</h3>
              <p className="text-xs text-gray-500">Cap. {selectedTable.capacity} personas</p>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: '#1B3A6B' }}
            >
              <ShoppingCart size={16} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                  {itemCount}
                </span>
              )}
              {subtotal > 0 && <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>}
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar platillo..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === cat ? 'text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
                style={category === cat ? { backgroundColor: '#1B3A6B' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filteredDishes.map(dish => {
              const qty = getQty(dish.id);
              return (
                <div key={dish.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="h-16 flex items-center justify-center text-4xl" style={{ backgroundColor: '#f8f9fa' }}>
                    {dish.emoji}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-800 leading-tight mb-1 line-clamp-2">{dish.name}</p>
                    <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>${Number(dish.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    <div className="flex items-center justify-between mt-2">
                      {qty === 0 ? (
                        <button
                          onClick={() => addItem(dish)}
                          className="w-full py-1.5 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1 active:scale-95 transition-transform"
                          style={{ backgroundColor: '#1B3A6B' }}
                        >
                          <Plus size={14} /> Agregar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 w-full justify-between">
                          <button onClick={() => removeItem(dish.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white active:scale-95" style={{ backgroundColor: '#ef4444' }}>
                            <Minus size={14} />
                          </button>
                          <span className="font-bold text-gray-800">{qty}</span>
                          <button onClick={() => addItem(dish)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white active:scale-95" style={{ backgroundColor: '#10b981' }}>
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Pedido — {selectedTable?.name}</h3>
              <button onClick={() => setShowCart(false)} className="p-2 rounded-xl hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {orderItems.map(item => (
                <div key={item.dishId} className="border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeItem(item.dishId)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
                        <Minus size={12} />
                      </button>
                      <span className="font-bold text-gray-800 w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() => addItem(dishes.find(d => d.id === item.dishId) ?? { id: item.dishId, name: item.name, price: item.price, emoji: item.emoji, category: '', available: true, description: '', image: null, image_alt: null, popular: false, created_at: '', updated_at: null })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#10b98120', color: '#10b981' }}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => setExpandedNoteId(expandedNoteId === item.dishId ? null : item.dishId)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: item.notes ? 'rgba(245,158,11,0.15)' : '#f3f4f6', color: item.notes ? '#d97706' : '#9ca3af' }}
                        title="Nota para cocina"
                      >
                        <MessageSquare size={12} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-800 w-16 text-right">
                      ${(item.qty * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {item.notes && expandedNoteId !== item.dishId && (
                    <p className="text-xs mt-1 ml-9 italic" style={{ color: '#d97706' }}>📝 {item.notes}</p>
                  )}
                  {expandedNoteId === item.dishId && (
                    <div className="mt-1.5 ml-9 mr-2">
                      <input
                        type="text"
                        value={item.notes ?? ''}
                        onChange={(e) => updateNote(item.dishId, e.target.value)}
                        placeholder="Sin cebolla, término medio..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border outline-none"
                        style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#92400e' }}
                        autoFocus
                        onBlur={() => setExpandedNoteId(null)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setExpandedNoteId(null); }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-gray-100 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>IVA (16%)</span>
                <span>${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <button
                onClick={sendOrder}
                disabled={sending || orderItems.length === 0}
                className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
                style={{ backgroundColor: '#1B3A6B' }}
              >
                <Send size={18} /> {sending ? 'Enviando...' : 'Enviar a Cocina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}