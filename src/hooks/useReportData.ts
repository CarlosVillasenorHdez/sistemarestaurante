'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DateRange = 'hoy' | 'semana' | 'mes' | 'personalizado';

export interface DishSales {
  nombre: string;
  cantidad: number;
  ingresos: number;
  categoria: string;
}

export interface HourlySales {
  hora: string;
  ventas: number;
  ordenes: number;
}

export interface BasketPair {
  producto_a: string;
  producto_b: string;
  frecuencia: number;
  confianza: number;
  lift: number;
  precio_a: number;
  precio_b: number;
}

export interface StaffPerformance {
  nombre: string;
  rol: string;
  ordenes: number;
  horas: number;
  ordenesHora: number;
  ventasTotal: number;
  satisfaccion: number;
  turno: string;
}

export interface DishCOGS {
  nombre: string;
  categoria: string;
  precioVenta: number;
  costoIngredientes: number;
  margenBruto: number;
  margenPct: number;
  unidadesVendidas: number;
  contribucionTotal: number;
  hasRealCost?: boolean;
}

export interface PeakPrediction {
  hora: string;
  actual: number;
  predicho: number;
  confianza: number;
  recomendacion: string;
}

export interface RealKPIs {
  ventas: number;
  ordenes: number;
  ticket: number;
  clientes: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ReportData {
  topDishesData:       DishSales[];
  worstDishesData:     DishSales[];
  hourlyData:          HourlySales[];
  staffPerformanceData: StaffPerformance[];
  cogsData:            DishCOGS[];
  peakChartData:       PeakPrediction[];
  basketPairs:         BasketPair[];
  loading:             boolean;
}

function dateRangeToISO(
  range: DateRange,
  customStart: string,
  customEnd: string
): { startDate: string; endDate: string } {
  const now = new Date();
  let startDate: string;

  if (range === 'hoy') {
    startDate = now.toISOString().split('T')[0];
  } else if (range === 'semana') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    startDate = d.toISOString().split('T')[0];
  } else if (range === 'mes') {
    const d = new Date(now);
    d.setDate(1);
    startDate = d.toISOString().split('T')[0];
  } else {
    startDate = customStart;
  }

  const endDate = range === 'personalizado' ? customEnd : now.toISOString().split('T')[0];
  return { startDate, endDate };
}

export function useReportData(
  dateRange: DateRange,
  customStart: string,
  customEnd: string
): ReportData {
  const supabase = createClient();

  const [topDishesData,        setTopDishesData]        = useState<DishSales[]>([]);
  const [worstDishesData,      setWorstDishesData]      = useState<DishSales[]>([]);
  const [hourlyData,           setHourlyData]           = useState<HourlySales[]>([]);
  const [staffPerformanceData, setStaffPerformanceData] = useState<StaffPerformance[]>([]);
  const [cogsData,             setCogsData]             = useState<DishCOGS[]>([]);
  const [peakChartData,        setPeakChartData]        = useState<PeakPrediction[]>([]);
  const [basketPairs,          setBasketPairs]          = useState<BasketPair[]>([]);
  const [loading,              setLoading]              = useState(true);

  // ── Loader 1: dishes, hourly, staff ────────────────────────────────────────
  const loadReportData = useCallback(async () => {
    const { startDate, endDate } = dateRangeToISO(dateRange, customStart, customEnd);

    const [{ data: itemsData }, { data: ordersData }] = await Promise.all([
      supabase.from('order_items').select('name, qty, price, created_at')
        .gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59').limit(5000),
      supabase.from('orders').select('total, mesero, closed_at, created_at')
        .eq('status', 'cerrada').gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59').limit(2000),
    ]);

    // Top / worst dishes
    const dishMap: Record<string, { cantidad: number; ingresos: number }> = {};
    (itemsData || []).forEach((i: any) => {
      if (!dishMap[i.name]) dishMap[i.name] = { cantidad: 0, ingresos: 0 };
      dishMap[i.name].cantidad += i.qty;
      dishMap[i.name].ingresos += i.qty * Number(i.price);
    });
    const sorted = Object.entries(dishMap)
      .map(([nombre, v]) => ({ nombre, cantidad: v.cantidad, ingresos: v.ingresos, categoria: '' }))
      .sort((a, b) => b.cantidad - a.cantidad);
    setTopDishesData(sorted.slice(0, 10));
    setWorstDishesData(sorted.slice(-10).reverse());

    // Hourly
    const hourMap: Record<string, { ventas: number; ordenes: number }> = {};
    (ordersData || []).forEach((o: any) => {
      const h = o.closed_at ? o.closed_at.substring(11, 13) + ':00' : '00:00';
      if (!hourMap[h]) hourMap[h] = { ventas: 0, ordenes: 0 };
      hourMap[h].ventas += Number(o.total);
      hourMap[h].ordenes += 1;
    });
    setHourlyData(Object.entries(hourMap).sort().map(([hora, v]) => ({ hora, ...v })));

    // Staff
    const staffMap: Record<string, { ordenes: number; ventasTotal: number }> = {};
    (ordersData || []).forEach((o: any) => {
      const m = o.mesero || 'Sin asignar';
      if (!staffMap[m]) staffMap[m] = { ordenes: 0, ventasTotal: 0 };
      staffMap[m].ordenes += 1;
      staffMap[m].ventasTotal += Number(o.total);
    });
    setStaffPerformanceData(
      Object.entries(staffMap).map(([nombre, v]) => ({
        nombre, rol: 'Mesero', ordenes: v.ordenes, horas: 8,
        ordenesHora: Math.round((v.ordenes / 8) * 10) / 10,
        ventasTotal: v.ventasTotal, satisfaccion: 0, turno: 'Mixto',
      }))
    );
  }, [dateRange, customStart, customEnd, supabase]);

  // ── Loader 2: COGS + peak predictions ──────────────────────────────────────
  const loadCOGSAndPeak = useCallback(async () => {
    const hoy    = new Date().toISOString().split('T')[0];
    const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const { data: recipes } = await supabase
      .from('dish_recipes')
      .select('dish_id, quantity, ingredients(name, cost, unit), dishes(name, price, category)');

    const { data: soldItems } = await supabase
      .from('order_items').select('name, qty').gte('created_at', hace30);

    if (recipes) {
      const costMap: Record<string, number> = {};
      const dishMeta: Record<string, { nombre: string; categoria: string; precioVenta: number }> = {};
      recipes.forEach((r: any) => {
        const id = r.dish_id;
        costMap[id] = (costMap[id] || 0) + Number(r.ingredients?.cost || 0) * Number(r.quantity || 0);
        if (r.dishes) dishMeta[id] = { nombre: r.dishes.name, categoria: r.dishes.category, precioVenta: Number(r.dishes.price) };
      });
      const soldMap: Record<string, number> = {};
      (soldItems || []).forEach((i: any) => { soldMap[i.name] = (soldMap[i.name] || 0) + i.qty; });

      const cogs: DishCOGS[] = Object.entries(dishMeta).map(([id, meta]) => {
        const costo = costMap[id] || 0;
        const margenBruto = meta.precioVenta - costo;
        const margenPct = meta.precioVenta > 0 ? (margenBruto / meta.precioVenta) * 100 : 0;
        const unidades = soldMap[meta.nombre] || 0;
        return { nombre: meta.nombre, categoria: meta.categoria, precioVenta: meta.precioVenta,
          costoIngredientes: costo, margenBruto, margenPct, unidadesVendidas: unidades,
          contribucionTotal: margenBruto * unidades };
      }).filter(d => d.precioVenta > 0).sort((a, b) => b.contribucionTotal - a.contribucionTotal);
      setCogsData(cogs);
    }

    // Peak predictions
    const { data: ordersHistory } = await supabase.from('orders')
      .select('total, closed_at').eq('status', 'cerrada').gte('closed_at', hace30);
    const hourMap: Record<string, number[]> = {};
    (ordersHistory || []).forEach((o: any) => {
      if (!o.closed_at) return;
      const h = o.closed_at.substring(11, 13) + ':00';
      if (!hourMap[h]) hourMap[h] = [];
      hourMap[h].push(Number(o.total));
    });

    const { data: todayOrders } = await supabase.from('orders')
      .select('total, closed_at').eq('status', 'cerrada').gte('closed_at', hoy);
    const todayMap: Record<string, number> = {};
    (todayOrders || []).forEach((o: any) => {
      if (!o.closed_at) return;
      const h = o.closed_at.substring(11, 13) + ':00';
      todayMap[h] = (todayMap[h] || 0) + Number(o.total);
    });

    setPeakChartData(Object.entries(hourMap).sort().map(([hora, vals]) => ({
      hora, actual: todayMap[hora] || 0,
      predicho: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      confianza: Math.min(95, 60 + vals.length * 2),
      recomendacion: vals.length > 5 ? 'Hora con historial suficiente' : 'Datos insuficientes',
    })));
  }, [supabase]);

  // ── Loader 3: Market basket analysis ───────────────────────────────────────
  const loadMarketBasket = useCallback(async () => {
    const now = new Date();
    let startISO: string;
    if (dateRange === 'hoy') {
      const s = new Date(now); s.setHours(0, 0, 0, 0); startISO = s.toISOString();
    } else if (dateRange === 'semana') {
      const s = new Date(now); s.setDate(now.getDate() - 7); startISO = s.toISOString();
    } else if (dateRange === 'mes') {
      startISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else {
      startISO = customStart ? new Date(customStart + 'T00:00:00').toISOString()
        : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    const { data: rawItems } = await supabase.from('order_items')
      .select('order_id, name, qty, price').gte('created_at', startISO).limit(5000);

    if (!rawItems || rawItems.length < 10) return;

    const orderMap: Record<string, { name: string; price: number }[]> = {};
    rawItems.forEach((item: any) => {
      if (!orderMap[item.order_id]) orderMap[item.order_id] = [];
      orderMap[item.order_id].push({ name: item.name, price: Number(item.price) });
    });

    const orders = Object.values(orderMap);
    const totalOrders = orders.length;
    if (totalOrders < 5) return;

    const pairMap: Record<string, { count: number; pa: number; pb: number }> = {};
    const itemCount: Record<string, number> = {};

    orders.forEach((items) => {
      const names = [...new Set(items.map((i) => i.name))];
      names.forEach(n => { itemCount[n] = (itemCount[n] || 0) + 1; });
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const key = [names[i], names[j]].sort().join('|||');
          if (!pairMap[key]) pairMap[key] = {
            count: 0,
            pa: items.find(x => x.name === names[i])?.price || 0,
            pb: items.find(x => x.name === names[j])?.price || 0,
          };
          pairMap[key].count += 1;
        }
      }
    });

    const pairs: BasketPair[] = Object.entries(pairMap)
      .filter(([, v]) => v.count >= 2)
      .map(([key, v]) => {
        const [a, b] = key.split('|||');
        const confAB = v.count / (itemCount[a] || 1);
        const lift = confAB / ((itemCount[b] || 1) / totalOrders);
        return { producto_a: a, producto_b: b, frecuencia: v.count,
          confianza: Math.round(confAB * 100) / 100,
          lift: Math.round(lift * 100) / 100,
          precio_a: v.pa, precio_b: v.pb };
      })
      .sort((a, b) => b.frecuencia - a.frecuencia)
      .slice(0, 15);

    if (pairs.length > 0) setBasketPairs(pairs);
  }, [dateRange, customStart, customEnd, supabase]);

  // ── Trigger all loaders ────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([loadReportData(), loadCOGSAndPeak(), loadMarketBasket()])
      .finally(() => setLoading(false));
  }, [loadReportData, loadCOGSAndPeak, loadMarketBasket]);

  return {
    topDishesData, worstDishesData, hourlyData, staffPerformanceData,
    cogsData, peakChartData, basketPairs, loading,
  };
}
