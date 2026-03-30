'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface HourlyPoint {
  hora: string;
  ventas: number;
  ordenes: number;
}

interface WeeklyPoint {
  dia: string;
  ventas: number;
}

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="bg-white rounded-xl shadow-lg border p-3 text-sm"
        style={{ borderColor: '#e5e7eb', minWidth: '140px' }}
      >
        <p className="font-600 text-gray-700 mb-2" style={{ fontWeight: 600 }}>{label}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500 text-xs">Ventas</span>
          <span className="font-mono font-600 text-amber-600" style={{ fontWeight: 600 }}>
            ${payload[0].value.toLocaleString('es-MX')}
          </span>
        </div>
        {payload[1] && (
          <div className="flex items-center justify-between gap-4 mt-1">
            <span className="text-gray-500 text-xs">Órdenes</span>
            <span className="font-mono font-600 text-blue-600" style={{ fontWeight: 600 }}>
              {payload[1].value}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function SalesChart() {
  const [view, setView] = useState<'hoy' | 'semana'>('hoy');
  const [hourlyData, setHourlyData] = useState<HourlyPoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [peakHour, setPeakHour] = useState<{ hora: string; ventas: number } | null>(null);
  const [totalAccum, setTotalAccum] = useState(0);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Today's closed orders — use America/Mexico_City for day boundaries
      const nowMX = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
      const todayStart = new Date(nowMX);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(nowMX);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('total, created_at, closed_at')
        .eq('status', 'cerrada')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (todayError) throw todayError;

      // Build hourly buckets (08:00 – 23:00)
      const hourBuckets: Record<string, { ventas: number; ordenes: number }> = {};
      for (let h = 8; h <= 23; h++) {
        const label = `${String(h).padStart(2, '0')}:00`;
        hourBuckets[label] = { ventas: 0, ordenes: 0 };
      }

      (todayOrders || []).forEach((o) => {
        // Use closed_at if available, otherwise created_at
        const dateStr = o.closed_at || o.created_at;
        let h: number;
        // closed_at may be stored as "HH:MM" string or full ISO
        if (dateStr && dateStr.includes('T')) {
          h = new Date(dateStr).getHours();
        } else if (dateStr && dateStr.includes(':')) {
          h = parseInt(dateStr.split(':')[0], 10);
        } else {
          h = new Date(o.created_at).getHours();
        }
        if (h >= 8 && h <= 23) {
          const label = `${String(h).padStart(2, '0')}:00`;
          hourBuckets[label].ventas += Number(o.total);
          hourBuckets[label].ordenes += 1;
        }
      });

      const hourly: HourlyPoint[] = Object.entries(hourBuckets).map(([hora, v]) => ({
        hora,
        ventas: Math.round(v.ventas),
        ordenes: v.ordenes,
      }));
      setHourlyData(hourly);

      const peak = hourly.reduce((max, p) => (p.ventas > max.ventas ? p : max), hourly[0]);
      setPeakHour(peak);
      setTotalAccum(hourly.reduce((sum, p) => sum + p.ventas, 0));

      // Weekly: last 7 days
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const { data: weekOrders, error: weekError } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('status', 'cerrada')
        .gte('created_at', weekStart.toISOString());

      if (weekError) throw weekError;

      const dayBuckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dayBuckets[DAYS_ES[d.getDay()]] = 0;
      }

      (weekOrders || []).forEach((o) => {
        const d = new Date(o.created_at);
        const label = DAYS_ES[d.getDay()];
        if (label in dayBuckets) {
          dayBuckets[label] += Number(o.total);
        }
      });

      setWeeklyData(
        Object.entries(dayBuckets).map(([dia, ventas]) => ({ dia, ventas: Math.round(ventas) }))
      );
    } catch (err: any) {
      console.error('SalesChart fetch error:', err);
      toast.error('Error al cargar gráfica de ventas. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Real-time subscription: refresh chart whenever orders change
    const channel = supabase
      .channel('dashboard-sales-chart-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const data = view === 'hoy' ? hourlyData : weeklyData;
  const xKey = view === 'hoy' ? 'hora' : 'dia';

  // Dynamic date — computed only on the client to avoid SSR/client mismatch
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
  }, []);

  return (
    <div
      className="bg-white rounded-xl border p-5"
      style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>
            Ventas por {view === 'hoy' ? 'Hora' : 'Día'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {view === 'hoy' ? today : 'Últimos 7 días'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={13} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['hoy', 'semana'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-md text-xs font-600 transition-all duration-150"
                style={{
                  fontWeight: 600,
                  backgroundColor: view === v ? 'white' : 'transparent',
                  color: view === v ? '#1B3A6B' : '#6b7280',
                  boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {v === 'hoy' ? 'Hoy' : 'Semana'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[260px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={20} className="text-gray-300 animate-spin" />
            <p className="text-xs text-gray-400">Cargando datos de ventas…</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="ventas"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fill="url(#ventasGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#f59e0b', stroke: 'white', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Summary row */}
      <div
        className="flex items-center gap-6 mt-4 pt-4 border-t text-sm"
        style={{ borderColor: '#f3f4f6' }}
      >
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Hora pico</p>
          <p className="font-600 text-gray-800 font-mono text-base" style={{ fontWeight: 600 }}>
            {peakHour && peakHour.ventas > 0 ? `${peakHour.hora} · $${peakHour.ventas.toLocaleString('es-MX')}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Total acumulado</p>
          <p className="font-600 text-gray-800 font-mono" style={{ fontWeight: 600 }}>
            ${totalAccum.toLocaleString('es-MX')}
          </p>
        </div>
        <div className="ml-auto">
          <p className="text-xs text-gray-400 mb-0.5">{view === 'hoy' ? 'Hoy' : 'Esta semana'}</p>
          <p className="font-700 text-amber-600 font-mono text-base" style={{ fontWeight: 700 }}>
            ${totalAccum.toLocaleString('es-MX')}
          </p>
        </div>
      </div>
    </div>
  );
}