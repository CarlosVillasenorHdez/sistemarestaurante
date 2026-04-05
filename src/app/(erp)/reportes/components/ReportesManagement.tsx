'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useReportData, DateRange, DishSales, StaffPerformance, PeakPrediction } from '@/hooks/useReportData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from 'recharts';
import { Calendar, Download, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Clock, ShoppingCart, Award, ChefHat, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import WasteAnalysisSummary from './WasteAnalysisSummary';

// Inline icon since Trash2Icon may not exist in this lucide version
const Trash2Icon = ({ size, style }: { size: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);



// ─── Types ────────────────────────────────────────────────────────────────────

interface PLItem {
  concepto: string;
  monto: number;
  tipo: 'ingreso' | 'costo' | 'gasto' | 'subtotal' | 'total';
  nivel: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

// (hardcoded arrays removed — data is now loaded dynamically from Supabase)

// ─── Staff Performance Data ───────────────────────────────────────────────────

// (hardcoded arrays removed — data is now loaded dynamically from Supabase)

// ─── COGS / Cost Analysis Data ────────────────────────────────────────────────

// (removed module-level cogsData — now managed as component state)

// ─── Peak Hour Predictions ────────────────────────────────────────────────────

const peakPredictions: PeakPrediction[] = [];

// (removed module-level peakChartData — now managed as component state)

// ─── P&L Data (static fallback — overridden by dynamic useMemo inside component) ──

const gastosOpFallback: { concepto: string; monto: number }[] = [
  { concepto: 'Renta y Servicios', monto: 18500 },
  { concepto: 'Servicios Públicos (Luz, Agua, Gas)', monto: 12400 },
  { concepto: 'Marketing y Publicidad', monto: 6200 },
  { concepto: 'Consumibles y Suministros', monto: 4800 },
  { concepto: 'Otros Gastos Operativos', monto: 3500 },
];

const plDataFallback: PLItem[] = [
  { concepto: 'INGRESOS', monto: 0, tipo: 'subtotal', nivel: 0 },
  { concepto: 'Ventas de Alimentos', monto: 412600, tipo: 'ingreso', nivel: 1 },
  { concepto: 'Ventas de Bebidas', monto: 87400, tipo: 'ingreso', nivel: 1 },
  { concepto: 'Otros Ingresos', monto: 8200, tipo: 'ingreso', nivel: 1 },
  { concepto: 'TOTAL INGRESOS', monto: 508200, tipo: 'total', nivel: 0 },
  { concepto: 'COSTO DE VENTAS (COGS)', monto: 0, tipo: 'subtotal', nivel: 0 },
  { concepto: 'Costo de Ingredientes — Alimentos', monto: 148536, tipo: 'costo', nivel: 1 },
  { concepto: 'Costo de Ingredientes — Bebidas', monto: 13984, tipo: 'costo', nivel: 1 },
  { concepto: 'TOTAL COGS', monto: 162520, tipo: 'total', nivel: 0 },
  { concepto: 'UTILIDAD BRUTA', monto: 345680, tipo: 'total', nivel: 0 },
  { concepto: 'GASTOS OPERATIVOS', monto: 0, tipo: 'subtotal', nivel: 0 },
  { concepto: 'Nómina y Prestaciones', monto: 98400, tipo: 'gasto', nivel: 1 },
  { concepto: 'Renta del Local', monto: 35000, tipo: 'gasto', nivel: 1 },
  { concepto: 'Servicios (Luz, Agua, Gas)', monto: 18200, tipo: 'gasto', nivel: 1 },
  { concepto: 'Marketing y Publicidad', monto: 8500, tipo: 'gasto', nivel: 1 },
  { concepto: 'Mantenimiento y Reparaciones', monto: 4200, tipo: 'gasto', nivel: 1 },
  { concepto: 'Consumibles y Suministros', monto: 6800, tipo: 'gasto', nivel: 1 },
  { concepto: 'TOTAL GASTOS OPERATIVOS', monto: 171100, tipo: 'total', nivel: 0 },
  { concepto: 'EBITDA', monto: 174580, tipo: 'total', nivel: 0 },
  { concepto: 'Depreciación y Amortización', monto: 8400, tipo: 'gasto', nivel: 1 },
  { concepto: 'UTILIDAD OPERATIVA (EBIT)', monto: 166180, tipo: 'total', nivel: 0 },
  { concepto: 'Gastos Financieros (Intereses)', monto: 4200, tipo: 'gasto', nivel: 1 },
  { concepto: 'UTILIDAD ANTES DE IMPUESTOS', monto: 161980, tipo: 'total', nivel: 0 },
  { concepto: 'ISR (30%)', monto: 48594, tipo: 'costo', nivel: 1 },
  { concepto: 'UTILIDAD NETA', monto: 113386, tipo: 'total', nivel: 0 },
];

// ─── KPI Summary Data ─────────────────────────────────────────────────────────

const kpiData = {
  hoy: { ventas: 34602, ordenes: 115, ticket: 300.9, clientes: 98 },
  semana: { ventas: 139400, ordenes: 742, ticket: 187.9, clientes: 621 },
  mes: { ventas: 548200, ordenes: 2890, ticket: 189.7, clientes: 2340 },
  personalizado: { ventas: 87400, ordenes: 412, ticket: 212.1, clientes: 356 },
};

// ─── Tooltip Components ───────────────────────────────────────────────────────

const BarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border p-3 text-sm" style={{ borderColor: '#e5e7eb', minWidth: '160px' }}>
        <p className="font-600 text-gray-700 mb-1 text-xs truncate" style={{ fontWeight: 600, maxWidth: '180px' }}>{label}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500 text-xs">Cantidad</span>
          <span className="font-mono font-600 text-amber-600" style={{ fontWeight: 600 }}>{payload[0]?.value}</span>
        </div>
        {payload[1] && (
          <div className="flex items-center justify-between gap-4 mt-1">
            <span className="text-gray-500 text-xs">Ingresos</span>
            <span className="font-mono font-600 text-blue-600" style={{ fontWeight: 600 }}>${payload[1]?.value?.toLocaleString('es-MX')}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const LineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border p-3 text-sm" style={{ borderColor: '#e5e7eb', minWidth: '140px' }}>
        <p className="font-600 text-gray-700 mb-2" style={{ fontWeight: 600 }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 mt-1">
            <span className="text-gray-500 text-xs">{p.name === 'ventas' ? 'Ventas' : 'Órdenes'}</span>
            <span className="font-mono font-600" style={{ fontWeight: 600, color: p.color }}>
              {p.name === 'ventas' ? `$${p.value.toLocaleString('es-MX')}` : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const AreaTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border p-3 text-sm" style={{ borderColor: '#e5e7eb', minWidth: '140px' }}>
        <p className="font-600 text-gray-700 mb-2" style={{ fontWeight: 600 }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 mt-1">
            <span className="text-gray-500 text-xs">{p.name === 'ventas' ? 'Ventas' : 'Meta'}</span>
            <span className="font-mono font-600" style={{ fontWeight: 600, color: p.color }}>
              ${p.value.toLocaleString('es-MX')}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const PeakTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border p-3 text-sm" style={{ borderColor: '#e5e7eb', minWidth: '150px' }}>
        <p className="font-600 text-gray-700 mb-2" style={{ fontWeight: 600 }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 mt-1">
            <span className="text-gray-500 text-xs">{p.name === 'actual' ? 'Órdenes reales' : 'Predicción'}</span>
            <span className="font-mono font-600" style={{ fontWeight: 600, color: p.color }}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportesManagement() {
  const [dateRange, setDateRange] = useState<DateRange>('semana');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cogsSort, setCogsSort] = useState<'margenPct' | 'contribucionTotal'>('contribucionTotal');
  const [monthlyPayroll, setMonthlyPayroll] = useState<number>(98400);
  const [gastosOpMensual, setGastosOpMensual] = useState<{ concepto: string; monto: number }[]>([]);
  const [depMensualTotal, setDepMensualTotal] = useState<number>(8400);
  const [cogsLoading, setCogsLoading] = useState(true);

  const [totalSalesData, setTotalSalesData] = useState<{ periodo: string; ventas: number; meta: number }[]>([]);

  // useReportData: heavy loaders extracted to hook
  const {
    topDishesData, worstDishesData, hourlyData,
    staffPerformanceData: staffPerformanceData,
    cogsData, peakChartData, basketPairs,
  } = useReportData(dateRange, customStart, customEnd);

  // Real data states
  const [realStaffData, setRealStaffData] = useState<StaffPerformance[]>([]);
  const [realKpis, setRealKpis] = useState<{ ventas: number; ordenes: number; ticket: number; clientes: number } | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const supabase = createClient();

  // ─── Compute date range boundaries ───────────────────────────────────────────
  const getDateBounds = useCallback(() => {
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
      // personalizado
      start = customStart ? new Date(customStart + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
      end = customEnd ? new Date(customEnd + 'T23:59:59') : end;
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }, [dateRange, customStart, customEnd]);

  // ─── Fetch real data for the selected date range ──────────────────────────
  const fetchRealData = useCallback(async () => {
    setDataLoading(true);
    try {
      const { start, end } = getDateBounds();

      // Fetch closed orders in range (capped at 2000 to protect browser)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, mesero, created_at')
        .eq('status', 'cerrada')
        .gte('created_at', start)
        .lte('created_at', end)
        .limit(2000);

      if (ordersError) throw ordersError;

      const orderList = orders || [];
      const orderIds = orderList.map((o) => o.id);

      // KPIs
      const totalVentas = orderList.reduce((s, o) => s + Number(o.total), 0);
      const totalOrdenes = orderList.length;
      const ticketProm = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;
      setRealKpis({ ventas: Math.round(totalVentas), ordenes: totalOrdenes, ticket: Math.round(ticketProm * 100) / 100, clientes: totalOrdenes });

      // ── Build totalSalesData grouped by period ──
      const DAILY_META = 15000;
      if (dateRange === 'hoy') {
        // Group by hour
        const hourBuckets: Record<string, number> = {};
        for (let h = 8; h <= 23; h++) {
          hourBuckets[`${String(h).padStart(2, '0')}:00`] = 0;
        }
        orderList.forEach((o) => {
          let h = new Date(o.created_at).getHours();
          if (h >= 8 && h <= 23) {
            const label = `${String(h).padStart(2, '0')}:00`;
            hourBuckets[label] = (hourBuckets[label] || 0) + Number(o.total);
          }
        });
        const hourlyMeta = Math.round(DAILY_META / 16); // spread over 16 hours
        setTotalSalesData(
          Object.entries(hourBuckets).map(([periodo, ventas]) => ({
            periodo,
            ventas: Math.round(ventas),
            meta: hourlyMeta,
          }))
        );
      } else {
        // Group by day
        const dayBuckets: Record<string, number> = {};
        let startDate = new Date(start);
        const endDate = new Date(end);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const label = d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
          dayBuckets[label] = 0;
        }
        orderList.forEach((o) => {
          const label = new Date(o.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
          dayBuckets[label] = (dayBuckets[label] || 0) + Number(o.total);
        });
        setTotalSalesData(
          Object.entries(dayBuckets).map(([periodo, ventas]) => ({
            periodo,
            ventas: Math.round(ventas),
            meta: DAILY_META,
          }))
        );
      }

      // Order items for dish analysis
      if (orderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('name, qty, order_id')
          .in('order_id', orderIds)
          .limit(5000);

        if (!itemsError && items) {
          // Aggregate by dish name
          const dishMap: Record<string, { cantidad: number; ingresos: number }> = {};
          items.forEach((item) => {
            const order = orderList.find((o) => o.id === item.order_id);
            if (!dishMap[item.name]) dishMap[item.name] = { cantidad: 0, ingresos: 0 };
            dishMap[item.name].cantidad += Number(item.qty) || 1;
            // Approximate revenue: we don't have price per item in order_items easily, use qty
          });

          // Get dish prices from dishes table for revenue calc
          const { data: dishes } = await supabase.from('dishes').select('name, price, category');
          const priceMap: Record<string, { price: number; category: string }> = {};
          (dishes || []).forEach((d: any) => { priceMap[d.name] = { price: Number(d.price), category: d.category }; });

          const allDishes: DishSales[] = Object.entries(dishMap).map(([nombre, v]) => ({
            nombre,
            cantidad: v.cantidad,
            ingresos: Math.round(v.cantidad * (priceMap[nombre]?.price ?? 0)),
            categoria: priceMap[nombre]?.category ?? 'Sin categoría',
          }));

          const sorted = [...allDishes].sort((a, b) => b.cantidad - a.cantidad);
        }
      } else {
      }

      // Hourly sales from orders in range
      const hourBuckets: Record<string, { ventas: number; ordenes: number }> = {};
      for (let h = 8; h <= 23; h++) {
        const label = `${String(h).padStart(2, '0')}:00`;
        hourBuckets[label] = { ventas: 0, ordenes: 0 };
      }
      orderList.forEach((o) => {
        let h = new Date(o.created_at).getHours();
        if (h >= 8 && h <= 23) {
          const label = `${String(h).padStart(2, '0')}:00`;
          hourBuckets[label].ventas += Number(o.total);
          hourBuckets[label].ordenes += 1;
        }
      });

      // Staff performance: group orders by mesero
      const meseroMap: Record<string, { ordenes: number; ventas: number }> = {};
      orderList.forEach((o) => {
        const m = o.mesero || 'Sin asignar';
        if (!meseroMap[m]) meseroMap[m] = { ordenes: 0, ventas: 0 };
        meseroMap[m].ordenes += 1;
        meseroMap[m].ventas += Number(o.total);
      });

      const staffRows: StaffPerformance[] = Object.entries(meseroMap).map(([nombre, v]) => ({
        nombre,
        rol: 'Mesero',
        ordenes: v.ordenes,
        horas: 8,
        ordenesHora: Math.round((v.ordenes / 8) * 10) / 10,
        ventasTotal: Math.round(v.ventas),
        satisfaccion: 90,
        turno: 'Matutino',
      })).sort((a, b) => b.ordenes - a.ordenes);

      setRealStaffData(staffRows);
    } catch (err: any) {
      console.error('Reportes fetch error:', err);
    }
    setDataLoading(false);
  }, [getDateBounds]);

  useEffect(() => {
    fetchRealData();
  }, [fetchRealData]);




  // Fetch real payroll from employees table
  useEffect(() => {
    supabase.from('employees').select('salary, salary_frequency, status').eq('status', 'activo').then(({ data }) => {
      if (data && data.length > 0) {
        const total = data.reduce((sum: number, e: any) => {
          const salary = Number(e.salary ?? 0);
          const freq = e.salary_frequency ?? 'mensual';
          const monthly = freq === 'mensual' ? salary : freq === 'quincenal' ? salary * 2 : salary * 4.33;
          return sum + monthly;
        }, 0);
        if (total > 0) setMonthlyPayroll(Math.round(total));
      }
    });
  }, []);

  // Fetch real gastos recurrentes from gastos_recurrentes table
  useEffect(() => {
    const FRECUENCIA_MESES: Record<string, number> = {
      diario: 1/30, semanal: 1/4.33, quincenal: 0.5,
      mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12,
    };
    supabase
      .from('gastos_recurrentes')
      .select('nombre, monto, frecuencia, categoria, activo')
      .eq('activo', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Group by categoria and sum monthly equivalent
          const grouped: Record<string, number> = {};
          data.forEach((g: any) => {
            const meses = FRECUENCIA_MESES[g.frecuencia] ?? 1;
            const mensual = Number(g.monto) / meses;
            const cat = g.categoria ?? 'otro';
            grouped[cat] = (grouped[cat] ?? 0) + mensual;
          });
          const items = Object.entries(grouped).map(([cat, monto]) => ({
            concepto: cat === 'servicios' ? 'Servicios (Luz, Agua, Gas, etc.)' :
              cat === 'renta' ? 'Renta del Local' :
              cat === 'marketing' ? 'Marketing y Publicidad' :
              cat === 'mantenimiento' ? 'Mantenimiento y Reparaciones' :
              cat === 'suministros' ? 'Consumibles y Suministros' :
              cat === 'financiero' ? 'Gastos Financieros' :
              cat === 'impuestos'? 'Impuestos y Contribuciones' : 'Otros Gastos Operativos',
            monto: Math.round(monto),
          }));
          setGastosOpMensual(items);
        }
      });
  }, []);

  // Fetch real depreciaciones
  useEffect(() => {
    supabase
      .from('depreciaciones')
      .select('valor_original, valor_residual, vida_util_anios, activo')
      .eq('activo', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const total = data.reduce((sum: number, d: any) => {
            const base = Number(d.valor_original) - Number(d.valor_residual);
            const anios = Number(d.vida_util_anios) || 1;
            return sum + (base / anios / 12);
          }, 0);
          if (total > 0) setDepMensualTotal(Math.round(total));
        }
      });
  }, []);

  // Use real data if available, fall back to state data
  const topDishesToUse = topDishesData.length > 0 ? topDishesData : topDishesData;
  const worstDishesToUse = worstDishesData.length > 0 ? worstDishesData : worstDishesData;
  const hourlyDataToUse = hourlyData.length > 0 ? hourlyData : hourlyData;
  const staffDataToUse = realStaffData.length > 0 ? realStaffData : staffPerformanceData;
  const kpisToUse = realKpis ?? kpiData[dateRange];

  const dateRangeLabel = useMemo(() => {
    const now = new Date();
    if (dateRange === 'hoy') return now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (dateRange === 'semana') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      return `Semana del ${weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} al ${now.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
    if (dateRange === 'mes') return now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return `${customStart} — ${customEnd}`;
  }, [dateRange, customStart, customEnd]);

  const handleExportPDF = useCallback(() => {
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 300);
  }, []);

  const shortName = (name: string, max = 18) => name.length > max ? name.slice(0, max) + '…' : name;

  const topChartData = topDishesToUse.map(d => ({ ...d, nombre: shortName(d.nombre) }));
  const worstChartData = worstDishesToUse.map(d => ({ ...d, nombre: shortName(d.nombre) }));

  const sortedCogsData = useMemo(() => {
    const source = cogsData.length > 0 ? cogsData : cogsData;
    return [...source].sort((a, b) => b[cogsSort] - a[cogsSort]);
  }, [cogsSort, cogsData, cogsData]);

  const topStaff = useMemo(() =>
    [...staffDataToUse].sort((a, b) => b.ordenesHora - a.ordenesHora),
    [staffDataToUse]
  );

  // P&L real: usar datos del período seleccionado (realKpis) o fallback
  const plTotalIngresos = realKpis?.ventas ?? 0;

  // COGS real desde cogsData (suma de costoIngredientes * unidades vendidas)
  const plCogsReal = cogsData.reduce((s, d) => s + d.costoIngredientes * d.unidadesVendidas, 0);
  const plUtilidadBruta = plTotalIngresos > 0
    ? Math.round(plTotalIngresos - plCogsReal)
    : 0;
  const plMargenBruto = plTotalIngresos > 0
    ? ((plUtilidadBruta / plTotalIngresos) * 100).toFixed(1)
    : '0.0';

  // Build P&L data with real payroll + real gastos + real depreciaciones
  const plData: PLItem[] = useMemo(() => {
    const nomina = monthlyPayroll;

    // Build gastos operativos from real data (exclude nomina and financiero which are separate)
    const gastosOpItems = gastosOpMensual.filter(g =>
      !g.concepto.includes('Financiero') && !g.concepto.includes('Impuestos')
    );
    const gastosFinancieros = gastosOpMensual.find(g => g.concepto.includes('Financiero'))?.monto ?? 4200;

    // If no real gastos loaded yet, use fallback static values
    const gastosOpToUse = gastosOpItems.length > 0 ? gastosOpItems : (plTotalIngresos > 0 ? [] : gastosOpFallback);
    const totalOtrosGastos = gastosOpToUse.reduce((s, g) => s + g.monto, 0);
    const totalGastosOp = nomina + totalOtrosGastos;
    const ebitda = plUtilidadBruta - totalGastosOp;
    const ebit = ebitda - depMensualTotal;
    const uai = ebit - gastosFinancieros;
    const isr = Math.round(Math.max(uai, 0) * 0.30);
    const utilidadNeta = uai - isr;

    return [
      { concepto: 'INGRESOS', monto: 0, tipo: 'subtotal', nivel: 0 },
      { concepto: 'Ventas (período)', monto: plTotalIngresos, tipo: 'ingreso', nivel: 1 },
      { concepto: 'TOTAL INGRESOS', monto: plTotalIngresos, tipo: 'total', nivel: 0 },
      { concepto: 'COSTO DE VENTAS (COGS)', monto: 0, tipo: 'subtotal', nivel: 0 },
      { concepto: 'Costo de Ingredientes (recetas)', monto: plUtilidadBruta > 0 ? Math.round(plTotalIngresos - plUtilidadBruta) : 0, tipo: 'costo', nivel: 1 },
      { concepto: 'TOTAL COGS', monto: plUtilidadBruta > 0 ? Math.round(plTotalIngresos - plUtilidadBruta) : 0, tipo: 'total', nivel: 0 },
      { concepto: 'UTILIDAD BRUTA', monto: plUtilidadBruta, tipo: 'total', nivel: 0 },
      { concepto: 'GASTOS OPERATIVOS', monto: 0, tipo: 'subtotal', nivel: 0 },
      { concepto: 'Nómina y Prestaciones', monto: nomina, tipo: 'gasto', nivel: 1 },
      ...gastosOpToUse.map(g => ({ concepto: g.concepto, monto: g.monto, tipo: 'gasto' as const, nivel: 1 })),
      { concepto: 'TOTAL GASTOS OPERATIVOS', monto: totalGastosOp, tipo: 'total', nivel: 0 },
      { concepto: 'EBITDA', monto: ebitda, tipo: 'total', nivel: 0 },
      { concepto: 'Depreciación y Amortización', monto: depMensualTotal, tipo: 'gasto', nivel: 1 },
      { concepto: 'UTILIDAD OPERATIVA (EBIT)', monto: ebit, tipo: 'total', nivel: 0 },
      { concepto: 'Gastos Financieros (Intereses)', monto: gastosFinancieros, tipo: 'gasto', nivel: 1 },
      { concepto: 'UTILIDAD ANTES DE IMPUESTOS', monto: uai, tipo: 'total', nivel: 0 },
      { concepto: 'ISR (30%)', monto: isr, tipo: 'costo', nivel: 1 },
      { concepto: 'UTILIDAD NETA', monto: utilidadNeta, tipo: 'total', nivel: 0 },
    ];
  }, [monthlyPayroll, gastosOpMensual, depMensualTotal, plTotalIngresos, plUtilidadBruta]);

  const plUtilidadNeta = useMemo(() => plData.find((i) => i.concepto === 'UTILIDAD NETA')?.monto ?? 113386, [plData]);
  const plMargenNeto = ((plUtilidadNeta / plTotalIngresos) * 100).toFixed(1);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {/* ── Header ── */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: '#e5e7eb' }}>
        <div>
          <h1 className="text-xl font-700 text-gray-900" style={{ fontWeight: 700 }}>Reportes y Análisis</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dateRangeLabel}</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-all duration-150 print:hidden"
          style={{
            fontWeight: 600,
            backgroundColor: exporting ? '#d97706' : '#f59e0b',
            color: '#1B3A6B',
            opacity: exporting ? 0.8 : 1,
          }}
        >
          <Download size={16} />
          {exporting ? 'Generando PDF…' : 'Exportar PDF'}
        </button>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* ── Date Range Filter ── */}
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              <Calendar size={16} style={{ color: '#1B3A6B' }} />
              <span className="text-sm font-600 text-gray-700" style={{ fontWeight: 600 }}>Período:</span>
            </div>
            {(['hoy', 'semana', 'mes', 'personalizado'] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => { setDateRange(r); if (r === 'personalizado') setShowCustom(true); else setShowCustom(false); }}
                className="px-4 py-2 rounded-lg text-sm font-600 transition-all duration-150"
                style={{
                  fontWeight: 600,
                  backgroundColor: dateRange === r ? '#1B3A6B' : '#f3f4f6',
                  color: dateRange === r ? 'white' : '#374151',
                }}
              >
                {r === 'hoy' ? 'Hoy' : r === 'semana' ? 'Esta Semana' : r === 'mes' ? 'Este Mes' : 'Personalizado'}
              </button>
            ))}
            {showCustom && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2"
                  style={{ borderColor: '#d1d5db' }}
                />
                <span className="text-gray-400 text-sm">—</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2"
                  style={{ borderColor: '#d1d5db' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Ventas Totales', value: `$${kpisToUse.ventas.toLocaleString('es-MX')}`, icon: DollarSign, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Órdenes', value: kpisToUse.ordenes.toLocaleString('es-MX'), icon: ShoppingBag, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Ticket Promedio', value: `$${kpisToUse.ticket.toFixed(2)}`, icon: ShoppingCart, color: '#10b981', bg: '#ecfdf5' },
            { label: 'Clientes', value: kpisToUse.clientes.toLocaleString('es-MX'), icon: Users, color: '#8b5cf6', bg: '#f5f3ff' },
          ].map((kpi) => {
            const KpiIcon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white rounded-xl border p-4" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500 font-500">{kpi.label}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.bg }}>
                    <KpiIcon size={16} style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="text-xl font-700 text-gray-900" style={{ fontWeight: 700 }}>{kpi.value}</p>
              </div>
            );
          })}
        </div>

        {/* ── Total Sales Chart ── */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>Ventas Totales</h2>
              <p className="text-xs text-gray-500">Comparativo vs meta diaria ($15,000)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#f59e0b' }}></span>Ventas</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#e5e7eb' }}></span>Meta</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={totalSalesData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={40} />
              <Tooltip content={<AreaTooltip />} />
              <Area type="monotone" dataKey="meta" stroke="#d1d5db" strokeWidth={1.5} fill="url(#metaGrad)" dot={false} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="ventas" stroke="#f59e0b" strokeWidth={2.5} fill="url(#ventasGrad)" dot={false} activeDot={{ r: 5, fill: '#f59e0b', stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Top 10 & Worst 10 Bar Charts ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Top 10 */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ecfdf5' }}>
                <TrendingUp size={16} style={{ color: '#10b981' }} />
              </div>
              <div>
                <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>Top 10 Platillos</h2>
                <p className="text-xs text-gray-500">Los más vendidos del período</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topChartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="cantidad" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Worst 10 */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
                <TrendingDown size={16} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>Peores 10 Platillos</h2>
                <p className="text-xs text-gray-500">Los menos vendidos del período</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={worstChartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="cantidad" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Sales by Hour Line Chart ── */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
                <Clock size={16} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>Ventas por Hora</h2>
                <p className="text-xs text-gray-500">Patrón de demanda durante el día</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block" style={{ backgroundColor: '#f59e0b' }}></span>Ventas ($)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block" style={{ backgroundColor: '#3b82f6' }}></span>Órdenes</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={hourlyDataToUse} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="ventas" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={40} />
              <YAxis yAxisId="ordenes" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<LineTooltip />} />
              <Line yAxisId="ventas" type="monotone" dataKey="ventas" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#f59e0b', stroke: 'white', strokeWidth: 2 }} />
              <Line yAxisId="ordenes" type="monotone" dataKey="ordenes" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
          {/* Peak info */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm" style={{ borderColor: '#f3f4f6' }}>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Hora pico</p>
              <p className="font-600 text-gray-800 font-mono text-base" style={{ fontWeight: 600 }}>$34,602</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Hora más baja</p>
              <p className="font-600 text-gray-800 font-mono" style={{ fontWeight: 600 }}>$680</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Pico nocturno</p>
              <p className="font-600 text-gray-800 font-mono" style={{ fontWeight: 600 }}>$3,980</p>
            </div>
            <div className="ml-auto">
              <p className="text-xs text-gray-400 mb-0.5">Total del día</p>
              <p className="font-700 text-amber-600 font-mono text-base" style={{ fontWeight: 700 }}>$34,602</p>
            </div>
          </div>
        </div>

        {/* ── Market Basket Analysis ── */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f5f3ff' }}>
              <ShoppingCart size={16} style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>Análisis de Canasta de Mercado</h2>
              <p className="text-xs text-gray-500">Productos que se compran juntos con mayor frecuencia</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3 mb-4 p-3 rounded-lg text-xs" style={{ backgroundColor: '#f8fafc' }}>
            <div><span className="font-600 text-gray-700" style={{ fontWeight: 600 }}>Frecuencia:</span> <span className="text-gray-500">Veces que se pidieron juntos</span></div>
            <div><span className="font-600 text-gray-700" style={{ fontWeight: 600 }}>Confianza:</span> <span className="text-gray-500">Probabilidad de compra conjunta</span></div>
            <div><span className="font-600 text-gray-700" style={{ fontWeight: 600 }}>Lift:</span> <span className="text-gray-500">Fuerza de la asociación (&gt;1 = positiva)</span></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  <th className="text-left py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>#</th>
                  <th className="text-left py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Producto A</th>
                  <th className="text-left py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Producto B</th>
                  <th className="text-right py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Frecuencia</th>
                  <th className="text-right py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Confianza</th>
                  <th className="text-right py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Lift</th>
                  <th className="text-right py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide whitespace-nowrap" style={{ fontWeight: 600 }}>Precio Combo Rec.</th>
                  <th className="text-left py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Asociación</th>
                </tr>
              </thead>
              <tbody>
                {basketPairs.map((pair, idx) => {
                  const liftColor = pair.lift >= 2 ? '#10b981' : pair.lift >= 1.5 ? '#f59e0b' : '#6b7280';
                  const liftBg = pair.lift >= 2 ? '#ecfdf5' : pair.lift >= 1.5 ? '#fffbeb' : '#f9fafb';
                  const barWidth = Math.round(pair.confianza * 100);
                  const discount = Math.min((pair.lift - 1) * 0.1, 0.25);
                  const comboPrice = Math.round((pair.precio_a + pair.precio_b) * (1 - discount));
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#f3f4f6' }}>
                      <td className="py-3 px-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-500 text-gray-800 text-xs">{pair.producto_a}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-500 text-gray-800 text-xs">{pair.producto_b}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-600 text-gray-700 font-mono text-xs" style={{ fontWeight: 600 }}>{pair.frecuencia}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${barWidth}%`, backgroundColor: '#8b5cf6' }} />
                          </div>
                          <span className="font-600 text-gray-700 font-mono text-xs w-8 text-right" style={{ fontWeight: 600 }}>{barWidth}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600" style={{ fontWeight: 600, color: liftColor, backgroundColor: liftBg }}>
                          {pair.lift.toFixed(1)}x
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-700 text-gray-900 font-mono text-xs" style={{ fontWeight: 700, color: '#7c3aed' }}>${comboPrice}</span>
                          <span className="text-gray-400 font-mono text-xs line-through">${pair.precio_a + pair.precio_b}</span>
                          <span className="text-xs" style={{ color: '#10b981' }}>-{Math.round(discount * 100)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          {pair.lift >= 2 ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-500" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>Muy fuerte</span>
                          ) : pair.lift >= 1.5 ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-500" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>Fuerte</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full font-500" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>Moderada</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {basketPairs.length > 0 ? (
            <div className="mt-4 p-3 rounded-lg text-xs text-gray-600" style={{ backgroundColor: '#fffbeb', borderLeft: '3px solid #f59e0b' }}>
              <strong>💡 Recomendación:</strong> El combo más frecuente es{' '}
              <strong>"{basketPairs[0].producto_a} + {basketPairs[0].producto_b}"</strong>{' '}
              — se pidieron juntos {basketPairs[0].frecuencia} veces (lift {basketPairs[0].lift.toFixed(1)}x).
              {basketPairs[1] && <> También considera <strong>"{basketPairs[1].producto_a} + {basketPairs[1].producto_b}"</strong>.</>}
            </div>
          ) : (
            <div className="mt-4 p-3 rounded-lg text-xs text-gray-500" style={{ backgroundColor: '#f8fafc', borderLeft: '3px solid #e5e7eb' }}>
              Sin suficientes datos para análisis de canasta en este período.
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── SECCIÓN: Desempeño del Personal ── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
              <Award size={16} style={{ color: '#d97706' }} />
            </div>
            <div>
              <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>Desempeño del Personal</h2>
              <p className="text-xs text-gray-500">Órdenes por hora y métricas de productividad por empleado</p>
            </div>
          </div>

          {/* Top performer highlight */}
          <div className="flex items-center gap-3 p-3 rounded-xl mb-5" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-700" style={{ backgroundColor: '#f59e0b', color: 'white', fontWeight: 700 }}>
              🏆
            </div>
            <div>
              <p className="text-xs text-amber-700 font-600" style={{ fontWeight: 600 }}>Mejor desempeño del período</p>
              <p className="text-sm font-700 text-gray-900" style={{ fontWeight: 700 }}>{topStaff[0]?.nombre} — {topStaff[0]?.ordenesHora.toFixed(1)} órdenes/hora</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-500">Ventas generadas</p>
              <p className="text-sm font-700 text-amber-600 font-mono" style={{ fontWeight: 700 }}>${topStaff[0]?.ventasTotal.toLocaleString('es-MX')}</p>
            </div>
          </div>

          {/* Staff cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topStaff.map((emp, idx) => {
              const isTop = idx === 0;
              const ordenesHoraMax = topStaff[0].ordenesHora;
              const barPct = Math.round((emp.ordenesHora / ordenesHoraMax) * 100);
              const satisfColor = emp.satisfaccion >= 95 ? '#10b981' : emp.satisfaccion >= 88 ? '#f59e0b' : '#ef4444';
              const satisfBg = emp.satisfaccion >= 95 ? '#ecfdf5' : emp.satisfaccion >= 88 ? '#fffbeb' : '#fef2f2';
              const turnoColor = emp.turno === 'Matutino' ? '#3b82f6' : emp.turno === 'Vespertino' ? '#f59e0b' : '#8b5cf6';
              const turnoBg = emp.turno === 'Matutino' ? '#eff6ff' : emp.turno === 'Vespertino' ? '#fffbeb' : '#f5f3ff';
              return (
                <div
                  key={emp.nombre}
                  className="rounded-xl border p-4 relative"
                  style={{
                    borderColor: isTop ? '#fde68a' : '#e5e7eb',
                    backgroundColor: isTop ? '#fffdf5' : 'white',
                    boxShadow: isTop ? '0 0 0 2px #fde68a' : '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  {isTop && (
                    <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-600" style={{ backgroundColor: '#fef3c7', color: '#d97706', fontWeight: 600 }}>
                      #1 Top
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-700" style={{ backgroundColor: '#1B3A6B', color: 'white', fontWeight: 700 }}>
                      {emp.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-700 text-gray-900 leading-tight" style={{ fontWeight: 700 }}>{emp.nombre}</p>
                      <p className="text-xs text-gray-500">{emp.rol}</p>
                    </div>
                  </div>

                  {/* Órdenes/hora — main metric */}
                  <div className="mb-3">
                    <div className="flex items-end justify-between mb-1">
                      <span className="text-xs text-gray-500">Órdenes / hora</span>
                      <span className="text-lg font-700 font-mono" style={{ fontWeight: 700, color: '#1B3A6B' }}>{emp.ordenesHora.toFixed(1)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: isTop ? '#f59e0b' : '#1B3A6B' }} />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg p-2" style={{ backgroundColor: '#f8fafc' }}>
                      <p className="text-xs text-gray-400 mb-0.5">Órdenes</p>
                      <p className="text-sm font-700 text-gray-800 font-mono" style={{ fontWeight: 700 }}>{emp.ordenes}</p>
                    </div>
                    <div className="rounded-lg p-2" style={{ backgroundColor: '#f8fafc' }}>
                      <p className="text-xs text-gray-400 mb-0.5">Horas</p>
                      <p className="text-sm font-700 text-gray-800 font-mono" style={{ fontWeight: 700 }}>{emp.horas}h</p>
                    </div>
                    <div className="rounded-lg p-2" style={{ backgroundColor: satisfBg }}>
                      <p className="text-xs mb-0.5" style={{ color: satisfColor }}>Satisf.</p>
                      <p className="text-sm font-700 font-mono" style={{ fontWeight: 700, color: satisfColor }}>{emp.satisfaccion}%</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: '#f3f4f6' }}>
                    <span className="text-xs px-2 py-0.5 rounded-full font-500" style={{ backgroundColor: turnoBg, color: turnoColor }}>{emp.turno}</span>
                    <span className="text-xs font-600 text-gray-600 font-mono" style={{ fontWeight: 600 }}>${emp.ventasTotal.toLocaleString('es-MX')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  {['Empleado', 'Turno', 'Órdenes', 'Horas', 'Órd./Hora', 'Ventas', 'Satisfacción'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topStaff.map((emp, idx) => (
                  <tr key={emp.nombre} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#f3f4f6' }}>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">{idx + 1}</span>
                        <span className="text-sm font-600 text-gray-800" style={{ fontWeight: 600 }}>{emp.nombre}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: emp.turno === 'Matutino' ? '#eff6ff' : emp.turno === 'Vespertino' ? '#fffbeb' : '#f5f3ff',
                        color: emp.turno === 'Matutino' ? '#3b82f6' : emp.turno === 'Vespertino' ? '#d97706' : '#8b5cf6',
                      }}>{emp.turno}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-sm text-gray-700">{emp.ordenes}</td>
                    <td className="py-3 px-3 font-mono text-sm text-gray-700">{emp.horas}h</td>
                    <td className="py-3 px-3">
                      <span className="font-700 font-mono text-sm" style={{ fontWeight: 700, color: '#1B3A6B' }}>{emp.ordenesHora.toFixed(1)}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-sm text-gray-700">${emp.ventasTotal.toLocaleString('es-MX')}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${emp.satisfaccion}%`, backgroundColor: emp.satisfaccion >= 95 ? '#10b981' : emp.satisfaccion >= 88 ? '#d97706' : '#ef4444' }} />
                        </div>
                        <span className="text-xs font-600 font-mono" style={{ fontWeight: 600, color: emp.satisfaccion >= 95 ? '#10b981' : emp.satisfaccion >= 88 ? '#d97706' : '#ef4444' }}>{emp.satisfaccion}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── SECCIÓN: Análisis de Costos (COGS por Platillo) ── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
                <ChefHat size={16} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>Análisis de Costos — COGS por Platillo</h2>
                <p className="text-xs text-gray-500">
                  {cogsData.length > 0
                    ? `Datos reales de ${cogsData.length} platillo${cogsData.length !== 1 ? 's' : ''} con receta configurada`
                    : 'Costo de ingredientes, margen bruto y contribución total'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cogsData.length > 0 && (
                <span className="text-xs px-2 py-1 rounded-full font-600" style={{ fontWeight: 600, backgroundColor: '#ecfdf5', color: '#059669' }}>
                  ✓ Datos reales
                </span>
              )}
              <span className="text-xs text-gray-500">Ordenar por:</span>
              <button
                onClick={() => setCogsSort('contribucionTotal')}
                className="px-3 py-1.5 rounded-lg text-xs font-600 transition-all"
                style={{ fontWeight: 600, backgroundColor: cogsSort === 'contribucionTotal' ? '#1B3A6B' : '#f3f4f6', color: cogsSort === 'contribucionTotal' ? 'white' : '#374151' }}
              >
                Contribución
              </button>
              <button
                onClick={() => setCogsSort('margenPct')}
                className="px-3 py-1.5 rounded-lg text-xs font-600 transition-all"
                style={{ fontWeight: 600, backgroundColor: cogsSort === 'margenPct' ? '#1B3A6B' : '#f3f4f6', color: cogsSort === 'margenPct' ? 'white' : '#374151' }}
              >
                Margen %
              </button>
            </div>
          </div>

          {/* COGS KPI summary */}
          {(() => {
            const source = cogsData.length > 0 ? cogsData : sortedCogsData;
            const totalCogs = source.reduce((s, d) => s + d.costoIngredientes * d.unidadesVendidas, 0);
            const avgMargin = source.length > 0 ? source.reduce((s, d) => s + d.margenPct, 0) / source.length : 0;
            const bestDish = [...source].sort((a, b) => b.margenPct - a.margenPct)[0];
            const totalContrib = source.reduce((s, d) => s + d.contribucionTotal, 0);
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'COGS Total', value: `$${totalCogs.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, sub: `${((totalCogs / 508200) * 100).toFixed(1)}% de ingresos`, color: '#ef4444', bg: '#fef2f2' },
                  { label: 'Margen Bruto Prom.', value: `${avgMargin.toFixed(1)}%`, sub: 'Sobre precio de venta', color: '#10b981', bg: '#ecfdf5' },
                  { label: 'Platillo más rentable', value: bestDish?.nombre ?? '—', sub: `${bestDish?.margenPct ?? 0}% margen bruto`, color: '#f59e0b', bg: '#fffbeb' },
                  { label: 'Contribución Total', value: `$${totalContrib.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, sub: `${source.length} platillos`, color: '#3b82f6', bg: '#eff6ff' },
                ].map(k => (
                  <div key={k.label} className="rounded-xl p-3" style={{ backgroundColor: k.bg }}>
                    <p className="text-xs font-600 mb-1" style={{ color: k.color, fontWeight: 600 }}>{k.label}</p>
                    <p className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>{k.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{k.sub}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* COGS chart */}
          {cogsLoading ? (
            <div className="h-64 rounded-xl animate-pulse mb-5" style={{ backgroundColor: '#f3f4f6' }} />
          ) : (
            <div className="mb-5">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sortedCogsData.map(d => ({ ...d, nombre: shortName(d.nombre, 16) }))} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString('es-MX')}`} width={60} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white rounded-xl shadow-lg border p-3 text-xs" style={{ borderColor: '#e5e7eb', minWidth: '180px' }}>
                          <p className="font-600 text-gray-700 mb-2" style={{ fontWeight: 600 }}>{label}</p>
                          <div className="flex justify-between gap-4"><span className="text-gray-500">Precio venta</span><span className="font-mono font-600" style={{ fontWeight: 600 }}>${payload[0]?.payload?.precioVenta}</span></div>
                          <div className="flex justify-between gap-4 mt-1"><span className="text-gray-500">Costo ingredientes</span><span className="font-mono font-600 text-red-500" style={{ fontWeight: 600 }}>${payload[0]?.payload?.costoIngredientes}</span></div>
                          <div className="flex justify-between gap-4 mt-1"><span className="text-gray-500">Margen bruto</span><span className="font-mono font-600 text-green-600" style={{ fontWeight: 600 }}>{payload[0]?.payload?.margenBruto}</span></div>
                          {payload[0]?.payload?.hasRealCost && <p className="mt-2 text-green-600 font-600" style={{ fontWeight: 600 }}>✓ Costo real</p>}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="costoIngredientes" name="COGS" fill="#fca5a5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="margenBruto" name="Margen" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Legend formatter={(v) => v === 'costoIngredientes' ? 'Costo Ingredientes' : 'Margen Bruto'} wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* COGS table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  {['Platillo', 'Categoría', 'Precio Venta', 'COGS', 'Margen Bruto', 'Margen %', 'Unidades', 'Contribución Total'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide whitespace-nowrap" style={{ fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCogsData.map((dish, idx) => {
                  const margenColor = dish.margenPct >= 75 ? '#10b981' : dish.margenPct >= 60 ? '#f59e0b' : '#ef4444';
                  const margenBg = dish.margenPct >= 75 ? '#ecfdf5' : dish.margenPct >= 60 ? '#fffbeb' : '#fef2f2';
                  return (
                    <tr key={dish.nombre} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#f3f4f6' }}>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-4">{idx + 1}</span>
                          <span className="text-sm font-600 text-gray-800" style={{ fontWeight: 600 }}>{dish.nombre}</span>
                          {dish.hasRealCost && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>✓</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3"><span className="text-xs text-gray-500">{dish.categoria}</span></td>
                      <td className="py-3 px-3 font-mono text-sm text-gray-700">${dish.precioVenta.toFixed(2)}</td>
                      <td className="py-3 px-3 font-mono text-sm text-red-500">${dish.costoIngredientes.toFixed(2)}</td>
                      <td className="py-3 px-3 font-mono text-sm text-green-600">${dish.margenBruto.toFixed(2)}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600" style={{ fontWeight: 600, color: margenColor, backgroundColor: margenBg }}>
                          {dish.margenPct}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-sm text-gray-700">{dish.unidadesVendidas}</td>
                      <td className="py-3 px-3 font-mono text-sm font-700 text-gray-900" style={{ fontWeight: 700 }}>${dish.contribucionTotal.toLocaleString('es-MX')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {cogsData.length === 0 && !cogsLoading && (
            <div className="mt-3 p-3 rounded-lg text-xs text-gray-600" style={{ backgroundColor: '#fffbeb', borderLeft: '3px solid #f59e0b' }}>
              <strong>💡 Tip:</strong> Ve a la sección de Menú, abre la receta de cada platillo y agrega sus ingredientes con porciones para ver aquí los costos reales calculados automáticamente.
            </div>
          )}

          {(() => {
            const source = cogsData.length > 0 ? cogsData : sortedCogsData;
            const worstDish = [...source].sort((a, b) => a.margenPct - b.margenPct)[0];
            if (!worstDish) return null;
            return (
              <div className="mt-4 p-3 rounded-lg text-xs text-gray-600" style={{ backgroundColor: '#fef2f2', borderLeft: '3px solid #ef4444' }}>
                <strong>⚠️ Atención:</strong> {worstDish.nombre} tiene el margen más bajo ({worstDish.margenPct}%). Considera revisar proveedores o ajustar el precio de venta para mejorar la rentabilidad.
              </div>
            );
          })()}
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── SECCIÓN: Predicción de Horas Pico ── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eff6ff' }}>
              <TrendingUp size={16} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>Predicción de Horas Pico</h2>
              <p className="text-xs text-gray-500">Demanda real vs. predicción basada en patrones históricos</p>
            </div>
          </div>

          {/* Prediction chart */}
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={peakChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} label={{ value: 'Órdenes', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9ca3af' } }} />
              <Tooltip content={<PeakTooltip />} />
              <Line type="monotone" dataKey="actual" name="actual" stroke="#1B3A6B" strokeWidth={2.5} dot={{ r: 3, fill: '#1B3A6B' }} activeDot={{ r: 5, fill: '#1B3A6B', stroke: 'white', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="predicho" name="predicho" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#f59e0b', stroke: 'white', strokeWidth: 2 }} strokeDasharray="6 3" />
              <Legend formatter={(v) => v === 'actual' ? 'Órdenes reales' : 'Predicción IA'} wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>

          {/* Peak alerts */}
          <div className="mt-5">
            <h3 className="text-sm font-700 text-gray-800 mb-3" style={{ fontWeight: 700 }}>Alertas y Recomendaciones de Staffing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {peakPredictions.map((p) => {
                const isPeak = p.recomendacion === 'Pico máximo' || p.recomendacion === 'Pico nocturno';
                const isHigh = p.recomendacion === 'Alta demanda';
                const bgColor = isPeak ? '#fef2f2' : isHigh ? '#fffbeb' : '#f0fdf4';
                const borderColor = isPeak ? '#fca5a5' : isHigh ? '#fde68a' : '#bbf7d0';
                const textColor = isPeak ? '#dc2626' : isHigh ? '#d97706' : '#16a34a';
                const iconEl = isPeak ? <AlertTriangle size={14} /> : isHigh ? <TrendingUp size={14} /> : <Clock size={14} />;
                return (
                  <div key={p.hora} className="rounded-xl p-3" style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}>
                    <div className="flex items-center gap-1.5" style={{ color: textColor }}>
                      {iconEl}
                      <span className="text-sm font-700" style={{ fontWeight: 700 }}>{p.hora}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">Órdenes reales</span>
                      <span className="text-xs font-700 font-mono" style={{ fontWeight: 700, color: textColor }}>{p.actual}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">Predicción</span>
                      <span className="text-xs font-700 font-mono" style={{ fontWeight: 700, color: textColor }}>{p.predicho}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t" style={{ borderColor: borderColor }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Confianza del modelo</span>
                        <span className="text-xs font-600 font-mono" style={{ fontWeight: 600, color: textColor }}>{p.confianza}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full mt-1" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${p.confianza}%`, backgroundColor: textColor }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg text-xs text-gray-600" style={{ backgroundColor: '#eff6ff', borderLeft: '3px solid #3b82f6' }}>
            <strong>📊 Recomendación de staffing:</strong> Para las horas pico (13:00–15:00 y 19:00–21:00) se recomienda tener al menos 4 meseros activos. Considera programar descansos entre 10:00–11:00 y 16:00–17:00 cuando la demanda es baja.
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── SECCIÓN: Estado de Resultados (P&L) ── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ecfdf5' }}>
              <DollarSign size={16} style={{ color: '#10b981' }} />
            </div>
            <div>
              <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>Estado de Resultados (P&L)</h2>
              <p className="text-xs text-gray-500">Reporte de Pérdidas y Ganancias — {dateRangeLabel}</p>
            </div>
          </div>

          {/* P&L KPI summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Ingresos Totales', value: '$508,200', delta: '+12.4%', up: true, color: '#10b981', bg: '#ecfdf5' },
              { label: 'Utilidad Bruta', value: `$${plUtilidadBruta.toLocaleString('es-MX')}`, delta: `${plMargenBruto}% margen`, up: true, color: '#3b82f6', bg: '#eff6ff' },
              { label: 'EBITDA', value: '$174,580', delta: '34.4% margen', up: true, color: '#f59e0b', bg: '#fffbeb' },
              { label: 'Utilidad Neta', value: `$${plUtilidadNeta.toLocaleString('es-MX')}`, delta: `${plMargenNeto}% margen`, up: true, color: '#10b981', bg: '#ecfdf5' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border p-4" style={{ borderColor: '#e5e7eb', backgroundColor: k.bg }}>
                <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                <p className="text-lg font-700 text-gray-900" style={{ fontWeight: 700 }}>{k.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {k.up ? <ArrowUpRight size={12} style={{ color: k.color }} /> : <ArrowDownRight size={12} style={{ color: '#ef4444' }} />}
                  <span className="text-xs font-600" style={{ fontWeight: 600, color: k.color }}>{k.delta}</span>
                </div>
              </div>
            ))}
          </div>

          {/* P&L Waterfall visual */}
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { concepto: 'Ingresos', valor: 508200, fill: '#10b981' },
                  { concepto: 'COGS', valor: -162520, fill: '#ef4444' },
                  { concepto: 'Ut. Bruta', valor: 345680, fill: '#3b82f6' },
                  { concepto: 'Gastos Op.', valor: -171100, fill: '#f59e0b' },
                  { concepto: 'EBITDA', valor: 174580, fill: '#8b5cf6' },
                  { concepto: 'Dep.+Int.', valor: -12600, fill: '#f97316' },
                  { concepto: 'ISR', valor: -48594, fill: '#ec4899' },
                  { concepto: 'Ut. Neta', valor: 113386, fill: '#10b981' },
                ]}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="concepto" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(Math.abs(v) / 1000).toFixed(0)}k`} width={45} />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    const val = payload[0]?.value;
                    return (
                      <div className="bg-white rounded-xl shadow-lg border p-3 text-xs" style={{ borderColor: '#e5e7eb' }}>
                        <p className="font-600 text-gray-700 mb-1" style={{ fontWeight: 600 }}>{label}</p>
                        <p className="font-mono font-700" style={{ fontWeight: 700, color: val >= 0 ? '#10b981' : '#ef4444' }}>
                          {val >= 0 ? '+' : ''}${Math.abs(val).toLocaleString('es-MX')}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {[
                    { concepto: 'Ingresos', valor: 508200, fill: '#10b981' },
                    { concepto: 'COGS', valor: -162520, fill: '#ef4444' },
                    { concepto: 'Ut. Bruta', valor: 345680, fill: '#3b82f6' },
                    { concepto: 'Gastos Op.', valor: -171100, fill: '#f59e0b' },
                    { concepto: 'EBITDA', valor: 174580, fill: '#8b5cf6' },
                    { concepto: 'Dep.+Int.', valor: -12600, fill: '#f97316' },
                    { concepto: 'ISR', valor: -48594, fill: '#ec4899' },
                    { concepto: 'Ut. Neta', valor: 113386, fill: '#10b981' },
                  ].map((entry, index) => (
                    <rect key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* P&L detailed table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  <th className="text-left py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Concepto</th>
                  <th className="text-right py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>Monto (MXN)</th>
                  <th className="text-right py-2 px-3 text-xs font-600 text-gray-500 uppercase tracking-wide" style={{ fontWeight: 600 }}>% Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {plData.map((item, idx) => {
                  const isHeader = item.tipo === 'subtotal';
                  const isTotal = item.tipo === 'total';
                  const isCost = item.tipo === 'costo' || item.tipo === 'gasto';
                  const pct = item.monto > 0 ? ((item.monto / plTotalIngresos) * 100).toFixed(1) : null;

                  if (isHeader) {
                    return (
                      <tr key={idx} style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e5e7eb' }}>
                        <td colSpan={3} className="py-2 px-3 text-xs font-700 text-gray-600 uppercase tracking-widest" style={{ fontWeight: 700 }}>{item.concepto}</td>
                      </tr>
                    );
                  }

                  if (isTotal) {
                    const isPositive = item.monto > 0;
                    const totalColor = item.concepto.includes('NETA') ? '#10b981' : item.concepto.includes('BRUTA') ? '#3b82f6' : item.concepto.includes('EBITDA') ? '#8b5cf6' : '#1B3A6B';
                    return (
                      <tr key={idx} style={{ backgroundColor: '#f0f9ff', borderTop: '1px solid #bae6fd', borderBottom: '1px solid #bae6fd' }}>
                        <td className="py-3 px-3 font-700 text-sm" style={{ fontWeight: 700, color: totalColor, paddingLeft: `${12 + item.nivel * 16}px` }}>{item.concepto}</td>
                        <td className="py-3 px-3 text-right font-mono text-sm" style={{ fontWeight: 700, color: totalColor }}>
                          ${item.monto.toLocaleString('es-MX')}
                        </td>
                        <td className="py-3 px-3 text-right text-xs text-gray-400 font-mono">
                          {pct ? `${pct}%` : '—'}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#f3f4f6' }}>
                      <td className="py-2.5 px-3 text-sm text-gray-700" style={{ paddingLeft: `${12 + item.nivel * 20}px` }}>{item.concepto}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm" style={{ color: isCost ? '#ef4444' : '#374151' }}>
                        {isCost ? '-' : '+'}${item.monto.toLocaleString('es-MX')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-400 font-mono">
                        {pct ? `${pct}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* P&L footer note */}
          <div className="mt-4 p-3 rounded-lg text-xs text-gray-600" style={{ backgroundColor: '#ecfdf5', borderLeft: '3px solid #10b981' }}>
            <strong>✅ Resumen ejecutivo:</strong> El restaurante opera con un margen neto del {plMargenNeto}% — por encima del promedio de la industria (8–12%). La utilidad bruta del {plMargenBruto}% refleja un buen control de costos de ingredientes. Se recomienda revisar los gastos operativos (nómina) que representan el 19.4% de los ingresos.
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── SECCIÓN: Análisis de Desperdicio e Inventario ── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
              <Trash2Icon size={16} style={{ color: '#d97706' }} />
            </div>
            <div>
              <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>Análisis de Desperdicio e Inventario</h2>
              <p className="text-xs text-gray-500">Recomendaciones de compra/reducción basadas en historial de movimientos</p>
            </div>
          </div>
          <WasteAnalysisSummary />
        </div>

      </div>{/* closes px-6 py-5 space-y-6 */}

      {/* ── Print Styles ── */}
      <style jsx global>{`
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