'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Plus, Minus, Send, X, ChevronLeft, Search, MessageSquare, CreditCard } from 'lucide-react';
import PaymentModal from '@/app/(erp)/pos-punto-de-venta/components/PaymentModal';
import { useOrderFlow, type OrderFlowItem } from '@/hooks/useOrderFlow';
import { useFeatures } from '@/hooks/useFeatures';
import type { DbTable, DbDish } from '@/lib/supabase/types';

interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: string;
  currentOrderId?: string;
  waiter?: string;
}

const CATEGORIES = ['Todos', 'Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Extras'];

export default function MeseroMobileView() {
  const supabase = createClient();
  const { appUser } = useAuth();
  const { ensureOpenOrder, syncItems, loadOrderItems, sendToKitchen, closeOrder, cancelOrder } = useOrderFlow();
  const { features } = useFeatures();

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
  const [readyOrders, setReadyOrders] = useState<string[]>([]);
  const prevReadyRef = React.useRef<string[]>([]);
  const [branchName, setBranchName] = useState('Sucursal Principal');
  const [myName, setMyName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [kitchenNote, setKitchenNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'branch_name')
      .single()
      .then(({ data }) => { if (data?.config_value) setBranchName(data.config_value); });
  }, [supabase]);

  // Set name from authenticated session
  useEffect(() => {
    if (appUser?.fullName) {
      setMyName(appUser.fullName);
    } else {
      // Fallback: read from localStorage (allows override on shared devices)
      const saved = typeof window !== 'undefined' ? localStorage.getItem('aldente_waiter_name') : null;
      setMyName(saved || 'Mesero');
    }
  }, [appUser]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: tablesData }, { data: dishesData }] = await Promise.all([
        supabase.from('restaurant_tables').select('*').gt('number', 0).order('number'),
        supabase.from('dishes').select('*').eq('available', true).order('category').order('name'),
      ]);
      setTables((tablesData || []).map((t: DbTable) => ({
        id: t.id, number: t.number, name: t.name, capacity: t.capacity,
        status: t.status, currentOrderId: t.current_order_id ?? undefined,
        waiter: (t as any).waiter ?? undefined,
      })));
      setDishes((dishesData || []) as DbDish[]);
    } catch (err: any) {
      toast.error('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const playReadyChime = React.useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch { /* audio not available */ }
  }, []);

  const checkReadyOrders = React.useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('mesa')
      .eq('kitchen_status', 'lista')
      .in('status', ['abierta', 'lista', 'preparacion']);
    const mesaNames = (data || []).map((o: any) => o.mesa as string);
    setReadyOrders(mesaNames);
    const prev = prevReadyRef.current;
    const newReady = mesaNames.filter(m => !prev.includes(m));
    if (newReady.length > 0) playReadyChime();
    prevReadyRef.current = mesaNames;
  }, [supabase, playReadyChime]);

  useEffect(() => { checkReadyOrders(); }, [checkReadyOrders]);

  // Realtime: refresh when table status changes from another terminal
  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      channel = supabase
        .channel(`mesero-tables-sync`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, (payload: any) => {
          loadData();
          // If the currently-selected table was freed or taken by another device, update local state
          setSelectedTable(prev => {
            if (!prev) return prev;
            const changed = payload?.new ?? payload?.old;
            if (changed && changed.id === prev.id) {
              const newStatus = payload?.new?.status;
              const newOrderId = payload?.new?.current_order_id;
              // Table was freed remotely — go back to table list
              if (newStatus === 'libre' || (!newOrderId && prev.currentOrderId)) {
                setTimeout(() => {
                  setOrderItems([]);
                  setCurrentOrderId(null);
                  setShowCart(false);
                  setView('tables');
                }, 0);
                return null;
              }
              // Table was taken by someone else while we were viewing it
              if (newStatus === 'ocupada' && payload?.new?.waiter && payload?.new?.waiter !== prev.waiter) {
                setTimeout(() => {
                  setOrderItems([]);
                  setCurrentOrderId(null);
                  setShowCart(false);
                  setView('tables');
                  toast.error(`${prev.name} fue tomada por ${payload.new.waiter}`);
                }, 0);
                return null;
              }
            }
            return prev;
          });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
          loadData();
          checkReadyOrders();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
          loadData();
          checkReadyOrders();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, () => {
          loadData();
          checkReadyOrders();
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
  }, [supabase, loadData, checkReadyOrders]);

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

    // Use the authenticated waiter name — never fall back to 'Administrador'
    const waiter = myName || appUser?.fullName || 'Mesero';
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

  const sendKitchenNote = async () => {
    if (!currentOrderId || !kitchenNote.trim()) return;
    setSendingNote(true);
    await supabase.from('orders')
      .update({ kitchen_notes: kitchenNote.trim(), updated_at: new Date().toISOString() })
      .eq('id', currentOrderId);
    setSendingNote(false);
    setKitchenNote('');
    setShowNoteModal(false);
    toast.success('Nota enviada a cocina');
  };

  const handlePaymentComplete = async (method: 'efectivo' | 'tarjeta', amountPaid: number, loyaltyCustomerId?: string | null) => {
    if (!selectedTable || !currentOrderId) return;
    const ok = await closeOrder({
      orderId: currentOrderId,
      tableIds: [selectedTable.id],
      items: orderItems,
      subtotal,
      discountAmount: 0,
      iva,
      total,
      payMethod: method,
      waiterName: myName,
      branchName,
      openedAt: null,
      loyaltyCustomerId: loyaltyCustomerId ?? null,
    });
    if (!ok) return;
    setShowPayment(false);
    setShowCart(false);
    setOrderItems([]);
    setCurrentOrderId(null);
    setSelectedTable(null);
    setView('tables');
    await loadData();
    toast.success(`Pago de $${total.toFixed(2)} procesado. ¡Orden cerrada!`);
  };

  const sendOrder = async () => {
    if (!selectedTable || orderItems.length === 0) return;
    setSending(true);
    try {
      const waiter = myName;
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

  // ─── Cancel table ─────────────────────────────────────────────────────────

  const handleCancelTable = () => {
    setShowCancelConfirm(true);
  };

  const executeCancelTable = async () => {
    if (!selectedTable) return;
    setShowCancelConfirm(false);
    const ok = await cancelOrder(currentOrderId, [selectedTable.id]);
    if (!ok) return;
    setOrderItems([]);
    setCurrentOrderId(null);
    setSelectedTable(null);
    setShowCart(false);
    setView('tables');
    await loadData();
    toast.success(`${selectedTable.name} liberada`);
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
          {/* Waiter name badge */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Selecciona una mesa para tomar el pedido</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{ backgroundColor: '#1B3A6B', color: '#f59e0b' }}>
                👤 {myName}
              </span>
              {!appUser && editingName ? (
                <form onSubmit={e => {
                  e.preventDefault();
                  if (nameInput.trim()) {
                    setMyName(nameInput.trim());
                    localStorage.setItem('aldente_waiter_name', nameInput.trim());
                  }
                  setEditingName(false);
                }} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    autoFocus
                    aria-label="Tu nombre"
                    className="text-xs px-2 py-1 rounded-lg border w-24 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    style={{ borderColor: '#d1d5db', color: '#374151' }}
                    maxLength={30}
                  />
                  <button type="submit" className="text-xs text-green-600 font-semibold px-1" aria-label="Guardar nombre">✓</button>
                  <button type="button" onClick={() => setEditingName(false)} className="text-xs text-gray-400 px-1" aria-label="Cancelar">✕</button>
                </form>
              ) : !appUser ? (
                <button
                  onClick={() => { setNameInput(myName); setEditingName(true); }}
                  aria-label="Cambiar nombre del mesero"
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  cambiar
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {tables.map(table => {
              const isMyTable = table.status === 'ocupada' && table.waiter === myName;
              const isOtherTable = table.status === 'ocupada' && table.waiter && table.waiter !== myName;
              const isLibre = table.status === 'libre';
              const isReady = readyOrders.includes(table.name);

              let borderClass = '';
              let bgStyle: React.CSSProperties = {};
              if (isLibre) { borderClass = 'border-green-200'; bgStyle = { backgroundColor: '#f0fdf4' }; }
              else if (isMyTable) { borderClass = 'border-amber-300'; bgStyle = { backgroundColor: '#fffbeb' }; }
              else if (isOtherTable) { borderClass = 'border-gray-200'; bgStyle = { backgroundColor: '#f9fafb', opacity: 0.6 }; }
              else { borderClass = 'border-amber-200'; bgStyle = { backgroundColor: '#fffbeb' }; }

              const handleTableClick = () => {
                if (isOtherTable) {
                  toast.error(`Mesa de ${table.waiter} — no puedes modificarla`);
                  return;
                }
                selectTable(table);
              };

              return (
                <button
                  key={table.id}
                  onClick={handleTableClick}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95 ${borderClass} ${isOtherTable ? 'cursor-not-allowed' : 'hover:brightness-95'}`}
                  style={bgStyle}
                >
                  <span className="text-2xl">{isOtherTable ? '🔒' : isMyTable ? '🪑' : '🪑'}</span>
                  <span className="text-xs font-bold text-gray-800">{table.name}</span>
                  {isLibre && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Libre</span>}
                  {isMyTable && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Mi mesa</span>}
                  {isOtherTable && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">{table.waiter?.split(' ')[0]}</span>}
                  {!isLibre && !isMyTable && !isOtherTable && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Espera</span>}
                  {isReady && isMyTable && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse"
                      style={{ backgroundColor: '#bbf7d0', color: '#15803d' }}>
                      ✓ Lista
                    </span>
                  )}
                </button>
              );
            })}
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
            {selectedTable.currentOrderId && (
              <button
                onClick={handleCancelTable}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors active:scale-95"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                title="Cancelar y liberar mesa sin cobrar"
              >
                <X size={14} /> Cancelar mesa
              </button>
            )}
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
                className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
                style={{ backgroundColor: '#1B3A6B' }}
              >
                <Send size={16} /> {sending ? 'Enviando...' : 'Enviar a Cocina'}
              </button>
              {currentOrderId && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowNoteModal(true)}
                    className="py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }}
                  >
                    <MessageSquare size={15} /> Nota
                  </button>
                  <button
                    onClick={() => setShowPayment(true)}
                    disabled={orderItems.length === 0}
                    className="py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
                    style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}
                  >
                    <CreditCard size={15} /> Cobrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal nota a cocina */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl p-5 space-y-3"
            style={{ backgroundColor: 'white' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Nota a cocina</h3>
              <button onClick={() => { setShowNoteModal(false); setKitchenNote(''); }}
                className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="text-xs text-gray-500">
              Envía una nota urgente sobre la orden de {selectedTable?.name}.
              Aparecerá resaltada en la pantalla de cocina.
            </p>
            <textarea
              value={kitchenNote}
              onChange={e => setKitchenNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border text-sm resize-none outline-none"
              style={{ borderColor: '#e5e7eb', backgroundColor: '#fefce8' }}
              placeholder="Ej: sin cebolla en los tacos, alergia a mariscos, urgente mesa VIP..."
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowNoteModal(false); setKitchenNote(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                Cancelar
              </button>
              <button onClick={sendKitchenNote}
                disabled={sendingNote || !kitchenNote.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                {sendingNote ? 'Enviando...' : '📝 Enviar a cocina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayment && selectedTable && (
        <PaymentModal
          total={total}
          subtotal={subtotal}
          iva={iva}
          discount={0}
          items={orderItems.map(i => ({
            id: i.dishId,
            name: i.name,
            emoji: i.emoji,
            price: i.price,
            quantity: i.qty,
            notes: i.notes,
          }))}
          mesa={selectedTable.name}
          mesero={myName}
          onClose={() => setShowPayment(false)}
          onComplete={handlePaymentComplete}
        />
      )}

      {/* ── Confirm cancel table ── */}
      {showCancelConfirm && selectedTable && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mesero-cancel-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50">
              <span className="text-2xl">🗑️</span>
            </div>
            <h3 id="mesero-cancel-title" className="text-base font-bold text-center text-gray-900 mb-2">
              ¿Cancelar orden?
            </h3>
            <p className="text-sm text-center text-gray-500 mb-5">
              Se liberará <strong className="text-gray-800">{selectedTable.name}</strong> y se eliminarán todos los artículos sin cobrar.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                aria-label="Mantener la orden"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700"
              >
                Mantener orden
              </button>
              <button
                onClick={executeCancelTable}
                aria-label="Confirmar cancelar y liberar mesa"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}