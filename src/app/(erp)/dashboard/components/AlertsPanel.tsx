'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Package, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface AlertItem {
  id: string;
  type: 'stock' | 'order';
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  time: string;
}

const severityConfig = {
  high: { bg: '#fef2f2', border: '#fca5a5', dot: '#ef4444', label: 'Urgente' },
  medium: { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'Atención' },
  low: { bg: '#eff6ff', border: '#93c5fd', dot: '#3b82f6', label: 'Info' },
};

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return 'ahora mismo';
  if (diff < 60) return `hace ${diff} min`;
  const hrs = Math.floor(diff / 60);
  return `hace ${hrs} h`;
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const newAlerts: AlertItem[] = [];

    // 1. Inventory alerts: stock < min_stock
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('id, name, stock, min_stock, unit, updated_at')
      .filter('min_stock', 'gt', 0);

    if (ingredients) {
      ingredients
        .filter((i) => Number(i.stock) < Number(i.min_stock))
        .forEach((i) => {
          const pct = Number(i.min_stock) > 0 ? (Number(i.stock) / Number(i.min_stock)) * 100 : 0;
          newAlerts.push({
            id: `stock-${i.id}`,
            type: 'stock',
            severity: pct < 30 ? 'high' : 'medium',
            title: `${i.name} bajo mínimo`,
            detail: `Stock: ${Number(i.stock).toFixed(1)} ${i.unit} — Mínimo: ${Number(i.min_stock).toFixed(1)} ${i.unit}`,
            time: timeAgo(i.updated_at || new Date().toISOString()),
          });
        });
    }

    // 2. Order alerts: open orders older than 30 min
    const { data: openOrders } = await supabase
      .from('orders')
      .select('id, mesa, created_at, status')
      .in('status', ['abierta', 'preparacion', 'lista'])
      .order('created_at', { ascending: true })
      .limit(5);

    if (openOrders) {
      openOrders.forEach((o) => {
        const diffMin = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
        if (diffMin >= 30) {
          newAlerts.push({
            id: `order-${o.id}`,
            type: 'order',
            severity: diffMin >= 60 ? 'high' : 'medium',
            title: `${o.mesa} — espera ${diffMin} min`,
            detail: `Orden ${o.id} · Estado: ${o.status}`,
            time: timeAgo(o.created_at),
          });
        }
      });
    }

    // Sort: high first
    newAlerts.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    });

    setAlerts(newAlerts);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  return (
    <div
      className="bg-white rounded-xl border h-full flex flex-col"
      style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: '#f3f4f6' }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>
            Alertas Activas
          </h2>
          {!loading && (
            <span
              className="text-xs font-700 px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: alerts.length > 0 ? '#fee2e2' : '#dcfce7',
                color: alerts.length > 0 ? '#991b1b' : '#166534',
                fontWeight: 700,
              }}
            >
              {alerts.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchAlerts}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Actualizar alertas"
        >
          <RefreshCw size={13} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y" style={{}}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3.5 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            </div>
          ))
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#f0fdf4' }}>
              <AlertTriangle size={18} className="text-green-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Sin alertas activas</p>
            <p className="text-xs text-gray-400 mt-1">Todo está funcionando correctamente</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const cfg = severityConfig[alert.severity];
            const IconComp = alert.type === 'stock' ? Package : Clock;
            return (
              <div
                key={alert.id}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
                >
                  <IconComp size={14} style={{ color: cfg.dot }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-600 text-gray-800 truncate" style={{ fontWeight: 600 }}>
                      {alert.title}
                    </p>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cfg.bg, color: cfg.dot, fontWeight: 600 }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{alert.detail}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{alert.time}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
              </div>
            );
          })
        )}
      </div>

      <div className="px-5 py-3 border-t" style={{ borderColor: '#f3f4f6' }}>
        <Link href="/inventario">
          <button className="w-full text-xs font-600 py-2 rounded-lg transition-colors hover:bg-amber-50"
            style={{ color: '#d97706', fontWeight: 600 }}>
            Ver inventario completo →
          </button>
        </Link>
      </div>
    </div>
  );
}