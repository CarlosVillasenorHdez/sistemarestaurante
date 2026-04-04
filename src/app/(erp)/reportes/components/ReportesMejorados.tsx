'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, Users, AlertTriangle, BarChart3, Package, Award, ChevronDown } from 'lucide-react';

type Period = 'dia' | 'semana' | 'mes';

interface SalesTrend {
  label: string;
  ventas: number;
  ordenes: number;
}

interface WaiterStats {
  mesero: string;
  ordenes: number;
  total: number;
  ticketPromedio: number;
}

interface ProductStats {
  nombre: string;
  cantidad: number;
  ingresos: number;
}

interface LowStockItem {
  nombre: string;
  stock: number;
  minStock: number;
  unit: string;
}

export default function ReportesMejorados() {
  const supabase = createClient();
  const [period, setPeriod] = useState<Period>('semana');
  const [loading, setLoading] = useState(true);
  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>([]);
  const [waiterStats, setWaiterStats] = useState<WaiterStats[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
  const [bottomProducts, setBottomProducts] = useState<ProductStats[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [kpis, setKpis] = useState({ totalVentas: 0, totalOrdenes: 0, ticketPromedio: 0, totalClientes: 0 });

  const getDateRange = useCallback((p: Period) => {
    const now = new Date();
    const end = now.toISOString();
    let start: string;
    if (p === 'dia') {
      const d = new Date(now); d.setHours(0, 0, 0, 0);
      start = d.toISOString();
    } else if (p === 'semana') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      start = d.toISOString();
    } else {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      start = d.toISOString();
    }
    return { start, end };
  }, []);

  const loadData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(p);

      // Load closed orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, mesero, total, subtotal, created_at, closed_at')
        .eq('status', 'cerrada')
        .gte('created_at', start)
        .lte('created_at', end);
      if (error) throw error;

      const orderList = orders || [];

      // KPIs
      const totalVentas = orderList.reduce((s, o) => s + Number(o.total), 0);
      const totalOrdenes = orderList.length;
      const ticketPromedio = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;
      setKpis({ totalVentas, totalOrdenes, ticketPromedio, totalClientes: totalOrdenes });

      // Sales trend
      const trendMap: Record<string, { ventas: number; ordenes: number }> = {};
      orderList.forEach(o => {
        const date = new Date(o.created_at);
        let key: string;
        if (p === 'dia') {
          key = `${String(date.getHours()).padStart(2, '0')}:00`;
        } else if (p === 'semana') {
          key = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
        } else {
          key = `${date.getDate()}/${date.getMonth() + 1}`;
        }
        if (!trendMap[key]) trendMap[key] = { ventas: 0, ordenes: 0 };
        trendMap[key].ventas += Number(o.total);
        trendMap[key].ordenes += 1;
      });
      setSalesTrend(Object.entries(trendMap).map(([label, v]) => ({ label, ...v })));

      // Waiter stats
      const waiterMap: Record<string, { ordenes: number; total: number }> = {};
      orderList.forEach(o => {
        const w = o.mesero || 'Sin asignar';
        if (!waiterMap[w]) waiterMap[w] = { ordenes: 0, total: 0 };
        waiterMap[w].ordenes += 1;
        waiterMap[w].total += Number(o.total);
      });
      setWaiterStats(
        Object.entries(waiterMap)
          .map(([mesero, v]) => ({ mesero, ...v, ticketPromedio: v.ordenes > 0 ? v.total / v.ordenes : 0 }))
          .sort((a, b) => b.total - a.total)
      );

      // Product stats from order_items
      const orderIds = orderList.map(o => o.id);
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('name, qty, price')
          .in('order_id', orderIds.slice(0, 100)); // limit for performance

        const productMap: Record<string, { cantidad: number; ingresos: number }> = {};
        (items || []).forEach((item: any) => {
          const n = item.name;
          if (!productMap[n]) productMap[n] = { cantidad: 0, ingresos: 0 };
          productMap[n].cantidad += item.qty;
          productMap[n].ingresos += item.qty * Number(item.price);
        });
        const sorted = Object.entries(productMap)
          .map(([nombre, v]) => ({ nombre, ...v }))
          .sort((a, b) => b.cantidad - a.cantidad);
        setTopProducts(sorted.slice(0, 8));
        setBottomProducts(sorted.slice(-5).reverse());
      } else {
        setTopProducts([]);
        setBottomProducts([]);
      }

      // Low stock
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('name, stock, min_stock, unit')
        .order('stock');
      const low = (ingredients || [])
        .filter((i: any) => Number(i.stock) <= Number(i.min_stock))
        .map((i: any) => ({ nombre: i.name, stock: Number(i.stock), minStock: Number(i.min_stock), unit: i.unit }));
      setLowStock(low);
    } catch (err: any) {
      toast.error('Error al cargar reportes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, getDateRange]);

  useEffect(() => { loadData(period); }, [period, loadData]);

  const PERIOD_LABELS: Record<Period, string> = { dia: 'Hoy', semana: 'Esta Semana', mes: 'Este Mes' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['dia', 'semana', 'mes'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p ? 'text-white' : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'}`}
            style={period === p ? { backgroundColor: '#1B3A6B' } : {}}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ventas Totales', value: `$${kpis.totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#10b981' },
          { label: 'Órdenes', value: kpis.totalOrdenes, icon: ShoppingCart, color: '#1B3A6B' },
          { label: 'Ticket Promedio', value: `$${kpis.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: '#f59e0b' },
          { label: 'Alertas Inventario', value: lowStock.length, icon: AlertTriangle, color: lowStock.length > 0 ? '#ef4444' : '#6b7280' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: k.color + '15' }}>
              <k.icon size={20} style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="text-lg font-bold text-gray-800">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 size={18} style={{ color: '#1B3A6B' }} />
          Tendencia de Ventas — {PERIOD_LABELS[period]}
        </h3>
        {salesTrend.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sin datos para el período seleccionado</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={salesTrend}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B3A6B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1B3A6B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Ventas']} />
              <Area type="monotone" dataKey="ventas" stroke="#1B3A6B" fill="url(#salesGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiter performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} style={{ color: '#f59e0b' }} />
            Ticket Promedio por Mesero
          </h3>
          {waiterStats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {waiterStats.map((w, i) => (
                <div key={w.mesero} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#cd7f32' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 truncate">{w.mesero}</span>
                      <span className="text-sm font-bold text-gray-800">${w.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (w.total / (waiterStats[0]?.total || 1)) * 100)}%`, backgroundColor: '#1B3A6B' }} />
                      </div>
                      <span className="text-xs text-gray-400">{w.ordenes} órd.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Alertas de Inventario Bajo
            {lowStock.length > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{lowStock.length} alertas</span>
            )}
          </h3>
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package size={32} className="text-green-400 mb-2" />
              <p className="text-sm text-green-600 font-medium">Inventario en niveles óptimos</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lowStock.map(item => (
                <div key={item.nombre} className="flex items-center gap-3 p-2 rounded-lg bg-red-50">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>
                    <p className="text-xs text-red-600">Stock: {item.stock} {item.unit} / Mín: {item.minStock} {item.unit}</p>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5 flex-shrink-0">
                    <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${Math.min(100, (item.stock / (item.minStock || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top & Bottom products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Award size={18} style={{ color: '#10b981' }} />
            Productos Más Vendidos
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos de ventas</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v: any) => [v, 'Unidades']} />
                <Bar dataKey="cantidad" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ChevronDown size={18} className="text-red-500" />
            Productos Menos Vendidos
          </h3>
          {bottomProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos de ventas</p>
          ) : (
            <div className="space-y-2">
              {bottomProducts.map((p, i) => (
                <div key={p.nombre} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-400">${p.ingresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <span className="text-sm font-medium text-red-500">{p.cantidad} uds.</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
