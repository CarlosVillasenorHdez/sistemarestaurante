'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Upload, ImageOff, ToggleLeft, ToggleRight,
  ChevronDown, UtensilsCrossed, BookOpen, FlaskConical, Minus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAudit } from '@/hooks/useAudit';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Category =
  | 'Todas' | 'Entradas' | 'Platos Fuertes' | 'Postres' | 'Bebidas' | 'Extras';

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Exclude<Category, 'Todas'>;
  available: boolean;
  image: string | null;
  imageAlt: string;
  emoji: string;
  popular: boolean;
  preparationTimeMin?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  category: string;
  cost: number;
}

export interface RecipeItem {
  id?: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  notes: string;
}

const CATEGORIES: Category[] = [
  'Todas', 'Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Extras',
];

const CATEGORY_COLORS: Record<Exclude<Category, 'Todas'>, string> = {
  Entradas: 'bg-green-900/40 text-green-300 border border-green-700/40',
  'Platos Fuertes': 'bg-amber-900/40 text-amber-300 border border-amber-700/40',
  Postres: 'bg-pink-900/40 text-pink-300 border border-pink-700/40',
  Bebidas: 'bg-blue-900/40 text-blue-300 border border-blue-700/40',
  Extras: 'bg-purple-900/40 text-purple-300 border border-purple-700/40',
};

const emptyForm = (): Omit<Dish, 'id'> => ({
  name: '', description: '', price: 0, category: 'Entradas',
  available: true, image: null, imageAlt: '', emoji: '', popular: false, preparationTimeMin: 15,
});

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DishSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
      <div className="h-36" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded-lg w-3/4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <div className="h-3 rounded-lg w-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <div className="h-3 rounded-lg w-2/3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <div className="h-8 rounded-lg w-full mt-4" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4" style={{ backgroundColor: '#162d55', border: '2px dashed rgba(255,255,255,0.12)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
        <UtensilsCrossed size={28} style={{ color: '#f59e0b' }} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-white mb-1">No hay platillos en el menú</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Agrega tu primer platillo para comenzar a construir el menú del restaurante.</p>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
        <Plus size={16} />Agregar primer platillo
      </button>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ dish, onConfirm, onCancel }: { dish: Dish; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
            <Trash2 size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Eliminar platillo</h3>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
          ¿Estás seguro de que deseas eliminar <span className="font-semibold text-white">"{dish.name}"</span>?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Recipe Modal ─────────────────────────────────────────────────────────────

function RecipeModal({ dish, onClose, onPriceUpdate }: { dish: Dish; onClose: () => void; onPriceUpdate: (dishId: string, newPrice: number) => void }) {
  const supabase = createClient();
  const { log: auditLog } = useAudit();
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIngId, setSelectedIngId] = useState('');
  const [addQty, setAddQty] = useState<number>(0);
  const [addNotes, setAddNotes] = useState('');
  const [simulatorPrice, setSimulatorPrice] = useState<number>(dish.price);
  const [laborCost, setLaborCost]       = useState<number>(0);
  const [overheadCost, setOverheadCost]   = useState<number>(0);
  const [overheadPct, setOverheadPct]     = useState<number>(35);
  const [costConfigLoaded, setCostConfigLoaded] = useState(false);

  const fetchRecipe = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dish_recipes')
      .select('*, ingredients(name, unit, cost)')
      .eq('dish_id', dish.id)
      .order('created_at');
    if (data) {
      setRecipe(data.map((r: any) => ({
        id: r.id,
        ingredientId: r.ingredient_id,
        ingredientName: r.ingredients?.name ?? '',
        quantity: Number(r.quantity),
        unit: r.unit || r.ingredients?.unit || '',
        notes: r.notes ?? '',
        costPerUnit: Number(r.ingredients?.cost ?? 0),
      })));
    }
    setLoading(false);
  }, [dish.id]);

  // Load labor + overhead costs from pre-calculated view
  const fetchCostBreakdown = useCallback(async () => {
    const { data } = await supabase
      .from('v_dish_cost_summary')
      .select('labor_cost, overhead_cost, overhead_pct, ingredient_cost')
      .eq('dish_id', dish.id)
      .single();
    if (data) {
      setLaborCost(Number((data as any).labor_cost ?? 0));
      setOverheadPct(Number((data as any).overhead_pct ?? 35));
      // Overhead recalculated dynamically from current simulatorPrice below
    }
    setCostConfigLoaded(true);
  }, [dish.id, supabase]);

  useEffect(() => {
    fetchRecipe();
    fetchCostBreakdown();
    supabase.from('ingredients').select('id, name, unit, category, cost').order('name').then(({ data }) => {
      if (data) setAllIngredients(data.map((i: any) => ({ id: i.id, name: i.name, unit: i.unit, category: i.category, cost: Number(i.cost ?? 0) })));
    });
  }, [fetchRecipe]);

  const selectedIng = allIngredients.find((i) => i.id === selectedIngId);

  // Cost calculations
  const totalCost = recipe.reduce((sum, item) => {
    const costPerUnit = (item as any).costPerUnit ?? 0;
    return sum + costPerUnit * item.quantity;
  }, 0);

  const primeCost  = totalCost + laborCost;                           // food + MO directa
  const dynamicOverhead = simulatorPrice > 0 ? simulatorPrice * (overheadPct / 100) : overheadCost;
  const totalRealCost = primeCost + dynamicOverhead;                 // costo total real
  const currentMargin = simulatorPrice > 0 ? ((simulatorPrice - totalCost) / simulatorPrice) * 100 : 0;
  const realMargin    = simulatorPrice > 0 ? ((simulatorPrice - totalRealCost) / simulatorPrice) * 100 : 0;
  const currentProfit = simulatorPrice - totalCost;
  const realProfit    = simulatorPrice - totalRealCost;
  const foodCostPct   = simulatorPrice > 0 ? (totalCost / simulatorPrice) * 100 : 0;
  const primeCostPct  = simulatorPrice > 0 ? (primeCost / simulatorPrice) * 100 : 0;

  const handleApplyPrice = async () => {
    if (simulatorPrice <= 0) return;
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { error } = await supabase
        .from('dishes')
        .update({ price: simulatorPrice, updated_at: new Date().toISOString() })
        .eq('id', dish.id);
      if (error) throw error;
      await auditLog({
        action: 'precio_cambiado', entity: 'dishes', entityId: dish.id,
        entityName: dish.name,
        oldValue: { price: dish.price },
        newValue: { price: simulatorPrice },
        details: `Precio cambiado de $${dish.price.toFixed(2)} a $${simulatorPrice.toFixed(2)}`,
      });
      onPriceUpdate(dish.id, simulatorPrice);
      alert(`Precio de ${dish.name} actualizado a $${simulatorPrice.toFixed(2)} en el menú.`);
    } catch (err: any) {
      alert('Error al actualizar precio: ' + (err?.message ?? 'Intenta de nuevo'));
    }
  };

  const getMarginColor = (pct: number) => {
    if (pct >= 65) return '#34d399';
    if (pct >= 45) return '#f59e0b';
    return '#f87171';
  };
  const getMarginLabel = (pct: number) => {
    if (pct >= 65) return 'Excelente';
    if (pct >= 45) return 'Aceptable';
    if (pct >= 25) return 'Bajo';
    return 'Crítico';
  };

  // Suggested prices: solve for price that gives target REAL margin
  // Formula: price = primeCost / (1 - overheadPct/100 - targetMargin/100)
  // This ensures overhead % and margin % are both respected
  function priceForRealMargin(targetMarginPct: number): number {
    const denominator = 1 - (overheadPct / 100) - (targetMarginPct / 100);
    if (denominator <= 0) return 0;
    return Math.ceil(primeCost / denominator);
  }
  const suggestedPrices = [
    { label: '15% margen real', targetMargin: 15, color: '#f59e0b' },
    { label: '25% margen real', targetMargin: 25, color: '#34d399' },
    { label: '35% margen real', targetMargin: 35, color: '#22c55e' },
  ];

  const handleAddIngredient = async () => {
    if (!selectedIngId || addQty <= 0) return;
    const already = recipe.find((r) => r.ingredientId === selectedIngId);
    if (already) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('dish_recipes').insert({
        dish_id: dish.id,
        ingredient_id: selectedIngId,
        quantity: addQty,
        unit: selectedIng?.unit ?? '',
        notes: addNotes,
      });
      if (error) throw error;
      setSelectedIngId('');
      setAddQty(0);
      setAddNotes('');
      await fetchRecipe();
    } catch (err: any) {
      // toast not available inside RecipeModal scope — use alert as fallback
      alert('Error al agregar ingrediente: ' + (err?.message ?? 'Intenta de nuevo'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQty = async (recipeId: string, qty: number) => {
    if (qty <= 0) return;
    const { error } = await supabase.from('dish_recipes').update({ quantity: qty, updated_at: new Date().toISOString() }).eq('id', recipeId);
    if (error) { alert('Error al actualizar cantidad: ' + error.message); return; }
    setRecipe((prev) => prev.map((r) => r.id === recipeId ? { ...r, quantity: qty } : r));
  };

  const handleRemove = async (recipeId: string) => {
    const { error } = await supabase.from('dish_recipes').delete().eq('id', recipeId);
    if (error) { alert('Error al eliminar ingrediente: ' + error.message); return; }
    setRecipe((prev) => prev.filter((r) => r.id !== recipeId));
  };

  const availableIngredients = allIngredients.filter((i) => !recipe.find((r) => r.ingredientId === i.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
              <FlaskConical size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Receta & Costos: {dish.name}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Ingredientes, porciones y simulador de precio</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Add ingredient row */}
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>Agregar ingrediente a la receta</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Ingrediente</label>
                <div className="relative">
                  <select
                    value={selectedIngId}
                    onChange={(e) => { setSelectedIngId(e.target.value); setAddQty(0); }}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                  >
                    <option value="" style={{ backgroundColor: '#162d55' }}>— Seleccionar —</option>
                    {availableIngredients.map((i) => (
                      <option key={i.id} value={i.id} style={{ backgroundColor: '#162d55' }}>{i.name} ({i.unit}) — ${i.cost.toFixed(2)}/{i.unit}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Cantidad {selectedIng ? `(${selectedIng.unit})` : ''}
                  {selectedIng && addQty > 0 && (
                    <span className="ml-2" style={{ color: '#f59e0b' }}>= ${(selectedIng.cost * addQty).toFixed(2)}</span>
                  )}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={addQty || ''}
                  onChange={(e) => setAddQty(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Notas (opcional)</label>
              <input
                type="text"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Ej. finamente picado, sin semillas..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
              />
            </div>
            <button
              onClick={handleAddIngredient}
              disabled={!selectedIngId || addQty <= 0 || saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}
            >
              <Plus size={14} />
              {saving ? 'Guardando...' : 'Agregar a receta'}
            </button>
          </div>

          {/* Recipe list */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Ingredientes de la receta ({recipe.length})
            </p>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                ))}
              </div>
            ) : recipe.length === 0 ? (
              <div className="rounded-xl py-10 flex flex-col items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                <FlaskConical size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Sin ingredientes en la receta</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Agrega ingredientes para calcular el costo del platillo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recipe.map((item) => {
                  const itemCost = ((item as any).costPerUnit ?? 0) * item.quantity;
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.ingredientName}</p>
                        {item.notes && <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => item.id && handleUpdateQty(item.id, Math.max(0.01, item.quantity - 0.1))}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          <Minus size={11} />
                        </button>
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={item.quantity}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setRecipe((prev) => prev.map((r) => r.id === item.id ? { ...r, quantity: v } : r));
                          }}
                          onBlur={(e) => item.id && handleUpdateQty(item.id, parseFloat(e.target.value) || 0)}
                          className="w-16 text-center text-sm rounded-lg px-1 py-1 outline-none"
                          style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                        />
                        <button
                          onClick={() => item.id && handleUpdateQty(item.id, item.quantity + 0.1)}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          <Plus size={11} />
                        </button>
                        <span className="text-xs w-8 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.unit}</span>
                      </div>
                      {/* Cost per line */}
                      <div className="text-right flex-shrink-0 w-16">
                        <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>${itemCost.toFixed(2)}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>${((item as any).costPerUnit ?? 0).toFixed(2)}/{item.unit}</p>
                      </div>
                      <button
                        onClick={() => item.id && handleRemove(item.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20 flex-shrink-0"
                        style={{ color: 'rgba(239,68,68,0.6)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Cost Summary & Price Simulator ── */}
          {recipe.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>

              {/* ── Bloque 1: Resumen de Costos ── */}
              <div className="px-5 pt-4 pb-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>¿Cuánto te cuesta hacerlo?</p>

                {/* Costo de ingredientes — siempre visible */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">🥩 Ingredientes</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Materias primas de la receta</p>
                  </div>
                  <p className="text-lg font-bold font-mono" style={{ color: '#f87171' }}>${totalCost.toFixed(2)}</p>
                </div>

                {/* Breakdown de ingredientes colapsable */}
                <div className="space-y-1 mb-3 pl-2 border-l" style={{ borderColor: 'rgba(248,113,113,0.3)' }}>
                  {recipe.map((item) => {
                    const itemCost = ((item as any).costPerUnit ?? 0) * item.quantity;
                    const pct = totalCost > 0 ? (itemCost / totalCost) * 100 : 0;
                    return (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="text-xs flex-1 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.ingredientName}</span>
                        <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'rgba(248,113,113,0.7)' }} />
                        </div>
                        <span className="text-xs font-mono w-12 text-right" style={{ color: 'rgba(255,255,255,0.45)' }}>${itemCost.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* MO Directa */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">👨‍🍳 Mano de Obra</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Cocinero · {(dish as any).preparationTimeMin ?? 15} min de preparación</p>
                  </div>
                  <p className="text-lg font-bold font-mono" style={{ color: '#fb923c' }}>
                    {costConfigLoaded ? `$${laborCost.toFixed(2)}` : '…'}
                  </p>
                </div>

                {/* Divisor Prime Cost */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg mb-2" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>Costo directo total</p>
                  <p className="text-base font-bold font-mono" style={{ color: '#f59e0b' }}>${primeCost.toFixed(2)}</p>
                </div>

                {/* Gastos indirectos */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-white">🏠 Gastos del negocio</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Renta, servicios, marketing · {overheadPct.toFixed(0)}% del precio de venta</p>
                  </div>
                  <p className="text-lg font-bold font-mono" style={{ color: '#a78bfa' }}>
                    {costConfigLoaded ? `$${dynamicOverhead.toFixed(2)}` : '…'}
                  </p>
                </div>

                {/* Costo Real Total — destacado */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div>
                    <p className="text-base font-bold text-white">Costo real total</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Lo mínimo que debes cobrar para no perder</p>
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">${totalRealCost.toFixed(2)}</p>
                </div>
              </div>

              {/* ── Bloque 2: Simulador de Precio ── */}
              <div className="px-5 pt-4 pb-5 border-t space-y-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>¿A cuánto lo vendes?</p>

                {/* Precio selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Precio de venta</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>$</span>
                      <input
                        type="number" min={0} step={1}
                        value={simulatorPrice || ''}
                        onChange={(e) => setSimulatorPrice(parseFloat(e.target.value) || 0)}
                        className="w-24 text-right px-2 py-1.5 rounded-lg text-lg font-bold outline-none"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={totalRealCost > 0 ? Math.round(totalRealCost) : 0}
                    max={Math.max(totalRealCost * 4, dish.price * 2, 300)}
                    step={1}
                    value={simulatorPrice}
                    onChange={(e) => setSimulatorPrice(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: realMargin >= 20 ? '#22c55e' : realMargin >= 10 ? '#f59e0b' : '#ef4444' }}
                  />
                </div>

                {/* Resultado principal — Lo que se lleva */}
                <div className="rounded-xl px-4 py-4" style={{
                  backgroundColor: realMargin >= 20 ? 'rgba(34,197,94,0.1)' : realMargin >= 10 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${realMargin >= 20 ? 'rgba(34,197,94,0.3)' : realMargin >= 10 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`
                }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold" style={{ color: realMargin >= 20 ? '#22c55e' : realMargin >= 10 ? '#f59e0b' : '#ef4444' }}>
                      {realMargin >= 20 ? '✅ Buen precio' : realMargin >= 10 ? '⚠️ Margen ajustado' : realMargin >= 0 ? '🔴 Margen muy bajo' : '❌ Perdiendo dinero'}
                    </p>
                    <p className="text-2xl font-bold font-mono" style={{ color: realMargin >= 20 ? '#22c55e' : realMargin >= 10 ? '#f59e0b' : '#ef4444' }}>
                      {realMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Te quedas de ganancia:</span>
                    <span className="font-bold font-mono text-white">${realProfit.toFixed(2)} por platillo</span>
                  </div>
                  {/* Visual bar */}
                  <div className="mt-3">
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(Math.max(realMargin, 0), 100)}%`,
                          backgroundColor: realMargin >= 20 ? '#22c55e' : realMargin >= 10 ? '#f59e0b' : '#ef4444'
                        }} />
                    </div>
                    <div className="flex justify-between mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      <span>0%</span><span>10%</span><span>20%</span><span>35%</span><span>50%+</span>
                    </div>
                  </div>
                </div>

                {/* Desglose de hacia dónde va cada peso */}
                {simulatorPrice > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>De cada ${simulatorPrice.toFixed(0)} que cobras:</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Ingredientes', amount: totalCost, pct: foodCostPct, color: '#f87171' },
                        { label: 'Mano de obra', amount: laborCost, pct: simulatorPrice > 0 ? (laborCost/simulatorPrice)*100 : 0, color: '#fb923c' },
                        { label: 'Gastos del negocio', amount: dynamicOverhead, pct: overheadPct, color: '#a78bfa' },
                        { label: 'Tu ganancia', amount: realProfit, pct: realMargin, color: realMargin >= 0 ? '#22c55e' : '#ef4444' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center gap-3">
                          <span className="text-xs w-32 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>{row.label}</span>
                          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Math.max(row.pct, 0), 100)}%`, backgroundColor: row.color }} />
                          </div>
                          <span className="text-xs font-mono w-10 text-right" style={{ color: row.color }}>{Math.max(row.pct, 0).toFixed(0)}%</span>
                          <span className="text-xs font-mono w-14 text-right" style={{ color: 'rgba(255,255,255,0.5)' }}>${Math.max(row.amount, 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Precios sugeridos */}
                {primeCost > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Precios recomendados:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {suggestedPrices.map((s) => {
                        const price = priceForRealMargin(s.targetMargin);
                        if (price <= 0) return null;
                        return (
                          <button
                            key={s.label}
                            onClick={() => setSimulatorPrice(price)}
                            className="flex flex-col items-center py-2.5 px-2 rounded-xl text-center transition-all hover:brightness-110"
                            style={{ backgroundColor: `${s.color}18`, border: `1px solid ${s.color}40` }}
                          >
                            <span className="text-base font-bold font-mono" style={{ color: s.color }}>${price}</span>
                            <span className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.targetMargin}% ganancia</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Precio actual vs recomendado */}
                {dish.price > 0 && totalRealCost > 0 && (
                  <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Precio actual en menú</p>
                        <p className="text-lg font-bold font-mono text-white">${dish.price.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Ganancia real actual</p>
                        {(() => {
                          const currentOverhead = dish.price * (overheadPct / 100);
                          const currentRealCost = primeCost + currentOverhead;
                          const currentRealMargin = ((dish.price - currentRealCost) / dish.price) * 100;
                          const currentRealProfit = dish.price - currentRealCost;
                          return (
                            <div>
                              <p className="text-lg font-bold font-mono" style={{ color: currentRealMargin >= 20 ? '#22c55e' : currentRealMargin >= 10 ? '#f59e0b' : '#ef4444' }}>
                                {currentRealMargin.toFixed(1)}% · ${currentRealProfit.toFixed(2)}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#243f72' }}>
          <p className="text-xs flex-1 self-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Costo real = ingredientes + mano de obra directa (salario cocineros ÷ tiempo prep) + gastos indirectos prorateados. Configurable en Parámetros de Operación.
          </p>
          {simulatorPrice !== dish.price && simulatorPrice > 0 && (
            <button
              onClick={handleApplyPrice}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:brightness-110"
              style={{ backgroundColor: '#22c55e', color: 'white' }}
            >
              ✓ Aplicar ${simulatorPrice.toFixed(2)} al menú
            </button>
          )}
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dish Form Modal ──────────────────────────────────────────────────────────

function DishFormModal({ dish, onSave, onClose }: { dish: Dish | null; onSave: (data: Omit<Dish, 'id'>) => void; onClose: () => void }) {
  const isEdit = dish !== null;
  const [form, setForm] = useState<Omit<Dish, 'id'>>(
    dish ? { name: dish.name, description: dish.description, price: dish.price, category: dish.category, available: dish.available, image: dish.image, imageAlt: dish.imageAlt, emoji: dish.emoji, popular: dish.popular, preparationTimeMin: (dish as any).preparationTimeMin ?? 15 }
      : emptyForm()
  );
  const [errors, setErrors] = useState<Partial<Record<keyof Omit<Dish, 'id'>, string>>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(dish?.image ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      set('image', result);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = 'El nombre es requerido';
    if (form.price <= 0) errs.price = 'El precio debe ser mayor a 0';
    if (!form.description.trim()) errs.description = 'La descripción es requerida';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
          <div>
            <h2 className="font-bold text-white text-lg">{isEdit ? 'Editar platillo' : 'Agregar platillo'}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{isEdit ? `Modificando: ${dish.name}` : 'Nuevo platillo al menú'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Imagen del platillo</label>
            <div className="relative w-full h-36 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer group transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.15)' }} onClick={() => fileRef.current?.click()}>
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Vista previa del platillo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                    <Upload size={16} className="text-white" />
                    <span className="text-white text-sm">Cambiar imagen</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <ImageOff size={28} />
                  <span className="text-xs">Haz clic para subir imagen</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>JPG, PNG, WEBP · Máx 5 MB</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre del platillo <span className="text-red-400">*</span></label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Tacos de Res (3 pzas)" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: errors.name ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Descripción <span className="text-red-400">*</span></label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe los ingredientes y preparación..." rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all resize-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: errors.description ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
            {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Precio (MXN) <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>$</span>
                <input type="number" min={0} step={0.5} value={form.price || ''} onChange={(e) => set('price', parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm outline-none transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: errors.price ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
              </div>
              {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Categoría</label>
              <div className="relative">
                <select value={form.category} onChange={(e) => set('category', e.target.value as Dish['category'])} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                  {CATEGORIES.filter((c) => c !== 'Todas').map((c) => (
                    <option key={c} value={c} style={{ backgroundColor: '#162d55' }}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </div>
            </div>
          </div>
          {/* Preparation time */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
              ⏱️ Tiempo de preparación (minutos)
            </label>
            <input
              type="number" min={1} max={120} step={1}
              value={(form as any).preparationTimeMin ?? 15}
              onChange={(e) => set('preparationTimeMin' as any, parseInt(e.target.value) || 15)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
            />
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              El KDS usa este tiempo para mostrar alertas de demora en cocina
            </p>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <p className="text-sm font-semibold text-white">Disponible en menú</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{form.available ? 'Visible para los clientes' : 'Oculto del menú activo'}</p>
            </div>
            <button type="button" onClick={() => set('available', !form.available)} className="transition-all">
              {form.available ? <ToggleRight size={32} style={{ color: '#f59e0b' }} /> : <ToggleLeft size={32} style={{ color: 'rgba(255,255,255,0.3)' }} />}
            </button>
          </div>
        </form>
        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#243f72' }}>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
          <button type="button" onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
            {isEdit ? 'Guardar cambios' : 'Agregar platillo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dish Card ────────────────────────────────────────────────────────────────

function DishCard({ dish, recipeCount, onEdit, onDelete, onToggle, onRecipe }: {
  dish: Dish;
  recipeCount: number;
  onEdit: (d: Dish) => void;
  onDelete: (d: Dish) => void;
  onToggle: (id: string) => void;
  onRecipe: (d: Dish) => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:translate-y-[-2px]" style={{ backgroundColor: '#162d55', border: '1px solid #243f72', opacity: dish.available ? 1 : 0.65 }}>
      <div className="relative h-36 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
        {dish.image ? (
          <img src={dish.image} alt={dish.imageAlt} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <span className="text-4xl">{dish.emoji}</span>
          </div>
        )}
        <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[dish.category]}`} style={{ fontSize: '10px' }}>{dish.category}</span>
        {recipeCount > 0 && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', fontSize: '10px' }}>
            {recipeCount} ing.
          </span>
        )}
        {!dish.available && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.85)', color: 'white' }}>No disponible</span>
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-white text-sm leading-snug flex-1">{dish.name}</h3>
          <span className="font-bold flex-shrink-0" style={{ color: '#f59e0b', fontSize: '15px' }}>${dish.price.toFixed(0)}</span>
        </div>
        <p className="text-xs leading-relaxed flex-1 mb-3 line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{dish.description}</p>
        {/* Recipe button */}
        <button
          onClick={() => onRecipe(dish)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all mb-2 w-full justify-center"
          style={{ backgroundColor: recipeCount > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', color: recipeCount > 0 ? '#34d399' : 'rgba(255,255,255,0.4)', border: recipeCount > 0 ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.08)' }}
        >
          <BookOpen size={12} />
          {recipeCount > 0 ? `Receta (${recipeCount} ingredientes)` : 'Agregar receta'}
        </button>
        <div className="flex items-center gap-2 mt-auto">
          <button onClick={() => onToggle(dish.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 justify-center" style={{ backgroundColor: dish.available ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)', color: dish.available ? '#f59e0b' : 'rgba(255,255,255,0.4)', border: dish.available ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,255,255,0.08)' }}>
            {dish.available ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {dish.available ? 'Disponible' : 'No disponible'}
          </button>
          <button onClick={() => onEdit(dish)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} title="Editar platillo"><Pencil size={13} /></button>
          <button onClick={() => onDelete(dish)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/20" style={{ color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.15)' }} title="Eliminar platillo"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MenuManagement() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('Todas');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [deletingDish, setDeletingDish] = useState<Dish | null>(null);
  const [recipeDish, setRecipeDish] = useState<Dish | null>(null);
  const [recipeCounts, setRecipeCounts] = useState<Record<string, number>>({});

  const supabase = createClient();

  const fetchDishes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('dishes').select('*').order('category').order('name');
    if (error) {
      alert('Error al cargar el menú: ' + error.message);
      setLoading(false);
      return;
    }
    if (data) {
      const mapped = data.map((d) => ({
        id: d.id, name: d.name, description: d.description, price: Number(d.price),
        category: d.category as Exclude<Category, 'Todas'>, available: d.available,
        image: d.image, imageAlt: d.image_alt, emoji: d.emoji, popular: d.popular,
      }));
      setDishes(mapped);
      // Fetch recipe counts
      const { data: recipeData } = await supabase.from('dish_recipes').select('dish_id');
      if (recipeData) {
        const counts: Record<string, number> = {};
        recipeData.forEach((r: any) => { counts[r.dish_id] = (counts[r.dish_id] || 0) + 1; });
        setRecipeCounts(counts);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchDishes(); }, [fetchDishes]);

  const filtered = dishes.filter((d) => {
    const matchCat = activeCategory === 'Todas' || d.category === activeCategory;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const counts: Record<Category, number> = {
    Todas: dishes.length,
    Entradas: dishes.filter((d) => d.category === 'Entradas').length,
    'Platos Fuertes': dishes.filter((d) => d.category === 'Platos Fuertes').length,
    Postres: dishes.filter((d) => d.category === 'Postres').length,
    Bebidas: dishes.filter((d) => d.category === 'Bebidas').length,
    Extras: dishes.filter((d) => d.category === 'Extras').length,
  };

  const availableCount = dishes.filter((d) => d.available).length;
  const dishesWithRecipe = Object.keys(recipeCounts).length;

  const [saving, setSaving] = useState(false);

  const handleSave = async (data: Omit<Dish, 'id'>) => {
    setSaving(true);
    try {
      if (editingDish) {
        const { error } = await supabase.from('dishes').update({
          name: data.name, description: data.description, price: data.price,
          category: data.category, available: data.available, image: data.image,
          image_alt: data.imageAlt, emoji: data.emoji, popular: data.popular,
          preparation_time_min: (data as any).preparationTimeMin ?? 15,
          updated_at: new Date().toISOString(),
        }).eq('id', editingDish.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('dishes').insert({
          name: data.name, description: data.description, price: data.price,
          category: data.category, available: data.available, image: data.image,
          image_alt: data.imageAlt, emoji: data.emoji, popular: data.popular,
          preparation_time_min: (data as any).preparationTimeMin ?? 15,
        });
        if (error) throw error;
      }
      setFormOpen(false);
      setEditingDish(null);
      await fetchDishes();
    } catch (err: any) {
      const action = editingDish ? 'actualizar' : 'agregar';
      alert(`Error al ${action} platillo: ${err?.message ?? 'Intenta de nuevo'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDish) return;
    const { error } = await supabase.from('dishes').delete().eq('id', deletingDish.id);
    if (error) { alert('Error al eliminar platillo: ' + error.message); return; }
    setDeletingDish(null);
    await fetchDishes();
  };

  const { log: auditLog } = useAudit();

  const handleToggle = async (id: string) => {
    const dish = dishes.find((d) => d.id === id);
    if (!dish) return;
    // Optimistic update
    setDishes((prev) => prev.map((d) => d.id === id ? { ...d, available: !d.available } : d));
    const { error } = await supabase.from('dishes').update({ available: !dish.available, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      // Revert on failure
      setDishes((prev) => prev.map((d) => d.id === id ? { ...d, available: dish.available } : d));
      alert('Error al cambiar disponibilidad: ' + error.message);
    }
  };

  const openAdd = () => { setEditingDish(null); setFormOpen(true); };
  const openEdit = (dish: Dish) => { setEditingDish(dish); setFormOpen(true); };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total platillos', value: loading ? '—' : String(dishes.length), color: '#f59e0b' },
          { label: 'Disponibles', value: loading ? '—' : String(availableCount), color: '#34d399' },
          { label: 'Con receta', value: loading ? '—' : String(dishesWithRecipe), color: '#818cf8' },
          { label: 'Sin receta', value: loading ? '—' : String(dishes.length - dishesWithRecipe), color: '#f87171' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar platillo..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#162d55', border: '1px solid #243f72', color: 'white' }} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 flex-shrink-0" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
          <Plus size={16} />Agregar platillo
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0" style={{ backgroundColor: activeCategory === cat ? '#f59e0b' : 'rgba(255,255,255,0.06)', color: activeCategory === cat ? '#1B3A6B' : 'rgba(255,255,255,0.6)', border: activeCategory === cat ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
            {cat}
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: activeCategory === cat ? 'rgba(27,58,107,0.3)' : 'rgba(255,255,255,0.1)', color: activeCategory === cat ? '#1B3A6B' : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '10px' }}>
              {loading ? '…' : counts[cat]}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <DishSkeleton key={i} />)}
        </div>
      ) : dishes.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20 gap-3" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
          <ImageOff size={36} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {search ? `Sin resultados para "${search}"` : 'No hay platillos en esta categoría'}
          </p>
          {!search && (
            <button onClick={openAdd} className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <Plus size={14} />Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              recipeCount={recipeCounts[dish.id] || 0}
              onEdit={openEdit}
              onDelete={setDeletingDish}
              onToggle={handleToggle}
              onRecipe={setRecipeDish}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {formOpen && <DishFormModal dish={editingDish} onSave={handleSave} onClose={() => { setFormOpen(false); setEditingDish(null); }} />}
      {deletingDish && <DeleteConfirmModal dish={deletingDish} onConfirm={handleDelete} onCancel={() => setDeletingDish(null)} />}
      {recipeDish && (
        <RecipeModal
          dish={recipeDish}
          onClose={() => { setRecipeDish(null); fetchDishes(); }}
          onPriceUpdate={(dishId, newPrice) => {
            setDishes(prev => prev.map(d => d.id === dishId ? { ...d, price: newPrice } : d));
            setRecipeDish(null);
            fetchDishes();
          }}
        />
      )}
    </div>
  );
}