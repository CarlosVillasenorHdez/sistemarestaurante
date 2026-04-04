'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingCart, TrendingDown, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


interface IngredientWaste {
  id: string;
  name: string;
  unit: string;
  category: string;
  currentStock: number;
  cost: number;
  totalEntradas: number;
  totalSalidas: number;
  wasteQty: number;
  wasteRatio: number;
  avgDailyUsage: number;
  daysOfStock: number;
  recommendation: 'comprar' | 'reducir' | 'ok' | 'revisar';
  estimatedWasteCost: number;
}

const REC_CONFIG = {
  comprar: { label: 'Comprar más', color: '#f59e0b', bg: '#fef3c7', Icon: ShoppingCart },
  reducir: { label: 'Reducir pedido', color: '#ef4444', bg: '#fee2e2', Icon: TrendingDown },
  ok: { label: 'Nivel óptimo', color: '#10b981', bg: '#d1fae5', Icon: CheckCircle },
  revisar: { label: 'Revisar desperdicio', color: '#8b5cf6', bg: '#ede9fe', Icon: AlertTriangle },
};

export default function WasteAnalysisSummary() {
  const supabase = createClient();
  const [items, setItems] = useState<IngredientWaste[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ingredients } = await supabase.from('ingredients').select('*').order('name');
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('*')
        .gte('created_at', since.toISOString());

      if (!ingredients) { setLoading(false); return; }

      const mvByIng: Record<string, typeof movements> = {};
      (movements || []).forEach((m) => {
        if (!mvByIng[m.ingredient_id]) mvByIng[m.ingredient_id] = [];
        mvByIng[m.ingredient_id]!.push(m);
      });

      const result: IngredientWaste[] = ingredients.map((ing) => {
        const mvs = mvByIng[ing.id] || [];
        const totalEntradas = mvs.filter((m) => m.movement_type === 'entrada').reduce((s, m) => s + Number(m.quantity), 0);
        const totalSalidas = mvs.filter((m) => m.movement_type === 'salida').reduce((s, m) => s + Number(m.quantity), 0);
        const wasteAjustes = mvs.filter((m) => m.movement_type === 'ajuste' && Number(m.quantity) < 0);
        const wasteQty = Math.abs(wasteAjustes.reduce((s, m) => s + Number(m.quantity), 0));
        const wasteRatio = totalEntradas > 0 ? (wasteQty / totalEntradas) * 100 : 0;
        const avgDailyUsage = totalSalidas / 90;
        const daysOfStock = avgDailyUsage > 0 ? Number(ing.stock) / avgDailyUsage : 999;
        const estimatedWasteCost = wasteQty * Number(ing.cost);

        let recommendation: IngredientWaste['recommendation'] = 'ok';
        if (wasteRatio > 20) recommendation = 'reducir';
        else if (daysOfStock < 3 || Number(ing.stock) < Number(ing.min_stock)) recommendation = 'comprar';
        else if (wasteRatio > 10) recommendation = 'revisar';

        return {
          id: ing.id, name: ing.name, unit: ing.unit, category: ing.category,
          currentStock: Number(ing.stock), cost: Number(ing.cost),
          totalEntradas, totalSalidas, wasteQty, wasteRatio, avgDailyUsage, daysOfStock,
          recommendation, estimatedWasteCost,
        };
      });

      setItems(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summary = useMemo(() => ({
    comprar: items.filter((i) => i.recommendation === 'comprar').length,
    reducir: items.filter((i) => i.recommendation === 'reducir').length,
    revisar: items.filter((i) => i.recommendation === 'revisar').length,
    ok: items.filter((i) => i.recommendation === 'ok').length,
    totalWasteCost: items.reduce((s, i) => s + i.estimatedWasteCost, 0),
  }), [items]);

  const chartData = useMemo(() =>
    items
      .filter((i) => i.wasteRatio > 0 || i.recommendation !== 'ok')
      .sort((a, b) => b.wasteRatio - a.wasteRatio)
      .slice(0, 10)
      .map((i) => ({ name: i.name.length > 14 ? i.name.slice(0, 14) + '…' : i.name, desperdicio: parseFloat(i.wasteRatio.toFixed(1)), costo: parseFloat(i.estimatedWasteCost.toFixed(0)) })),
    [items]);

  const topWaste = useMemo(() => items.filter((i) => i.recommendation === 'reducir' || i.recommendation === 'revisar').sort((a, b) => b.estimatedWasteCost - a.estimatedWasteCost).slice(0, 5), [items]);
  const needBuy = useMemo(() => items.filter((i) => i.recommendation === 'comprar').slice(0, 5), [items]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-lg animate-pulse bg-gray-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {(['comprar', 'reducir', 'revisar', 'ok'] as const).map((rec) => {
          const cfg = REC_CONFIG[rec];
          const Icon = cfg.Icon;
          return (
            <div key={rec} className="rounded-xl p-3 text-center" style={{ backgroundColor: cfg.bg }}>
              <Icon size={16} className="mx-auto mb-1" style={{ color: cfg.color }} />
              <p className="text-xl font-bold" style={{ color: cfg.color }}>{summary[rec]}</p>
              <p className="text-xs mt-0.5 text-gray-600">{cfg.label}</p>
            </div>
          );
        })}
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: '#fef2f2' }}>
          <p className="text-xs text-gray-500 mb-1">Costo desperdicio est.</p>
          <p className="text-xl font-bold text-red-600">${summary.totalWasteCost.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-500">últimos 90 días</p>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg text-xs text-gray-600" style={{ backgroundColor: '#eff6ff', borderLeft: '3px solid #3b82f6' }}>
        <Info size={13} className="flex-shrink-0 mt-0.5 text-blue-500" />
        Análisis basado en los últimos 90 días de movimientos. Los ajustes negativos se contabilizan como desperdicio (caducidad/merma). Ve a <strong className="mx-1">Inventario → Análisis de Desperdicio</strong> para el detalle completo por insumo.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        {chartData.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">% Desperdicio por insumo (top 10)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical" barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} width={90} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Desperdicio']} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="desperdicio" fill="#f87171" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tables */}
        <div className="space-y-4">
          {/* Top waste */}
          {topWaste.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">⚠️ Mayor desperdicio — reducir pedido</h3>
              <div className="space-y-1.5">
                {topWaste.map((i) => (
                  <div key={i.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: '#fef2f2' }}>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{i.name}</p>
                      <p className="text-xs text-gray-500">{i.wasteRatio.toFixed(1)}% desperdicio</p>
                    </div>
                    <p className="text-xs font-bold text-red-600">-${i.estimatedWasteCost.toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Need to buy */}
          {needBuy.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">🛒 Stock bajo — comprar urgente</h3>
              <div className="space-y-1.5">
                {needBuy.map((i) => (
                  <div key={i.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: '#fffbeb' }}>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{i.name}</p>
                      <p className="text-xs text-gray-500">{i.currentStock.toFixed(1)} {i.unit} disponibles</p>
                    </div>
                    <p className="text-xs font-bold text-amber-600">{i.daysOfStock < 999 ? `${i.daysOfStock.toFixed(0)}d` : '∞'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topWaste.length === 0 && needBuy.length === 0 && (
            <div className="flex items-center gap-2 p-4 rounded-lg" style={{ backgroundColor: '#f0fdf4' }}>
              <CheckCircle size={16} className="text-green-500" />
              <p className="text-sm text-green-700">¡Inventario en buen estado! No se detectaron problemas críticos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
