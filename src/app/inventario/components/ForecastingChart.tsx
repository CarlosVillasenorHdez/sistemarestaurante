'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,  } from 'recharts';
import { TrendingDown, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Ingredient {
  id: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
}

interface ForecastPoint {
  day: string;
  date: string;
  [ingredientName: string]: number | string;
}

interface IngredientForecast {
  ingredient: Ingredient;
  avgDailyConsumption: number;
  daysUntilCritical: number | null;
  forecastData: { day: string; stock: number }[];
}

const COLORS = [
  '#f59e0b', '#60a5fa', '#34d399', '#f87171', '#a78bfa',
  '#fb923c', '#38bdf8', '#4ade80', '#e879f9', '#facc15',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 shadow-xl" style={{ backgroundColor: '#162d55', border: '1px solid #243f72', minWidth: 160 }}>
      <p className="text-xs font-bold text-white mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 text-xs mb-1">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono font-semibold text-white">{Number(entry.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ForecastingChart() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [forecasts, setForecasts] = useState<IngredientForecast[]>([]);
  const [chartData, setChartData] = useState<ForecastPoint[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const buildForecasts = useCallback(async () => {
    setLoading(true);

    // 1. Fetch all ingredients
    const { data: ingData, error: ingError } = await supabase
      .from('ingredients')
      .select('id, name, stock, unit, min_stock')
      .order('name');

    if (ingError) {
      toast.error('Error al cargar ingredientes para pronóstico.');
      setLoading(false);
      return;
    }

    const ings: Ingredient[] = (ingData ?? []).map((i: any) => ({
      id: i.id,
      name: i.name,
      stock: Number(i.stock),
      unit: i.unit,
      minStock: Number(i.min_stock),
    }));

    if (ings.length === 0) {
      setLoading(false);
      return;
    }

    // 2. Fetch last 30 days of "salida" movements to compute daily consumption
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data: movData, error: movError } = await supabase
      .from('stock_movements')
      .select('ingredient_id, quantity, created_at')
      .eq('movement_type', 'salida')
      .gte('created_at', since.toISOString());

    if (movError) {
      toast.error('Error al cargar historial de movimientos para pronóstico.');
      setLoading(false);
      return;
    }

    // 3. Group salidas by ingredient and by day to get daily consumption
    const consumptionByIngredient: Record<string, Record<string, number>> = {};
    for (const mv of movData ?? []) {
      const day = mv.created_at.slice(0, 10); // YYYY-MM-DD
      if (!consumptionByIngredient[mv.ingredient_id]) {
        consumptionByIngredient[mv.ingredient_id] = {};
      }
      consumptionByIngredient[mv.ingredient_id][day] =
        (consumptionByIngredient[mv.ingredient_id][day] ?? 0) + Number(mv.quantity);
    }

    // 4. Build forecasts per ingredient
    const newForecasts: IngredientForecast[] = [];

    for (const ing of ings) {
      const dailyMap = consumptionByIngredient[ing.id] ?? {};
      const dailyValues = Object.values(dailyMap);

      // Average daily consumption (if no data, assume 0)
      const avgDaily =
        dailyValues.length > 0
          ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length
          : 0;

      // Project 7 days forward
      const forecastData: { day: string; stock: number }[] = [];
      let projectedStock = ing.stock;

      for (let d = 0; d <= 7; d++) {
        const date = new Date();
        date.setDate(date.getDate() + d);
        const label =
          d === 0
            ? 'Hoy' : date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });

        forecastData.push({ day: label, stock: Math.max(0, projectedStock) });
        projectedStock -= avgDaily;
      }

      // Days until stock hits minStock
      let daysUntilCritical: number | null = null;
      if (avgDaily > 0 && ing.stock > ing.minStock) {
        daysUntilCritical = Math.floor((ing.stock - ing.minStock) / avgDaily);
      }

      newForecasts.push({ ingredient: ing, avgDailyConsumption: avgDaily, daysUntilCritical, forecastData });
    }

    // Sort: ingredients with soonest critical first, then by name
    newForecasts.sort((a, b) => {
      if (a.daysUntilCritical !== null && b.daysUntilCritical !== null)
        return a.daysUntilCritical - b.daysUntilCritical;
      if (a.daysUntilCritical !== null) return -1;
      if (b.daysUntilCritical !== null) return 1;
      return a.ingredient.name.localeCompare(b.ingredient.name);
    });

    setIngredients(ings);
    setForecasts(newForecasts);

    // Default: show top 5 ingredients with consumption data
    const withConsumption = newForecasts
      .filter((f) => f.avgDailyConsumption > 0)
      .slice(0, 5)
      .map((f) => f.ingredient.id);
    const defaultSelection =
      withConsumption.length > 0
        ? withConsumption
        : newForecasts.slice(0, 3).map((f) => f.ingredient.id);
    setSelectedIngredients(defaultSelection);

    // Build combined chart data (days as rows, ingredients as columns)
    const days = newForecasts[0]?.forecastData.map((p) => p.day) ?? [];
    const combined: ForecastPoint[] = days.map((day, idx) => {
      const point: ForecastPoint = { day, date: day };
      for (const fc of newForecasts) {
        point[fc.ingredient.name] = fc.forecastData[idx]?.stock ?? 0;
      }
      return point;
    });
    setChartData(combined);

    setLoading(false);
  }, []);

  useEffect(() => {
    buildForecasts();
  }, [buildForecasts]);

  function toggleIngredient(id: string) {
    setSelectedIngredients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const selectedForecasts = forecasts.filter((f) =>
    selectedIngredients.includes(f.ingredient.id)
  );

  const criticalCount = forecasts.filter(
    (f) => f.daysUntilCritical !== null && f.daysUntilCritical <= 7
  ).length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Calculando pronóstico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Pronóstico de Stock — Próximos 7 días</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Basado en el consumo diario promedio de los últimos 30 días
          </p>
        </div>
        <button
          onClick={buildForecasts}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80"
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ backgroundColor: '#132240', border: '1px solid #243f72' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Ingredientes analizados</p>
          <p className="text-2xl font-bold text-white">{forecasts.length}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: criticalCount > 0 ? 'rgba(239,68,68,0.08)' : '#132240', border: criticalCount > 0 ? '1px solid rgba(239,68,68,0.25)' : '1px solid #243f72' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: criticalCount > 0 ? '#f87171' : 'rgba(255,255,255,0.4)' }}>
            Críticos en 7 días
          </p>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && <AlertTriangle size={18} className="text-red-400" />}
            <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-white'}`}>{criticalCount}</p>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#132240', border: '1px solid #243f72' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Con consumo registrado</p>
          <p className="text-2xl font-bold text-white">
            {forecasts.filter((f) => f.avgDailyConsumption > 0).length}
          </p>
        </div>
      </div>

      {/* Chart */}
      {selectedForecasts.length > 0 ? (
        <div className="rounded-xl p-5" style={{ backgroundColor: '#132240', border: '1px solid #243f72' }}>
          <p className="text-sm font-semibold text-white mb-4">Nivel de stock proyectado</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
              <XAxis
                dataKey="day"
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                axisLine={{ stroke: '#243f72' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', paddingTop: 12 }}
              />
              {selectedForecasts.map((fc, idx) => (
                <Line
                  key={fc.ingredient.id}
                  type="monotone"
                  dataKey={fc.ingredient.name}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS[idx % COLORS.length] }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-xl p-8 flex flex-col items-center gap-3" style={{ backgroundColor: '#132240', border: '1px solid #243f72' }}>
          <TrendingDown size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Selecciona al menos un ingrediente para ver el pronóstico
          </p>
        </div>
      )}

      {/* Ingredient selector + detail table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #243f72' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#132240', borderBottom: '1px solid #243f72' }}>
          <p className="text-sm font-semibold text-white">Detalle por ingrediente</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Selecciona para mostrar en la gráfica
          </p>
        </div>
        <div style={{ backgroundColor: '#0f1e38' }}>
          {forecasts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No hay ingredientes registrados</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ backgroundColor: '#132240' }}>
                <tr className="border-b" style={{ borderColor: '#243f72' }}>
                  {['', 'Ingrediente', 'Stock actual', 'Consumo/día', 'Día 3', 'Día 7', 'Días hasta crítico', 'Estado'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forecasts.map((fc, idx) => {
                  const isSelected = selectedIngredients.includes(fc.ingredient.id);
                  const color = COLORS[forecasts.indexOf(fc) % COLORS.length];
                  const day3Stock = fc.forecastData[3]?.stock ?? 0;
                  const day7Stock = fc.forecastData[7]?.stock ?? 0;
                  const isCriticalSoon = fc.daysUntilCritical !== null && fc.daysUntilCritical <= 7;
                  const isAlreadyCritical = fc.ingredient.stock < fc.ingredient.minStock;

                  return (
                    <tr
                      key={fc.ingredient.id}
                      className="border-b transition-colors hover:bg-white/5 cursor-pointer"
                      style={{ borderColor: '#1a2f52', backgroundColor: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                      onClick={() => toggleIngredient(fc.ingredient.id)}
                    >
                      <td className="px-4 py-3">
                        <div
                          className="w-3 h-3 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: isSelected ? color : 'transparent',
                            borderColor: isSelected ? color : 'rgba(255,255,255,0.25)',
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-white">{fc.ingredient.name}</span>
                        <span className="text-xs ml-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{fc.ingredient.unit}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-mono font-semibold ${isAlreadyCritical ? 'text-red-400' : 'text-white'}`}>
                          {fc.ingredient.stock.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono" style={{ color: fc.avgDailyConsumption > 0 ? '#f59e0b' : 'rgba(255,255,255,0.3)' }}>
                          {fc.avgDailyConsumption > 0 ? `-${fc.avgDailyConsumption.toFixed(2)}` : 'Sin datos'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-mono ${day3Stock <= fc.ingredient.minStock ? 'text-red-400' : 'text-white'}`}>
                          {day3Stock.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-mono ${day7Stock <= fc.ingredient.minStock ? 'text-red-400' : 'text-white'}`}>
                          {day7Stock.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isAlreadyCritical ? (
                          <span className="text-xs font-semibold text-red-400">Ya crítico</span>
                        ) : fc.daysUntilCritical === null ? (
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                        ) : (
                          <span className={`text-sm font-mono font-semibold ${isCriticalSoon ? 'text-red-400' : fc.daysUntilCritical <= 14 ? 'text-amber-400' : 'text-green-400'}`}>
                            {fc.daysUntilCritical} días
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAlreadyCritical ? (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold w-fit" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                            <AlertTriangle size={10} />Crítico
                          </span>
                        ) : isCriticalSoon ? (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold w-fit" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                            <AlertTriangle size={10} />Urgente
                          </span>
                        ) : fc.avgDailyConsumption === 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold w-fit" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                            Sin consumo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold w-fit" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>
                            <CheckCircle size={10} />OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
