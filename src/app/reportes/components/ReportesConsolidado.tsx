'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell,
} from 'recharts';
import {
  Building2, Calendar, TrendingUp, TrendingDown, DollarSign,
  ShoppingBag, Users, ShoppingCart, Download, RefreshCw, Award,
  ArrowUpRight, ArrowDownRight, Minus, ChevronDown, Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────────────

type DateRange = 'hoy' | 'semana' | 'mes' | 'personalizado';

interface Branch {
  id: string;
  name: string;
}

interface BranchMetrics {
  branchId: string;
  branchName: string;
  ventas: number;
  ordenes: number;
  ticket: number;
  topDish: string;
  topDishCount: number;
  hourlyData: { hora: string; ventas: number; ordenes: number }[];
  dailyData: { dia: string; ventas: number }[];
  dishData: { nombre: string; cantidad: number }[];
}

// ─── Color Palette for branches ─────────────────────────────────────────────

const BRANCH_COLORS = [
  '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
];

const getBranchColor = (idx: number) => BRANCH_COLORS[idx % BRANCH_COLORS.length];

// ─── Utility ─────────────────────────────────────────────────────────────────

function getDateBounds(dateRange: DateRange, customStart: string, customEnd: string) {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (dateRange === 'hoy') {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (dateRange === 'semana') {
    start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (dateRange === 'mes') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else {
    start = customStart ? new Date(customStart + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
    end = customEnd ? new Date(customEnd + 'T23:59:59') : end;
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

function fmtMoney(n: number) {
  return `$${fmt(n)}`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, bg, delta, loading,
}: {
  label: string; value: string; sub?: string; icon: any;
  color: string; bg: string; delta?: number; loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-28 rounded-md animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
      ) : (
        <p className="text-xl font-bold text-gray-900">{value}</p>
      )}
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {delta !== undefined && !loading && (
        <div className="flex items-center gap-1 mt-1">
          {delta > 0 ? (
            <ArrowUpRight size={12} style={{ color: '#10b981' }} />
          ) : delta < 0 ? (
            <ArrowDownRight size={12} style={{ color: '#ef4444' }} />
          ) : (
            <Minus size={12} style={{ color: '#9ca3af' }} />
          )}
          <span className="text-xs font-semibold" style={{ color: delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#9ca3af' }}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Branch Selector ─────────────────────────────────────────────────────────

function BranchSelector({
  branches, selected, onChange,
}: {
  branches: Branch[];
  selected: string[]; // [] means ALL
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === 0;
  const label = allSelected
    ? 'Todas las sucursales'
    : selected.length === 1
    ? branches.find(b => b.id === selected[0])?.name ?? '1 sucursal'
    : `${selected.length} sucursales`;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      const next = selected.filter(s => s !== id);
      onChange(next);
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium bg-white transition-all"
        style={{ borderColor: '#d1d5db', color: '#374151' }}
      >
        <Building2 size={14} style={{ color: '#1B3A6B' }} />
        <span>{label}</span>
        <ChevronDown size={14} style={{ color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div
          className="absolute top-full mt-1 left-0 z-50 bg-white rounded-xl border shadow-lg overflow-hidden"
          style={{ borderColor: '#e5e7eb', minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
        >
          <button
            onClick={() => { onChange([]); setOpen(false); }}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700">Todas las sucursales</span>
            {allSelected && <Check size={14} style={{ color: '#f59e0b' }} />}
          </button>
          <div style={{ borderTop: '1px solid #f3f4f6' }} />
          {branches.map((b, idx) => (
            <button
              key={b.id}
              onClick={() => toggle(b.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getBranchColor(idx) }} />
              <span className="flex-1 text-left text-gray-700">{b.name}</span>
              {selected.includes(b.id) && <Check size={14} style={{ color: '#f59e0b' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReportesConsolidado() {
  const supabase = createClient();

  const [dateRange, setDateRange] = useState<DateRange>('semana');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]); // [] = all
  const [metricsMap, setMetricsMap] = useState<Record<string, BranchMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // ── Load branches ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('branches')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setBranches((data || []).map((b: any) => ({ id: b.id, name: b.name })));
      });
  }, []);

  // ── Fetch metrics per branch ───────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    if (branches.length === 0) return;
    setLoading(true);

    const { start, end } = getDateBounds(dateRange, customStart, customEnd);

    // Determine which branches to load
    const branchesToLoad = selectedBranches.length > 0
      ? branches.filter(b => selectedBranches.includes(b.id))
      : branches;

    const newMap: Record<string, BranchMetrics> = {};

    await Promise.all(
      branchesToLoad.map(async (branch) => {
        // ─ Orders for this branch in range ─
        let query = supabase
          .from('orders')
          .select('id, total, created_at, closed_at, mesero')
          .eq('status', 'cerrada')
          .gte('created_at', start)
          .lte('created_at', end)
          .limit(2000);

        // Only filter by branch_id if it's not null (some orders may have null branch_id for legacy data)
        query = query.eq('branch_id', branch.id);

        const { data: orders } = await query;
        const orderList = orders || [];
        const orderIds = orderList.map(o => o.id);

        const ventas = orderList.reduce((s, o) => s + Number(o.total), 0);
        const ordenes = orderList.length;
        const ticket = ordenes > 0 ? ventas / ordenes : 0;

        // ─ Hourly data ─
        const hourBuckets: Record<string, { ventas: number; ordenes: number }> = {};
        for (let h = 8; h <= 23; h++) {
          const label = `${String(h).padStart(2, '0')}:00`;
          hourBuckets[label] = { ventas: 0, ordenes: 0 };
        }
        orderList.forEach(o => {
          const h = new Date(o.created_at).getHours();
          if (h >= 8 && h <= 23) {
            const label = `${String(h).padStart(2, '0')}:00`;
            hourBuckets[label].ventas += Number(o.total);
            hourBuckets[label].ordenes += 1;
          }
        });
        const hourlyData = Object.entries(hourBuckets).map(([hora, v]) => ({
          hora, ventas: Math.round(v.ventas), ordenes: v.ordenes,
        }));

        // ─ Daily data ─
        const dayBuckets: Record<string, number> = {};
        orderList.forEach(o => {
          const day = o.created_at.substring(0, 10);
          dayBuckets[day] = (dayBuckets[day] || 0) + Number(o.total);
        });
        const dailyData = Object.entries(dayBuckets)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([dia, ventas]) => ({
            dia: new Date(dia + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
            ventas: Math.round(ventas),
          }));

        // ─ Top dishes ─
        let topDish = '—';
        let topDishCount = 0;
        let dishData: { nombre: string; cantidad: number }[] = [];

        if (orderIds.length > 0) {
          const { data: items } = await supabase
            .from('order_items')
            .select('name, qty')
            .in('order_id', orderIds)
            .limit(3000);

          if (items) {
            const dishMap: Record<string, number> = {};
            items.forEach((i: any) => {
              dishMap[i.name] = (dishMap[i.name] || 0) + Number(i.qty);
            });
            const sorted = Object.entries(dishMap).sort(([, a], [, b]) => b - a);
            if (sorted.length > 0) {
              topDish = sorted[0][0];
              topDishCount = sorted[0][1];
            }
            dishData = sorted.slice(0, 8).map(([nombre, cantidad]) => ({ nombre, cantidad }));
          }
        }

        newMap[branch.id] = {
          branchId: branch.id,
          branchName: branch.name,
          ventas: Math.round(ventas),
          ordenes,
          ticket: Math.round(ticket * 100) / 100,
          topDish,
          topDishCount,
          hourlyData,
          dailyData,
          dishData,
        };
      })
    );

    setMetricsMap(newMap);
    setLoading(false);
  }, [branches, selectedBranches, dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // ── Derived aggregates ────────────────────────────────────────────────────
  const activeBranches = useMemo(() => {
    const ids = selectedBranches.length > 0 ? selectedBranches : branches.map(b => b.id);
    return branches
      .filter(b => ids.includes(b.id))
      .map((b, idx) => ({ ...b, color: getBranchColor(idx), metrics: metricsMap[b.id] }))
      .filter(b => b.metrics !== undefined);
  }, [branches, selectedBranches, metricsMap]);

  const totals = useMemo(() => {
    const ventas = activeBranches.reduce((s, b) => s + (b.metrics?.ventas ?? 0), 0);
    const ordenes = activeBranches.reduce((s, b) => s + (b.metrics?.ordenes ?? 0), 0);
    const ticket = ordenes > 0 ? ventas / ordenes : 0;
    return { ventas, ordenes, ticket };
  }, [activeBranches]);

  // ── Combined hourly chart (all branches overlaid) ─────────────────────────
  const combinedHourly = useMemo(() => {
    const allHours: Record<string, Record<string, number>> = {};
    activeBranches.forEach(b => {
      (b.metrics?.hourlyData ?? []).forEach(h => {
        if (!allHours[h.hora]) allHours[h.hora] = {};
        allHours[h.hora][b.name] = h.ventas;
      });
    });
    return Object.entries(allHours)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hora, vals]) => ({ hora, ...vals }));
  }, [activeBranches]);

  // ── Combined daily chart ──────────────────────────────────────────────────
  const combinedDaily = useMemo(() => {
    const allDays: Record<string, Record<string, number>> = {};
    activeBranches.forEach(b => {
      (b.metrics?.dailyData ?? []).forEach(d => {
        if (!allDays[d.dia]) allDays[d.dia] = {};
        allDays[d.dia][b.name] = d.ventas;
      });
    });
    return Object.entries(allDays)
      .map(([dia, vals]) => ({ dia, ...vals }));
  }, [activeBranches]);

  // ── Ranking ────────────────────────────────────────────────────────────────
  const ranking = useMemo(() =>
    [...activeBranches]
      .filter(b => b.metrics)
      .sort((a, b) => (b.metrics?.ventas ?? 0) - (a.metrics?.ventas ?? 0)),
    [activeBranches]
  );

  const topVentas = ranking[0]?.metrics?.ventas ?? 1;

  // ── Date range label ──────────────────────────────────────────────────────
  const dateRangeLabel = useMemo(() => {
    const now = new Date();
    if (dateRange === 'hoy') return now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (dateRange === 'semana') {
      const s = new Date(now); s.setDate(now.getDate() - 6);
      return `Semana del ${s.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} al ${now.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
    if (dateRange === 'mes') return now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return `${customStart} — ${customEnd}`;
  }, [dateRange, customStart, customEnd]);

  const handleExport = useCallback(() => {
    setExporting(true);
    setTimeout(() => { window.print(); setExporting(false); }, 300);
  }, []);

  const shortName = (name: string, max = 16) => name.length > max ? name.slice(0, max) + '…' : name;

  // ─── Tooltip genérico ──────────────────────────────────────────────────────
  const MoneyTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-xl shadow-lg border p-3 text-xs" style={{ borderColor: '#e5e7eb', minWidth: 160 }}>
        <p className="font-semibold text-gray-700 mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 mt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-gray-500">{p.name}</span>
            </span>
            <span className="font-mono font-semibold" style={{ color: p.color }}>{fmtMoney(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>

      {/* ── Header ── */}
      <div className="bg-white border-b px-6 py-4 flex flex-wrap items-center gap-3 justify-between print:hidden" style={{ borderColor: '#e5e7eb' }}>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reporte Consolidado</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dateRangeLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BranchSelector branches={branches} selected={selectedBranches} onChange={setSelectedBranches} />
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium bg-white transition-all"
            style={{ borderColor: '#d1d5db', color: '#374151' }}
          >
            <RefreshCw size={14} style={{ color: '#6b7280', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ backgroundColor: exporting ? '#d97706' : '#f59e0b', color: '#1B3A6B' }}
          >
            <Download size={16} />
            {exporting ? 'Generando…' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">

        {/* ── Date Range Filter ── */}
        <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mr-2">
            <Calendar size={16} style={{ color: '#1B3A6B' }} />
            <span className="text-sm font-semibold text-gray-700">Período:</span>
          </div>
          {(['hoy', 'semana', 'mes', 'personalizado'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => { setDateRange(r); setShowCustom(r === 'personalizado'); }}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: dateRange === r ? '#1B3A6B' : '#f3f4f6',
                color: dateRange === r ? 'white' : '#374151',
              }}
            >
              {r === 'hoy' ? 'Hoy' : r === 'semana' ? 'Esta Semana' : r === 'mes' ? 'Este Mes' : 'Personalizado'}
            </button>
          ))}
          {showCustom && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none"
                style={{ borderColor: '#d1d5db' }} />
              <span className="text-gray-400 text-sm">—</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none"
                style={{ borderColor: '#d1d5db' }} />
            </div>
          )}
        </div>

        {/* ── KPI Global Totals ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Totales Consolidados</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Ventas Totales" value={fmtMoney(totals.ventas)} icon={DollarSign} color="#f59e0b" bg="#fffbeb" loading={loading} />
            <KpiCard label="Órdenes Totales" value={fmt(totals.ordenes)} icon={ShoppingBag} color="#3b82f6" bg="#eff6ff" loading={loading} />
            <KpiCard label="Ticket Promedio" value={`$${totals.ticket.toFixed(2)}`} icon={ShoppingCart} color="#10b981" bg="#ecfdf5" loading={loading} />
            <KpiCard label="Sucursales activas" value={`${activeBranches.length}`} icon={Building2} color="#8b5cf6" bg="#f5f3ff" loading={loading} />
          </div>
        </div>

        {/* ── Ranking de Sucursales ── */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
              <Award size={16} style={{ color: '#d97706' }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Ranking de Sucursales</h2>
              <p className="text-xs text-gray-500">Comparativo de desempeño — {dateRangeLabel}</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
              ))}
            </div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Sin datos para el período seleccionado.
            </div>
          ) : (
            <div className="space-y-3">
              {ranking.map((b, idx) => {
                const m = b.metrics!;
                const pct = Math.round((m.ventas / topVentas) * 100);
                const isTop = idx === 0;
                return (
                  <div
                    key={b.id}
                    className="rounded-xl border p-4 transition-all"
                    style={{
                      borderColor: isTop ? '#fde68a' : '#e5e7eb',
                      backgroundColor: isTop ? '#fffdf5' : '#fafafa',
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank badge */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: isTop ? '#f59e0b' : b.color + '22', color: isTop ? 'white' : b.color }}
                      >
                        {isTop ? '🏆' : `#${idx + 1}`}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                          <span className="font-semibold text-gray-900 text-sm truncate">{b.name}</span>
                          {isTop && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                              Top
                            </span>
                          )}
                        </div>
                        {/* Bar */}
                        <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#f3f4f6' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: b.color }}
                          />
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-400">Órdenes</p>
                          <p className="text-sm font-bold text-gray-800 font-mono">{fmt(m.ordenes)}</p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-gray-400">Ticket</p>
                          <p className="text-sm font-bold text-gray-800 font-mono">${m.ticket.toFixed(0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Ventas</p>
                          <p className="text-base font-bold font-mono" style={{ color: b.color }}>{fmtMoney(m.ventas)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Top dish */}
                    {m.topDish !== '—' && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-gray-500" style={{ borderColor: '#f3f4f6' }}>
                        <TrendingUp size={12} style={{ color: b.color }} />
                        <span>Platillo más vendido: <strong className="text-gray-700">{m.topDish}</strong> ({m.topDishCount} uds)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Comparativo de Ventas por Sucursal (Barras) ── */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
              <TrendingUp size={16} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Comparativo de Ventas por Sucursal</h2>
              <p className="text-xs text-gray-500">Desglose de ingresos y órdenes por unidad</p>
            </div>
          </div>

          {loading ? (
            <div className="h-64 rounded-xl animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={ranking.map(b => ({
                  name: shortName(b.name, 14),
                  ventas: b.metrics?.ventas ?? 0,
                  ordenes: b.metrics?.ordenes ?? 0,
                  color: b.color,
                }))}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white rounded-xl shadow-lg border p-3 text-xs" style={{ borderColor: '#e5e7eb', minWidth: 160 }}>
                        <p className="font-semibold text-gray-700 mb-2">{label}</p>
                        <div className="flex justify-between gap-4"><span className="text-gray-500">Ventas</span><span className="font-mono font-semibold text-amber-600">{fmtMoney(payload[0]?.value ?? 0)}</span></div>
                        <div className="flex justify-between gap-4 mt-1"><span className="text-gray-500">Órdenes</span><span className="font-mono font-semibold text-blue-600">{payload[1]?.value ?? 0}</span></div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="ventas" radius={[4, 4, 0, 0]} maxBarSize={52}>
                  {ranking.map((b, idx) => (
                    <Cell key={b.id} fill={b.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Ventas por Hora — Todas las Sucursales ── */}
        {activeBranches.length > 0 && !loading && (
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ecfdf5' }}>
                <ShoppingCart size={16} style={{ color: '#10b981' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Ventas por Hora — Todas las Sucursales</h2>
                <p className="text-xs text-gray-500">Patrón de demanda por unidad durante el día</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {activeBranches.map(b => (
                <div key={b.id} className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: b.color }} />
                  <span className="text-xs text-gray-500">{b.name}</span>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={combinedHourly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip content={<MoneyTooltip />} />
                {activeBranches.map(b => (
                  <Line
                    key={b.id}
                    type="monotone"
                    dataKey={b.name}
                    stroke={b.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: b.color, stroke: 'white', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Tendencia Diaria de Ventas ── */}
        {activeBranches.length > 0 && combinedDaily.length > 1 && !loading && (
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
                <TrendingUp size={16} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Tendencia Diaria de Ventas</h2>
                <p className="text-xs text-gray-500">Evolución por sucursal en el período</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-4">
              {activeBranches.map(b => (
                <div key={b.id} className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: b.color }} />
                  <span className="text-xs text-gray-500">{b.name}</span>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={combinedDaily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip content={<MoneyTooltip />} />
                {activeBranches.map(b => (
                  <Line
                    key={b.id}
                    type="monotone"
                    dataKey={b.name}
                    stroke={b.color}
                    strokeWidth={2}
                    dot={{ r: 2, fill: b.color }}
                    activeDot={{ r: 5, fill: b.color, stroke: 'white', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Top Platillos por Sucursal ── */}
        {activeBranches.length > 0 && !loading && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Top Platillos por Sucursal</span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }} />
            </div>
            <div className={`grid gap-4 ${activeBranches.length === 1 ? 'grid-cols-1' : activeBranches.length === 2 ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3'}`}>
              {activeBranches.map(b => (
                <div key={b.id} className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                    <h3 className="text-sm font-bold text-gray-900">{b.name}</h3>
                    <span className="ml-auto text-xs text-gray-400">{fmt(b.metrics?.ordenes ?? 0)} órdenes</span>
                  </div>

                  {(b.metrics?.dishData?.length ?? 0) === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-6">Sin datos de platillos</div>
                  ) : (
                    <div className="space-y-2">
                      {(b.metrics?.dishData ?? []).map((dish, di) => {
                        const max = b.metrics?.dishData?.[0]?.cantidad ?? 1;
                        const pct = Math.round((dish.cantidad / max) * 100);
                        return (
                          <div key={di}>
                            <div className="flex items-center justify-between text-xs mb-0.5">
                              <span className="text-gray-700 truncate font-medium" style={{ maxWidth: '70%' }}>{dish.nombre}</span>
                              <span className="font-mono text-gray-500 font-semibold">{dish.cantidad} uds</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#f3f4f6' }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: di === 0 ? b.color : b.color + '88' }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Mini KPIs */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t" style={{ borderColor: '#f3f4f6' }}>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Ventas</p>
                      <p className="text-sm font-bold font-mono" style={{ color: b.color }}>{fmtMoney(b.metrics?.ventas ?? 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Órdenes</p>
                      <p className="text-sm font-bold font-mono text-gray-800">{fmt(b.metrics?.ordenes ?? 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Ticket</p>
                      <p className="text-sm font-bold font-mono text-gray-800">${(b.metrics?.ticket ?? 0).toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabla resumen homologada ── */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f8fafc' }}>
              <Users size={16} style={{ color: '#6b7280' }} />
            </div>
            <h2 className="text-base font-bold text-gray-900">Resumen Homologado</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  {['#', 'Sucursal', 'Ventas', '% del total', 'Órdenes', 'Ticket Prom.', 'Platillo Top'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [1, 2, 3].map(i => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6, 7].map(j => (
                        <td key={j} className="py-3 px-3">
                          <div className="h-4 rounded animate-pulse" style={{ backgroundColor: '#f3f4f6', width: j === 2 ? '120px' : '60px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                  : ranking.map((b, idx) => {
                    const m = b.metrics!;
                    const sharePct = totals.ventas > 0 ? ((m.ventas / totals.ventas) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={b.id} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#f3f4f6' }}>
                        <td className="py-3 px-3 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                            <span className="font-semibold text-gray-800">{b.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold" style={{ color: b.color }}>{fmtMoney(m.ventas)}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: '#f3f4f6' }}>
                              <div className="h-full rounded-full" style={{ width: `${sharePct}%`, backgroundColor: b.color }} />
                            </div>
                            <span className="text-xs font-mono text-gray-600">{sharePct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-700">{fmt(m.ordenes)}</td>
                        <td className="py-3 px-3 font-mono text-gray-700">${m.ticket.toFixed(2)}</td>
                        <td className="py-3 px-3 text-gray-600 text-xs">{m.topDish}</td>
                      </tr>
                    );
                  })}
              </tbody>
              {!loading && ranking.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid #e5e7eb', backgroundColor: '#f8fafc' }}>
                    <td colSpan={2} className="py-3 px-3 text-sm font-bold text-gray-700 uppercase tracking-wide">TOTAL</td>
                    <td className="py-3 px-3 font-mono font-bold text-gray-900">{fmtMoney(totals.ventas)}</td>
                    <td className="py-3 px-3 text-xs font-mono text-gray-500">100%</td>
                    <td className="py-3 px-3 font-mono font-bold text-gray-900">{fmt(totals.ordenes)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-gray-900">${totals.ticket.toFixed(2)}</td>
                    <td className="py-3 px-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>{/* closes px-6 py-5 */}

      {/* Print styles */}
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          aside { display: none !important; }
          header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
