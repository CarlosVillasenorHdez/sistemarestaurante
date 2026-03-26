'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { createClient } from '@/lib/supabase/client';
import { ChefHat, Clock, CheckCircle, AlertCircle, RefreshCw, Bell, Flame, Coffee, UtensilsCrossed, Play, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type KitchenStatus = 'pendiente' | 'preparacion' | 'lista' | 'entregada';
type RealtimeStatus = 'conectado' | 'reconectando' | 'desconectado';

interface KitchenOrderItem {
  name: string;
  qty: number;
  emoji: string;
  notes?: string;
}

interface KitchenOrder {
  id: string;
  mesa: string;
  mesero: string;
  items: KitchenOrderItem[];
  kitchenStatus: KitchenStatus;
  kitchenNotes: string | null;
  kitchenStartedAt: string | null;
  kitchenCompletedAt: string | null;
  openedAt: string;
  createdAt: string;
  elapsedMin: number;
}

const STATUS_CONFIG: Record<KitchenStatus, { label: string; color: string; bg: string; border: string }> = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
  preparacion: { label: 'En Preparación', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' },
  lista: { label: 'Lista para Servir', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)' },
  entregada: { label: 'Entregada', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)' },
};

const COLUMNS: KitchenStatus[] = ['pendiente', 'preparacion', 'lista'];

// ─── Elapsed timer ────────────────────────────────────────────────────────────

function useElapsedTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

function calcElapsed(createdAt: string): number {
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diff / 60000);
}

// ─── Order Card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: KitchenOrder;
  onAdvance: (id: string, next: KitchenStatus) => void;
  onDeliver: (id: string) => void;
  tick: number;
}

function OrderCard({ order, onAdvance, onDeliver, tick }: OrderCardProps) {
  const elapsed = calcElapsed(order.createdAt);
  const cfg = STATUS_CONFIG[order.kitchenStatus];
  const isUrgent = elapsed >= 20 && order.kitchenStatus !== 'lista';
  const isWarning = elapsed >= 12 && elapsed < 20 && order.kitchenStatus !== 'lista';

  const nextStatus: Record<KitchenStatus, KitchenStatus | null> = {
    pendiente: 'preparacion',
    preparacion: 'lista',
    lista: null,
    entregada: null,
  };
  const next = nextStatus[order.kitchenStatus];

  const nextLabel: Record<KitchenStatus, string> = {
    pendiente: 'Iniciar',
    preparacion: 'Marcar Lista',
    lista: '',
    entregada: '',
  };

  return (
    <div
      className="rounded-xl p-4 mb-3 transition-all duration-200"
      style={{
        backgroundColor: '#1a2535',
        border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.5)' : isWarning ? 'rgba(245,158,11,0.4)' : cfg.border}`,
        boxShadow: isUrgent ? '0 0 0 1px rgba(239,68,68,0.2)' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: '#f1f5f9' }}>{order.mesa}</span>
            {isUrgent && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertCircle size={10} /> Urgente
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Mesero: {order.mesero}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold"
            style={{ backgroundColor: isUrgent ? 'rgba(239,68,68,0.15)' : isWarning ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.07)', color: isUrgent ? '#f87171' : isWarning ? '#f59e0b' : 'rgba(255,255,255,0.5)' }}
          >
            <Clock size={10} />
            <span>{elapsed} min</span>
          </div>
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{order.id.slice(-6)}</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1.5 mb-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <span className="text-base leading-none">{item.emoji}</span>
            <span className="flex-1 text-sm font-medium" style={{ color: '#f1f5f9' }}>{item.name}</span>
            <span className="text-sm font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>×{item.qty}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.kitchenNotes && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg mb-3" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
          <p className="text-xs" style={{ color: '#fbbf24' }}>{order.kitchenNotes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {next && (
          <button
            onClick={() => onAdvance(order.id, next)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
            style={{ backgroundColor: next === 'preparacion' ? '#3b82f6' : '#22c55e', color: '#fff' }}
          >
            {next === 'preparacion' ? <Play size={12} /> : <Check size={12} />}
            {nextLabel[order.kitchenStatus]}
          </button>
        )}
        {order.kitchenStatus === 'lista' && (
          <button
            onClick={() => onDeliver(order.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
            style={{ backgroundColor: '#6b7280', color: '#fff' }}
          >
            <CheckCircle size={12} />
            Entregada
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KitchenModule() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelivered, setShowDelivered] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('reconectando');
  const prevCountRef = useRef(0);
  const tick = useElapsedTick();
  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['abierta', 'preparacion', 'lista'])
      .order('created_at', { ascending: true });

    if (!error && data) {
      const mapped: KitchenOrder[] = data.map((o: any) => ({
        id: o.id,
        mesa: o.mesa,
        mesero: o.mesero,
        items: (o.order_items || []).map((item: any) => ({
          name: item.name,
          qty: item.qty,
          emoji: item.emoji || '🍽️',
          notes: item.notes,
        })),
        kitchenStatus: (o.kitchen_status || 'pendiente') as KitchenStatus,
        kitchenNotes: o.kitchen_notes || null,
        kitchenStartedAt: o.kitchen_started_at || null,
        kitchenCompletedAt: o.kitchen_completed_at || null,
        openedAt: o.opened_at || '',
        createdAt: o.created_at,
        elapsedMin: 0,
      }));

      // Alert if new orders arrived
      const pendingCount = mapped.filter((o) => o.kitchenStatus === 'pendiente').length;
      if (pendingCount > prevCountRef.current && prevCountRef.current >= 0) {
        setNewOrderAlert(true);
        setTimeout(() => setNewOrderAlert(false), 4000);
      }
      prevCountRef.current = pendingCount;
      setOrders(mapped);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Real-time subscription with auto-reconnect on failure
  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      setRealtimeStatus('reconectando');

      channel = supabase
        .channel(`kitchen-orders-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('conectado');
            retryCount = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeStatus('desconectado');
            if (channel) { supabase.removeChannel(channel); channel = null; }
            // Exponential backoff: 3s, 6s, 12s, máx 30s
            const delay = Math.min(3000 * Math.pow(2, retryCount), 30000);
            retryCount += 1;
            if (!destroyed) {
              retryTimeout = setTimeout(connect, delay);
            }
          } else {
            setRealtimeStatus('reconectando');
          }
        });
    };

    connect();

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, fetchOrders]);

  const handleAdvance = async (orderId: string, next: KitchenStatus) => {
    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      kitchen_status: next,
      updated_at: now,
    };
    if (next === 'preparacion') updates.kitchen_started_at = now;
    if (next === 'lista') updates.kitchen_completed_at = now;

    const statusMap: Record<KitchenStatus, string> = {
      pendiente: 'abierta',
      preparacion: 'preparacion',
      lista: 'lista',
      entregada: 'cerrada',
    };
    updates.status = statusMap[next];

    await supabase.from('orders').update(updates).eq('id', orderId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, kitchenStatus: next, kitchenStartedAt: next === 'preparacion' ? now : o.kitchenStartedAt, kitchenCompletedAt: next === 'lista' ? now : o.kitchenCompletedAt }
          : o
      )
    );
  };

  const handleDeliver = async (orderId: string) => {
    await supabase.from('orders').update({
      kitchen_status: 'entregada',
      status: 'cerrada',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const columnOrders = (col: KitchenStatus) =>
    orders.filter((o) => o.kitchenStatus === col);

  const totalPending = orders.filter((o) => o.kitchenStatus === 'pendiente').length;
  const totalPrep = orders.filter((o) => o.kitchenStatus === 'preparacion').length;
  const totalReady = orders.filter((o) => o.kitchenStatus === 'lista').length;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0f1923' }}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((p) => !p)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar onMenuToggle={() => setSidebarCollapsed((p) => !p)} title="Módulo de Cocina" />

        {/* New order alert banner */}
        {newOrderAlert && (
          <div className="flex items-center gap-3 px-6 py-3 text-sm font-semibold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
            <Bell size={16} className="animate-bounce" />
            ¡Nueva orden recibida! Revisa la columna de Pendientes.
          </div>
        )}

        {/* Stats bar */}
        <div className="flex-shrink-0 px-6 py-3 border-b flex items-center gap-6" style={{ borderColor: '#1e2d3d', backgroundColor: '#0d1720' }}>
          <div className="flex items-center gap-2">
            <ChefHat size={18} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Cocina en Vivo</span>
          </div>
          <div className="flex items-center gap-4 ml-4">
            {[
              { label: 'Pendientes', value: totalPending, color: '#f59e0b' },
              { label: 'En Preparación', value: totalPrep, color: '#3b82f6' },
              { label: 'Listas', value: totalReady, color: '#22c55e' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5">
                <span className="text-lg font-bold font-mono" style={{ color: stat.color }}>{stat.value}</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{stat.label}</span>
              </div>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Realtime connection status indicator */}
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: realtimeStatus === 'conectado' ? '#22c55e' : realtimeStatus === 'reconectando' ? '#f59e0b' : '#ef4444',
                }}
              />
              <span
                className="text-xs"
                style={{ color: realtimeStatus === 'conectado' ? '#4ade80' : realtimeStatus === 'reconectando' ? '#fbbf24' : '#f87171' }}
              >
                {realtimeStatus === 'conectado' ? 'En vivo' : realtimeStatus === 'reconectando' ? 'Reconectando...' : 'Sin conexión'}
              </span>
            </div>
            <button
              onClick={fetchOrders}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-hidden p-5">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 h-full">
              {COLUMNS.map((col) => {
                const cfg = STATUS_CONFIG[col];
                const colOrders = columnOrders(col);
                const colIcons: Record<KitchenStatus, React.ElementType> = {
                  pendiente: Bell,
                  preparacion: Flame,
                  lista: CheckCircle,
                  entregada: Coffee,
                };
                const ColIcon = colIcons[col];

                return (
                  <div key={col} className="flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: '#0d1720', border: `1px solid ${cfg.border}` }}>
                    {/* Column header */}
                    <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ backgroundColor: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
                      <div className="flex items-center gap-2">
                        <ColIcon size={15} style={{ color: cfg.color }} />
                        <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {colOrders.length}
                      </span>
                    </div>

                    {/* Orders list */}
                    <div className="flex-1 overflow-y-auto p-3">
                      {colOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-40">
                          <UtensilsCrossed size={24} style={{ color: 'rgba(255,255,255,0.3)' }} />
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Sin órdenes</p>
                        </div>
                      ) : (
                        colOrders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            onAdvance={handleAdvance}
                            onDeliver={handleDeliver}
                            tick={tick}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
