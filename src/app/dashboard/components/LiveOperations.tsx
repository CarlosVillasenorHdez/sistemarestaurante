'use client';

import React, { useEffect, useState } from 'react';
import { Activity, UtensilsCrossed, Clock, CheckCircle2, ChefHat } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LiveOrder {
  id: string;
  mesa: string;
  status: 'abierta' | 'preparacion' | 'lista';
  total: number;
  created_at: string;
}

const statusConfig = {
  abierta: { label: 'Abierta', bg: '#eff6ff', color: '#2563eb', icon: UtensilsCrossed },
  preparacion: { label: 'En cocina', bg: '#fffbeb', color: '#d97706', icon: ChefHat },
  lista: { label: 'Lista', bg: '#f0fdf4', color: '#16a34a', icon: CheckCircle2 },
};

function minutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export default function LiveOperations() {
  const supabase = createClient();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('id, mesa, status, total, created_at')
      .in('status', ['abierta', 'preparacion', 'lista'])
      .order('created_at', { ascending: true })
      .limit(8);
    setOrders((data as LiveOrder[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('live-operations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const counts = {
    abierta: orders.filter((o) => o.status === 'abierta').length,
    preparacion: orders.filter((o) => o.status === 'preparacion').length,
    lista: orders.filter((o) => o.status === 'lista').length,
  };

  return (
    <div
      className="bg-white rounded-xl border"
      style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: '#f3f4f6' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <Activity size={16} className="text-gray-500" />
          <h2 className="text-base text-gray-900" style={{ fontWeight: 700 }}>
            Operaciones en Vivo
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {(['abierta', 'preparacion', 'lista'] as const).map((s) => {
            const cfg = statusConfig[s];
            return (
              <span
                key={s}
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ backgroundColor: cfg.bg, color: cfg.color, fontWeight: 600 }}
              >
                {counts[s]} {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Orders list */}
      <div className="px-5 py-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: '#f0fdf4' }}
            >
              <CheckCircle2 size={18} className="text-green-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Sin órdenes activas</p>
            <p className="text-xs text-gray-400 mt-1">No hay órdenes abiertas en este momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {orders.map((order) => {
              const cfg = statusConfig[order.status];
              const StatusIcon = cfg.icon;
              const mins = minutesAgo(order.created_at);
              const isLate = mins >= 30;
              return (
                <div
                  key={order.id}
                  className="rounded-xl p-3 border flex flex-col gap-1.5"
                  style={{
                    backgroundColor: isLate ? '#fef2f2' : cfg.bg,
                    borderColor: isLate ? '#fca5a5' : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <StatusIcon size={14} style={{ color: isLate ? '#dc2626' : cfg.color }} />
                    {isLate && (
                      <span className="text-xs" style={{ color: '#dc2626', fontWeight: 700 }}>!</span>
                    )}
                  </div>
                  <p className="text-sm truncate" style={{ color: '#111827', fontWeight: 700 }}>
                    {order.mesa}
                  </p>
                  <p className="text-xs" style={{ color: isLate ? '#dc2626' : cfg.color, fontWeight: 600 }}>
                    {cfg.label}
                  </p>
                  <div className="flex items-center gap-1 mt-auto">
                    <Clock size={10} style={{ color: isLate ? '#dc2626' : '#9ca3af' }} />
                    <span className="text-xs" style={{ color: isLate ? '#dc2626' : '#9ca3af' }}>
                      {mins} min
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
