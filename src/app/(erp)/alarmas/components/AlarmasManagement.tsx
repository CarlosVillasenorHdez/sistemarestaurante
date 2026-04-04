'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  Package,
  Clock,
  Receipt,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Filter,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertSeverity = 'alta' | 'media' | 'baja';
type AlertCategory = 'inventario' | 'ordenes' | 'gastos' | 'sistema';

interface Alerta {
  id: string;
  categoria: AlertCategory;
  severidad: AlertSeverity;
  titulo: string;
  detalle: string;
  tiempo: string;
  accion?: { label: string; href: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return 'ahora mismo';
  if (diff < 60) return `hace ${diff} min`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} día${days > 1 ? 's' : ''}`;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const severityConfig: Record<
  AlertSeverity,
  { bg: string; border: string; dot: string; label: string; badgeBg: string; badgeText: string }
> = {
  alta: {
    bg: '#fef2f2',
    border: '#fca5a5',
    dot: '#ef4444',
    label: 'Alta',
    badgeBg: '#fee2e2',
    badgeText: '#991b1b',
  },
  media: {
    bg: '#fffbeb',
    border: '#fde68a',
    dot: '#f59e0b',
    label: 'Media',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
  },
  baja: {
    bg: '#eff6ff',
    border: '#93c5fd',
    dot: '#3b82f6',
    label: 'Baja',
    badgeBg: '#dbeafe',
    badgeText: '#1e40af',
  },
};

const categoryConfig: Record<
  AlertCategory,
  { label: string; icon: React.ElementType; color: string }
> = {
  inventario: { label: 'Inventario', icon: Package, color: '#8b5cf6' },
  ordenes: { label: 'Órdenes', icon: Clock, color: '#f59e0b' },
  gastos: { label: 'Gastos', icon: Receipt, color: '#ef4444' },
  sistema: { label: 'Sistema', icon: AlertTriangle, color: '#6b7280' },
};

const FILTER_TABS: { key: AlertCategory | 'todas'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'ordenes', label: 'Órdenes' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'sistema', label: 'Sistema' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AlarmasManagement() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<AlertCategory | 'todas'>('todas');
  const [soloAltas, setSoloAltas] = useState(false);
  const supabase = createClient();

  const fetchAlertas = useCallback(async () => {
    setLoading(true);
    const nuevas: Alerta[] = [];
    try {
      // ── 1. Inventario: stock bajo mínimo ──────────────────────────────────────
      const { data: ingredientes } = await supabase
        .from('ingredients')
        .select('id, name, stock, min_stock, unit, updated_at')
        .filter('min_stock', 'gt', 0);

      if (ingredientes) {
        ingredientes
          .filter((i) => Number(i.stock) < Number(i.min_stock))
          .forEach((i) => {
            const pct = Number(i.min_stock) > 0 ? (Number(i.stock) / Number(i.min_stock)) * 100 : 0;
            nuevas.push({
              id: `stock-${i.id}`,
              categoria: 'inventario',
              severidad: pct < 30 ? 'alta' : 'media',
              titulo: `${i.name} — stock bajo mínimo`,
              detalle: `Stock actual: ${Number(i.stock).toFixed(1)} ${i.unit} · Mínimo requerido: ${Number(i.min_stock).toFixed(1)} ${i.unit} (${pct.toFixed(0)}%)`,
              tiempo: timeAgo(i.updated_at || new Date().toISOString()),
              accion: { label: 'Ir a Inventario', href: '/inventario' },
            });
          });
      }

      // ── 2. Órdenes abiertas con espera larga ──────────────────────────────────
      const { data: ordenes } = await supabase
        .from('orders')
        .select('id, mesa, created_at, status')
        .in('status', ['abierta', 'preparacion', 'lista'])
        .order('created_at', { ascending: true })
        .limit(20);

      if (ordenes) {
        ordenes.forEach((o) => {
          const diffMin = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
          if (diffMin >= 30) {
            nuevas.push({
              id: `orden-${o.id}`,
              categoria: 'ordenes',
              severidad: diffMin >= 60 ? 'alta' : 'media',
              titulo: `${o.mesa || `Orden #${o.id}`} — espera prolongada`,
              detalle: `Lleva ${diffMin} minutos en estado "${o.status}". Orden ID: ${o.id}`,
              tiempo: timeAgo(o.created_at),
              accion: { label: 'Ver Órdenes', href: '/orders-management' },
            });
          }
        });
      }

      // ── 3. Gastos pendientes de pago ──────────────────────────────────────────
      const { data: gastos } = await supabase
        .from('gastos_recurrentes')
        .select('id, nombre, monto, proximo_pago, estado, categoria')
        .eq('estado', 'pendiente')
        .eq('activo', true)
        .order('proximo_pago', { ascending: true })
        .limit(20);

      if (gastos) {
        const hoy = new Date();
        gastos.forEach((g) => {
          if (!g.proximo_pago) return;
          const fechaPago = new Date(g.proximo_pago);
          const diffDias = Math.floor((fechaPago.getTime() - hoy.getTime()) / 86400000);
          if (diffDias <= 7) {
            nuevas.push({
              id: `gasto-${g.id}`,
              categoria: 'gastos',
              severidad: diffDias <= 0 ? 'alta' : diffDias <= 3 ? 'media' : 'baja',
              titulo: `${g.nombre} — pago pendiente`,
              detalle:
                diffDias <= 0
                  ? `Vencido hace ${Math.abs(diffDias)} día${Math.abs(diffDias) !== 1 ? 's' : ''} · $${Number(g.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                  : `Vence en ${diffDias} día${diffDias !== 1 ? 's' : ''} · $${Number(g.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
              tiempo: diffDias <= 0 ? 'Vencido' : `En ${diffDias} día${diffDias !== 1 ? 's' : ''}`,
              accion: { label: 'Ir a Gastos', href: '/gastos' },
            });
          }
        });
      }

      // ── Ordenar: alta → media → baja ─────────────────────────────────────────
      const orden: Record<AlertSeverity, number> = { alta: 0, media: 1, baja: 2 };
      nuevas.sort((a, b) => orden[a.severidad] - orden[b.severidad]);

      setAlertas(nuevas);
    } catch (err: unknown) {
      console.error('[Alarmas] Error al cargar alertas:', (err as Error)?.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAlertas();
    const interval = setInterval(fetchAlertas, 60000);
    return () => clearInterval(interval);
  }, [fetchAlertas]);

  const alertasFiltradas = alertas.filter((a) => {
    if (soloAltas && a.severidad !== 'alta') return false;
    if (filtro !== 'todas' && a.categoria !== filtro) return false;
    return true;
  });

  const conteosPorCategoria: Record<AlertCategory, number> = {
    inventario: alertas.filter((a) => a.categoria === 'inventario').length,
    ordenes: alertas.filter((a) => a.categoria === 'ordenes').length,
    gastos: alertas.filter((a) => a.categoria === 'gastos').length,
    sistema: alertas.filter((a) => a.categoria === 'sistema').length,
  };

  const altasCount = alertas.filter((a) => a.severidad === 'alta').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#fef3c7' }}
            >
              <Bell size={20} style={{ color: '#d97706' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Centro de Alarmas</h1>
              <p className="text-sm text-gray-500">Alertas y notificaciones del sistema</p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchAlertas}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-gray-50"
          style={{ borderColor: '#e5e7eb', color: '#374151' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(Object.keys(categoryConfig) as AlertCategory[]).map((cat) => {
          const cfg = categoryConfig[cat];
          const CatIcon = cfg.icon;
          const count = conteosPorCategoria[cat];
          return (
            <button
              key={cat}
              onClick={() => setFiltro(filtro === cat ? 'todas' : cat)}
              className="bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md"
              style={{
                borderColor: filtro === cat ? cfg.color : '#e5e7eb',
                boxShadow:
                  filtro === cat ? `0 0 0 2px ${cfg.color}30` : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${cfg.color}15` }}
                >
                  <CatIcon size={16} style={{ color: cfg.color }} />
                </div>
                {count > 0 && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                  >
                    {count}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div
        className="bg-white rounded-xl border mb-4 p-4"
        style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            {FILTER_TABS.map((tab) => {
              const count =
                tab.key === 'todas'
                  ? alertas.length
                  : conteosPorCategoria[tab.key as AlertCategory];
              const isActive = filtro === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFiltro(tab.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? '#1B3A6B' : '#f3f4f6',
                    color: isActive ? '#fff' : '#374151',
                  }}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                        color: isActive ? '#fff' : '#6b7280',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="ml-auto">
            <button
              onClick={() => setSoloAltas(!soloAltas)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: soloAltas ? '#fee2e2' : '#f3f4f6',
                color: soloAltas ? '#991b1b' : '#374151',
                border: soloAltas ? '1px solid #fca5a5' : '1px solid transparent',
              }}
            >
              <Filter size={13} />
              Solo urgentes {altasCount > 0 && `(${altasCount})`}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div
        className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : alertasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#f0fdf4' }}
            >
              <CheckCircle size={24} className="text-green-500" />
            </div>
            <p className="text-base font-semibold text-gray-700">Sin alertas activas</p>
            <p className="text-sm text-gray-400 mt-1">
              {filtro !== 'todas' || soloAltas ?'No hay alertas con los filtros seleccionados' :'Todo el sistema está funcionando correctamente'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            {alertasFiltradas.map((alerta) => {
              const sev = severityConfig[alerta.severidad];
              const cat = categoryConfig[alerta.categoria];
              const CatIcon = cat.icon;
              return (
                <div
                  key={alerta.id}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}
                  >
                    <CatIcon size={16} style={{ color: sev.dot }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800">{alerta.titulo}</p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                        style={{ backgroundColor: sev.badgeBg, color: sev.badgeText }}
                      >
                        {sev.label}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                      >
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{alerta.detalle}</p>
                    <p className="text-xs text-gray-400">{alerta.tiempo}</p>
                  </div>

                  {/* Action */}
                  {alerta.accion && (
                    <Link href={alerta.accion.href} className="flex-shrink-0">
                      <button
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
                        style={{ color: '#1B3A6B' }}
                      >
                        {alerta.accion.label}
                        <ChevronRight size={12} />
                      </button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer summary */}
      {!loading && alertasFiltradas.length > 0 && (
        <p className="text-xs text-gray-400 text-center mt-4">
          Mostrando {alertasFiltradas.length} alerta
          {alertasFiltradas.length !== 1 ? 's' : ''} · Actualización automática cada 60 segundos
        </p>
      )}
    </div>
  );
}