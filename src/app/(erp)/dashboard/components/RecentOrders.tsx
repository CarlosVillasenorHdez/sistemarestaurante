'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink, Eye, Clock, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface OrderRow {
  id: string;
  mesa: string;
  mesero: string;
  items: number;
  total: number;
  status: string;
  opened: string;
  duration: string;
  payMethod: string | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  abierta: { label: 'Abierta', className: 'badge-abierta' },
  preparacion: { label: 'En Prep.', className: 'badge-preparacion' },
  lista: { label: 'Lista', className: 'badge-espera' },
  cerrada: { label: 'Cerrada', className: 'badge-cerrada' },
  cancelada: { label: 'Cancelada', className: 'badge-cancelada' },
};

function RowSkeleton() {
  return (
    <tr className="border-b animate-pulse" style={{ borderColor: '#f9fafb' }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <div className="h-4 rounded bg-gray-100" style={{ width: i === 0 ? '80px' : '60px' }} />
        </td>
      ))}
    </tr>
  );
}

export default function RecentOrders() {
  const [filter, setFilter] = useState<'todas' | 'abierta' | 'cerrada'>('todas');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, mesa, mesero, status, total, opened_at, closed_at, duration_min, pay_method, order_items(qty)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setOrders(
        data.map((o) => {
          const itemCount = (o.order_items as { qty: number }[]).reduce(
            (sum: number, item: { qty: number }) => sum + (item.qty || 1),
            0
          );
          return {
            id: o.id,
            mesa: o.mesa,
            mesero: o.mesero || '—',
            items: itemCount,
            total: Number(o.total),
            status: o.status,
            opened: o.opened_at || '—',
            duration: o.duration_min ? `${o.duration_min} min` : o.status === 'cerrada' ? '—' : 'En curso',
            payMethod: o.pay_method || null,
          };
        })
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();

    // Real-time subscription: refresh orders table whenever orders or order_items change
    const channel = supabase
      .channel('dashboard-recent-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchOrders(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => { fetchOrders(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const filtered =
    filter === 'todas'
      ? orders
      : orders.filter(
          (o) =>
            o.status === filter ||
            (filter === 'abierta' && (o.status === 'preparacion' || o.status === 'lista'))
        );

  return (
    <div
      className="bg-white rounded-xl border"
      style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: '#f3f4f6' }}
      >
        <div>
          <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>
            Órdenes Recientes
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Últimas 10 transacciones</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['todas', 'abierta', 'cerrada'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-md text-xs font-600 transition-all duration-150 capitalize"
                style={{
                  fontWeight: 600,
                  backgroundColor: filter === f ? 'white' : 'transparent',
                  color: filter === f ? '#1B3A6B' : '#6b7280',
                  boxShadow: filter === f ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {f === 'todas' ? 'Todas' : f === 'abierta' ? 'Abiertas' : 'Cerradas'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchOrders}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={13} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/orders-management">
            <button className="btn-secondary text-xs py-1.5 flex items-center gap-1.5">
              <ExternalLink size={13} />
              Ver todas
            </button>
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              {['Orden', 'Mesa', 'Mesero', 'Platillos', 'Total', 'Abierta', 'Duración', 'Pago', 'Estado', ''].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-xs font-600 uppercase tracking-wide"
                  style={{ color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center">
                  <p className="text-sm text-gray-400">No hay órdenes registradas aún.</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Las órdenes aparecerán aquí cuando se creen desde el Punto de Venta.
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((order) => {
                const sc = statusConfig[order.status] ?? { label: order.status, className: '' };
                return (
                  <tr
                    key={order.id}
                    className="table-row-hover border-b"
                    style={{ borderColor: '#f9fafb' }}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-sm font-600 text-gray-800" style={{ fontWeight: 600 }}>
                        {order.id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-500 text-gray-700" style={{ fontWeight: 500 }}>
                        {order.mesa}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-600">{order.mesero}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-600 font-mono">{order.items}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-700 text-sm text-gray-900" style={{ fontWeight: 700 }}>
                        ${order.total.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock size={12} />
                        {order.opened}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-500 font-mono">{order.duration}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {order.payMethod ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-600 capitalize"
                          style={{
                            backgroundColor: order.payMethod === 'tarjeta' ? '#eff6ff' : '#f0fdf4',
                            color: order.payMethod === 'tarjeta' ? '#1d4ed8' : '#166534',
                            fontWeight: 600,
                          }}
                        >
                          {order.payMethod}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`status-badge ${sc.className}`}>{sc.label}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href="/orders-management">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                          <Eye size={14} className="text-gray-400" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: '#f3f4f6' }}>
          <p className="text-xs text-gray-400">
            Mostrando {filtered.length} de {orders.length} órdenes recientes
          </p>
          <Link href="/orders-management">
            <button className="text-xs font-600 py-1.5 px-3 rounded-lg hover:bg-blue-50 transition-colors"
              style={{ color: '#1B3A6B', fontWeight: 600 }}>
              Ver gestión completa →
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}