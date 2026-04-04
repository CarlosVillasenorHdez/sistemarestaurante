'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Truck, Plus, XCircle, MapPin, Phone, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';

interface DeliveryOrder {
  id: string;
  externalId: string;
  platform: 'uber_eats' | 'rappi' | 'didi_food' | 'manual';
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: 'recibido' | 'preparacion' | 'listo' | 'en_camino' | 'entregado' | 'cancelado';
  notes: string;
  receivedAt: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  uber_eats: '#06C167',
  rappi: '#FF441F',
  didi_food: '#FF6600',
  manual: '#1B3A6B',
};

const PLATFORM_LABELS: Record<string, string> = {
  uber_eats: 'Uber Eats',
  rappi: 'Rappi',
  didi_food: 'DiDi Food',
  manual: 'Manual',
};

const STATUS_FLOW = ['recibido', 'preparacion', 'listo', 'en_camino', 'entregado'];
const STATUS_LABELS: Record<string, string> = {
  recibido: 'Recibido',
  preparacion: 'En Preparación',
  listo: 'Listo',
  en_camino: 'En Camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  recibido: '#f59e0b',
  preparacion: '#3b82f6',
  listo: '#10b981',
  en_camino: '#8b5cf6',
  entregado: '#6b7280',
  cancelado: '#ef4444',
};

const emptyForm = {
  platform: 'manual' as const,
  customerName: '',
  customerAddress: '',
  customerPhone: '',
  notes: '',
  items: [{ name: '', qty: 1, price: 0 }],
};

export default function DeliveryManagement() {
  const supabase = createClient();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_orders')
        .select('*')
        .order('received_at', { ascending: false });
      if (error) throw error;
      setOrders((data || []).map((o: any) => ({
        id: o.id,
        externalId: o.external_id,
        platform: o.platform,
        customerName: o.customer_name,
        customerAddress: o.customer_address,
        customerPhone: o.customer_phone,
        items: o.items || [],
        subtotal: Number(o.subtotal),
        deliveryFee: Number(o.delivery_fee),
        total: Number(o.total),
        status: o.status,
        notes: o.notes,
        receivedAt: o.received_at,
      })));
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const addItem = () => setForm({ ...form, items: [...form.items, { name: '', qty: 1, price: 0 }] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i: number, field: string, value: any) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  };

  const subtotal = form.items.reduce((s, item) => s + item.qty * item.price, 0);

  const handleSave = async () => {
    if (!form.customerName.trim()) { toast.error('El nombre del cliente es obligatorio'); return; }
    setSaving(true);
    try {
      const payload = {
        platform: form.platform,
        customer_name: form.customerName,
        customer_address: form.customerAddress,
        customer_phone: form.customerPhone,
        items: form.items.filter(i => i.name.trim()),
        subtotal,
        delivery_fee: 0,
        total: subtotal,
        notes: form.notes,
        status: 'recibido',
        received_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('delivery_orders').insert(payload);
      if (error) throw error;
      toast.success('Pedido de delivery registrado');
      setShowForm(false);
      setForm(emptyForm);
      loadOrders();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const advanceStatus = async (order: DeliveryOrder) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[idx + 1];
    const { error } = await supabase.from('delivery_orders').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', order.id);
    if (error) { toast.error('Error: ' + error.message); return; }

    // Al pasar a preparación, crear orden en el KDS (tabla orders)
    if (nextStatus === 'preparacion') {
      const platformLabel = PLATFORM_LABELS[order.platform] ?? order.platform;
      const orderId = `DEL-${order.id.slice(-8).toUpperCase()}`;
      const subtotal = order.subtotal;
      const iva = Math.round(subtotal * 0.16 * 100) / 100;
      const total = subtotal + iva;

      // Evitar duplicados si ya se envió este pedido a cocina
      const { data: existing } = await supabase
        .from('orders').select('id').eq('id', orderId).maybeSingle();

      if (!existing) {
        const { error: insertErr } = await supabase.from('orders').insert({
          id: orderId,
          mesa: platformLabel,
          mesa_num: 0,
          mesero: `Delivery`,
          subtotal,
          iva,
          discount: 0,
          total,
          status: 'preparacion',
          kitchen_status: 'pendiente',
          branch: 'Delivery',
          notes: `${platformLabel} · ${order.customerName}${order.customerAddress ? ' · ' + order.customerAddress : ''}`,
          opened_at: order.receivedAt || new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (!insertErr && order.items.length > 0) {
          await supabase.from('order_items').insert(
            order.items.map(i => ({
              order_id: orderId,
              name: i.name,
              qty: i.qty,
              price: i.price,
              emoji: '🛵',
              notes: null,
            }))
          );
        }
      }
      toast.success(`Pedido enviado a cocina · ${STATUS_LABELS[nextStatus]}`);
    } else {
      toast.success(`Estado: ${STATUS_LABELS[nextStatus]}`);
    }

    loadOrders();
  };

  const cancelOrder = async (id: string) => {
    if (!confirm('¿Cancelar este pedido?')) return;
    const { error } = await supabase.from('delivery_orders').update({ status: 'cancelado' }).eq('id', id);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Pedido cancelado');
    loadOrders();
  };

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);
  const activeOrders = orders.filter(o => !['entregado', 'cancelado'].includes(o.status));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Activos', value: activeOrders.length, color: '#f59e0b' },
          { label: 'Entregados Hoy', value: orders.filter(o => o.status === 'entregado' && o.receivedAt?.startsWith(new Date().toISOString().split('T')[0])).length, color: '#10b981' },
          { label: 'Total Hoy', value: `$${orders.filter(o => o.status === 'entregado' && o.receivedAt?.startsWith(new Date().toISOString().split('T')[0])).reduce((s, o) => s + o.total, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, color: '#1B3A6B' },
          { label: 'Cancelados', value: orders.filter(o => o.status === 'cancelado').length, color: '#ef4444' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Webhook info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Integración por Webhooks</p>
            <p className="text-xs text-blue-600 mt-1">
              Para recibir pedidos automáticamente de Uber Eats o Rappi, configura el webhook en tu cuenta de la plataforma apuntando a:
            </p>
            <code className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-1 block break-all">
              {process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/delivery
            </code>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {['all', ...STATUS_FLOW, 'cancelado'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? 'text-white' : 'text-gray-600 bg-white border border-gray-200'}`}
              style={filterStatus === s ? { backgroundColor: s === 'all' ? '#1B3A6B' : STATUS_COLORS[s] } : {}}
            >
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={loadOrders} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50">
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1B3A6B' }}>
            <Plus size={16} /> Pedido Manual
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Nuevo Pedido de Delivery</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100"><XCircle size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plataforma</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setForm({ ...form, platform: k as any })}
                      className={`py-2 px-2 rounded-lg text-xs font-medium border-2 transition-colors ${form.platform === k ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-white'}`}
                      style={form.platform === k ? { backgroundColor: PLATFORM_COLORS[k], borderColor: PLATFORM_COLORS[k] } : {}}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
                  <input type="text" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                  <input type="tel" value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
                  <input type="text" value={form.customerAddress} onChange={e => setForm({ ...form, customerAddress: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Artículos</label>
                  <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800">+ Agregar</button>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Nombre" className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
                    <input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} min={1} className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none text-center" />
                    <input type="number" value={item.price} onChange={e => updateItem(i, 'price', Number(e.target.value))} min={0} step={0.01} placeholder="$" className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><XCircle size={16} /></button>
                    )}
                  </div>
                ))}
                <div className="text-right text-sm font-semibold text-gray-800 mt-2">
                  Total: ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#1B3A6B' }}>
                {saving ? 'Guardando...' : 'Registrar Pedido'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Orders */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
            <Truck size={40} className="mx-auto mb-3 opacity-30" />
            <p>Sin pedidos de delivery</p>
          </div>
        ) : (
          filtered.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ backgroundColor: PLATFORM_COLORS[order.platform] }}>
                  {PLATFORM_LABELS[order.platform].split(' ')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{order.customerName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status] }}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    {order.customerAddress && <span className="flex items-center gap-1"><MapPin size={11} />{order.customerAddress}</span>}
                    {order.customerPhone && <span className="flex items-center gap-1"><Phone size={11} />{order.customerPhone}</span>}
                    <span className="font-medium text-gray-700">${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {order.items.map((item, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {item.qty}x {item.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {!['entregado', 'cancelado'].includes(order.status) && (
                    <button
                      onClick={() => advanceStatus(order)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{ backgroundColor: STATUS_COLORS[STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] || order.status] }}
                    >
                      <ChevronRight size={14} />
                      {STATUS_LABELS[STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1] || order.status]}
                    </button>
                  )}
                  {!['entregado', 'cancelado'].includes(order.status) && (
                    <button onClick={() => cancelOrder(order.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100">
                      <XCircle size={14} /> Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}