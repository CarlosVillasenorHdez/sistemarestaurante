'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clock, UtensilsCrossed, AlertTriangle, CheckCircle, Flame } from 'lucide-react';
import Link from 'next/link';

interface LiveOrder {
  id: string;
  mesa: string;
  mesero: string;
  kitchenStatus: string;
  createdAt: string;
  elapsedMin: number;
}

function calcElapsed(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

export default function LiveOperations() {
  const supabase = createClient();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const fetchLive = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, mesa, mesero, kitchen_status, created_at')
      .in('status', ['abierta', 'preparacion', 'lista'])
      .neq('kitchen_status', 'en_edicion')
      .order('created_at', { ascending: true });

    setOrders((data || []).map((o: any) => ({
      id: o.id,
      mesa: o.mesa,
      mesero: o.mesero,
      kitchenStatus: o.kitchen_status ?? 'pendiente',
      createdAt: o.created_at,
      elapsedMin: calcElapsed(o.created_at),
    })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchLive(); }, [fetchLive]);

  // Update elapsed every 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('live-ops-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchLive())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchLive]);

  const urgent = orders.filter(o => calcElapsed(o.createdAt) >= 20 && o.kitchenStatus !== 'lista').length;
  const ready  = orders.filter(o => o.kitchenStatus === 'lista').length;
  const inPrep = orders.filter(o => o.kitchenStatus === 'preparacion').length;
  const avgMin = orders.length
    ? Math.round(orders.reduce((s, o) => s + calcElapsed(o.createdAt), 0) / orders.length)
    : 0;

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    pendiente:   { label: 'Pendiente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    preparacion: { label: 'Preparando',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    lista:       { label: 'Lista ✓',     color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
  };

  if (loading) return null;
  if (orders.length === 0) return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <UtensilsCrossed size={16} style={{ color: '#1B3A6B' }} />
        <span className="text-sm font-semibold text-gray-700">En curso ahora</span>
      </div>
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
        <CheckCircle size={28} />
        <p className="text-sm">Sin órdenes activas — todo tranquilo</p>
      </div>
    </div>
  );

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed size={16} style={{ color: '#1B3A6B' }} />
          <span className="text-sm font-semibold text-gray-700">En curso ahora</span>
        </div>
        <Link href="/cocina">
          <span className="text-xs text-blue-500 hover:underline cursor-pointer">Ver cocina →</span>
        </Link>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ backgroundColor: 'rgba(27,58,107,0.08)', color: '#1B3A6B' }}>
          <UtensilsCrossed size={11} /> {orders.length} órdenes
        </span>
        {inPrep > 0 && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#1d4ed8' }}>
            <Flame size={11} /> {inPrep} preparando
          </span>
        )}
        {ready > 0 && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#15803d' }}>
            <CheckCircle size={11} /> {ready} lista{ready > 1 ? 's' : ''}
          </span>
        )}
        {urgent > 0 && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
            <AlertTriangle size={11} /> {urgent} urgente{urgent > 1 ? 's' : ''}
          </span>
        )}
        {orders.length > 0 && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ backgroundColor: 'rgba(107,114,128,0.08)', color: '#4b5563' }}>
            <Clock size={11} /> prom. {avgMin} min
          </span>
        )}
      </div>

      {/* Order rows */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {orders.map((order) => {
          const elapsed = calcElapsed(order.createdAt);
          const isUrgent = elapsed >= 20 && order.kitchenStatus !== 'lista';
          const cfg = statusCfg[order.kitchenStatus] || statusCfg['pendiente'];
          return (
            <div key={order.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{
                backgroundColor: isUrgent ? 'rgba(239,68,68,0.05)' : '#f9fafb',
                border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.2)' : '#f3f4f6'}`,
              }}>
              <span className="text-sm font-bold text-gray-800 w-16 truncate">{order.mesa}</span>
              <span className="flex-1 text-xs text-gray-500 truncate">{order.mesero}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
              <span className="flex items-center gap-1 text-xs font-mono font-semibold"
                style={{ color: isUrgent ? '#dc2626' : '#6b7280', minWidth: '40px', justifyContent: 'flex-end' }}>
                {isUrgent && <AlertTriangle size={10} />}
                {elapsed}m
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}