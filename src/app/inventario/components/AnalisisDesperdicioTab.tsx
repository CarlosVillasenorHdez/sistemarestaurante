'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingDown, AlertTriangle, CheckCircle, ShoppingCart, BarChart2, RefreshCw, ChevronDown, Info,  } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


// ─── Types ────────────────────────────────────────────────────────────────────

interface IngredientAnalysis {
  id: string;
  name: string;
  unit: string;
  category: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  cost: number;
  // Movement stats
  totalEntradas: number;
  totalSalidas: number;
  totalAjustes: number;
  movementCount: number;
  // Waste analysis
  wasteRatio: number; // salidas por caducidad / total entradas
  avgDailyUsage: number;
  daysOfStock: number;
  // Recommendation
  recommendation: 'comprar' | 'reducir' | 'ok' | 'revisar';
  recommendationDetail: string;
  // Trend data for chart
  trend: { date: string; entradas: number; salidas: number }[];
}

const RECOMMENDATION_CONFIG = {
  comprar: { label: 'Comprar más', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: ShoppingCart },
  reducir: { label: 'Reducir pedido', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: TrendingDown },
  ok: { label: 'Nivel óptimo', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', icon: CheckCircle },
  revisar: { label: 'Revisar desperdicio', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)', icon: AlertTriangle },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalisisDesperdicioTab() {
  const supabase = createClient();
  const [analyses, setAnalyses] = useState<IngredientAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterRec, setFilterRec] = useState<string>('todos');

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch ingredients
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('*')
        .order('name');

      // Fetch movements (last 90 days)
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('*, ingredients(name, unit)')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (!ingredients) { setLoading(false); return; }

      const mvByIngredient: Record<string, typeof movements> = {};
      (movements || []).forEach((m) => {
        if (!mvByIngredient[m.ingredient_id]) mvByIngredient[m.ingredient_id] = [];
        mvByIngredient[m.ingredient_id]!.push(m);
      });

      const result: IngredientAnalysis[] = ingredients.map((ing) => {
        const mvs = mvByIngredient[ing.id] || [];
        const entradas = mvs.filter((m) => m.movement_type === 'entrada');
        const salidas = mvs.filter((m) => m.movement_type === 'salida');
        const ajustes = mvs.filter((m) => m.movement_type === 'ajuste');

        const totalEntradas = entradas.reduce((s, m) => s + Number(m.quantity), 0);
        const totalSalidas = salidas.reduce((s, m) => s + Number(m.quantity), 0);
        const totalAjustes = ajustes.reduce((s, m) => s + Number(m.quantity), 0);

        // Waste: negative adjustments = likely expired/wasted
        const wasteAjustes = ajustes.filter((m) => Number(m.quantity) < 0);
        const wasteQty = Math.abs(wasteAjustes.reduce((s, m) => s + Number(m.quantity), 0));
        const wasteRatio = totalEntradas > 0 ? (wasteQty / totalEntradas) * 100 : 0;

        // Average daily usage (salidas over 90 days)
        const avgDailyUsage = totalSalidas / 90;
        const daysOfStock = avgDailyUsage > 0 ? Number(ing.stock) / avgDailyUsage : 999;

        // Recommendation logic
        let recommendation: IngredientAnalysis['recommendation'] = 'ok';
        let recommendationDetail = '';

        if (wasteRatio > 20) {
          recommendation = 'reducir';
          recommendationDetail = `${wasteRatio.toFixed(1)}% de desperdicio detectado. Reduce el volumen de compra o mejora la rotación.`;
        } else if (daysOfStock < 3 || Number(ing.stock) < Number(ing.min_stock)) {
          recommendation = 'comprar';
          recommendationDetail = `Stock para ${daysOfStock < 999 ? daysOfStock.toFixed(0) : '∞'} días. Está por debajo del mínimo recomendado.`;
        } else if (wasteRatio > 10) {
          recommendation = 'revisar';
          recommendationDetail = `${wasteRatio.toFixed(1)}% de desperdicio. Revisa fechas de caducidad y rotación FIFO.`;
        } else {
          recommendation = 'ok';
          recommendationDetail = `Stock para ${daysOfStock < 999 ? daysOfStock.toFixed(0) : '∞'} días. Nivel adecuado.`;
        }

        // Build trend data (group by week)
        const weekMap: Record<string, { entradas: number; salidas: number }> = {};
        mvs.forEach((m) => {
          const d = new Date(m.created_at);
          const week = `${d.getMonth() + 1}/${Math.ceil(d.getDate() / 7)}ª sem`;
          if (!weekMap[week]) weekMap[week] = { entradas: 0, salidas: 0 };
          if (m.movement_type === 'entrada') weekMap[week].entradas += Number(m.quantity);
          if (m.movement_type === 'salida') weekMap[week].salidas += Number(m.quantity);
        });
        const trend = Object.entries(weekMap).map(([date, v]) => ({ date, ...v }));

        return {
          id: ing.id,
          name: ing.name,
          unit: ing.unit,
          category: ing.category,
          currentStock: Number(ing.stock),
          minStock: Number(ing.min_stock),
          reorderPoint: Number(ing.reorder_point ?? 0),
          cost: Number(ing.cost),
          totalEntradas,
          totalSalidas,
          totalAjustes,
          movementCount: mvs.length,
          wasteRatio,
          avgDailyUsage,
          daysOfStock,
          recommendation,
          recommendationDetail,
          trend,
        };
      });

      setAnalyses(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  const filtered = useMemo(() => {
    if (filterRec === 'todos') return analyses;
    return analyses.filter((a) => a.recommendation === filterRec);
  }, [analyses, filterRec]);

  const selected = useMemo(() => analyses.find((a) => a.id === selectedId), [analyses, selectedId]);

  const summary = useMemo(() => ({
    comprar: analyses.filter((a) => a.recommendation === 'comprar').length,
    reducir: analyses.filter((a) => a.recommendation === 'reducir').length,
    revisar: analyses.filter((a) => a.recommendation === 'revisar').length,
    ok: analyses.filter((a) => a.recommendation === 'ok').length,
  }), [analyses]);

  return (
    <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['comprar', 'reducir', 'revisar', 'ok'] as const).map((rec) => {
          const cfg = RECOMMENDATION_CONFIG[rec];
          const Icon = cfg.icon;
          return (
            <button
              key={rec}
              onClick={() => setFilterRec(filterRec === rec ? 'todos' : rec)}
              className="rounded-xl p-4 text-left transition-all hover:brightness-110"
              style={{
                backgroundColor: filterRec === rec ? cfg.bg : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filterRec === rec ? cfg.border : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} style={{ color: cfg.color }} />
                <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{summary[rec]}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>insumos</p>
            </button>
          );
        })}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'rgba(255,255,255,0.6)' }}>
        <Info size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#818cf8' }} />
        <span>El análisis se basa en los últimos 90 días de movimientos de inventario. Los ajustes negativos se consideran desperdicio (caducidad, merma). Haz clic en un insumo para ver su historial detallado.</span>
      </div>

      {/* Refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          {filterRec === 'todos' ? `Todos los insumos (${filtered.length})` : `${RECOMMENDATION_CONFIG[filterRec as keyof typeof RECOMMENDATION_CONFIG]?.label} (${filtered.length})`}
        </h3>
        <button onClick={fetchAnalysis} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <BarChart2 size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No hay datos de movimientos para analizar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const cfg = RECOMMENDATION_CONFIG[a.recommendation];
            const Icon = cfg.icon;
            const isOpen = selectedId === a.id;
            return (
              <div key={a.id} className="rounded-xl overflow-hidden transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${isOpen ? cfg.border : 'rgba(255,255,255,0.08)'}` }}>
                {/* Row */}
                <button
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-white/5 transition-all"
                  onClick={() => setSelectedId(isOpen ? null : a.id)}
                >
                  {/* Recommendation badge */}
                  <div className="flex items-center gap-1.5 min-w-[130px]">
                    <Icon size={13} style={{ color: cfg.color }} />
                    <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{a.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.category}</p>
                  </div>
                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-xs">
                    <div className="text-center">
                      <p className="font-semibold text-white">{a.currentStock.toFixed(1)} {a.unit}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)' }}>Stock actual</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold" style={{ color: a.wasteRatio > 15 ? '#f87171' : a.wasteRatio > 5 ? '#fbbf24' : '#4ade80' }}>
                        {a.wasteRatio.toFixed(1)}%
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.4)' }}>Desperdicio</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-white">{a.daysOfStock < 999 ? `${a.daysOfStock.toFixed(0)}d` : '∞'}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)' }}>Días de stock</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-white">{a.movementCount}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)' }}>Movimientos</p>
                    </div>
                  </div>
                  <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'rgba(255,255,255,0.3)' }} />
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    {/* Recommendation detail */}
                    <div className="flex items-start gap-2.5 mt-4 mb-4 px-3 py-2.5 rounded-xl text-xs" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <Icon size={13} className="flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                      <span style={{ color: cfg.color }}>{a.recommendationDetail}</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Stats grid */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>Resumen de movimientos (90 días)</h4>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Entradas', value: `+${a.totalEntradas.toFixed(1)}`, color: '#4ade80' },
                            { label: 'Salidas', value: `-${a.totalSalidas.toFixed(1)}`, color: '#f87171' },
                            { label: 'Ajustes', value: `${a.totalAjustes >= 0 ? '+' : ''}${a.totalAjustes.toFixed(1)}`, color: '#818cf8' },
                          ].map((s) => (
                            <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                              <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label} {a.unit}</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Uso diario promedio</p>
                            <p className="text-sm font-bold text-white mt-0.5">{a.avgDailyUsage.toFixed(2)} {a.unit}/día</p>
                          </div>
                          <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Costo estimado desperdicio</p>
                            <p className="text-sm font-bold text-white mt-0.5">
                              ${((a.totalEntradas * (a.wasteRatio / 100)) * a.cost).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Trend chart */}
                      {a.trend.length > 0 ? (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Tendencia semanal</h4>
                          <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={a.trend} barSize={10}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#162d55', border: '1px solid #243f72', borderRadius: '8px', fontSize: '11px' }} />
                              <Bar dataKey="entradas" name="Entradas" fill="#4ade80" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="salidas" name="Salidas" fill="#f87171" radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', minHeight: '140px' }}>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin historial de movimientos</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
