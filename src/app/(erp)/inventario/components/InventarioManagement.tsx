'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, X, AlertTriangle, Package, BoxSelect, History, ExternalLink, Phone, TrendingDown, TrendingUp, ArrowDownCircle, ArrowUpCircle, RefreshCw, Bell, Scale, BarChart2, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import AnalisisDesperdicioTab from '@/app/(erp)/inventario/components/AnalisisDesperdicioTab';
import ForecastingChart from '@/app/(erp)/inventario/components/ForecastingChart';


// ─── Types ────────────────────────────────────────────────────────────────────

type UnitType = 'kg' | 'lt' | 'pz' | 'g' | 'ml' | 'caja';
type Category = 'Todas' | 'Carnes' | 'Verduras' | 'Lácteos' | 'Bebidas' | 'Abarrotes' | 'Especias';
type MovementType = 'entrada' | 'salida' | 'ajuste';
type ActiveTab = 'inventario' | 'movimientos' | 'alertas' | 'equivalencias' | 'analisis' | 'pronostico';
type Ingredient = {
  id: string;
  name: string;
  category: Exclude<Category, 'Todas'>;
  stock: number;
  unit: UnitType;
  minStock: number;
  reorderPoint: number;
  cost: number;
  supplier: string;
  supplierUrl: string;
  supplierPhone: string;
  notes: string;
};
type StockMovement = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  movementType: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdBy: string;
  createdAt: string;
  unit: string;
};
type UnitEquivalence = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: string;
  bulkUnit: string;
  bulkDescription: string;
  subUnit: string;
  subUnitDescription: string;
  conversionFactor: number;
  notes: string;
};
const CATEGORIES: Category[] = ['Todas', 'Carnes', 'Verduras', 'Lácteos', 'Bebidas', 'Abarrotes', 'Especias'];
const UNITS: UnitType[] = ['kg', 'lt', 'pz', 'g', 'ml', 'caja'];
const UNIT_LABELS: Record<UnitType, string> = {
  kg: 'Kilogramos (kg)', lt: 'Litros (lt)', pz: 'Piezas (pz)',
  g: 'Gramos (g)', ml: 'Mililitros (ml)', caja: 'Cajas (caja)',
};
const CATEGORY_COLORS: Record<Exclude<Category, 'Todas'>, string> = {
  Carnes: 'bg-red-900/40 text-red-300',
  Verduras: 'bg-green-900/40 text-green-300',
  Lácteos: 'bg-blue-900/40 text-blue-300',
  Bebidas: 'bg-purple-900/40 text-purple-300',
  Abarrotes: 'bg-yellow-900/40 text-yellow-300',
  Especias: 'bg-orange-900/40 text-orange-300',
};
const MOVEMENT_COLORS: Record<MovementType, { bg: string; text: string; icon: React.ReactNode }> = {
  entrada: { bg: 'bg-green-900/30 text-green-300', text: 'Entrada', icon: <ArrowDownCircle size={13} className="text-green-400" /> },
  salida: { bg: 'bg-red-900/30 text-red-300', text: 'Salida', icon: <ArrowUpCircle size={13} className="text-red-400" /> },
  ajuste: { bg: 'bg-blue-900/30 text-blue-300', text: 'Ajuste', icon: <RefreshCw size={13} className="text-blue-400" /> },
};
const emptyForm = (): Omit<Ingredient, 'id'> => ({
  name: '', category: 'Abarrotes', stock: 0, unit: 'kg', minStock: 0, reorderPoint: 0,
  cost: 0, supplier: '', supplierUrl: '', supplierPhone: '', notes: '',
});
const emptyMovementForm = () => ({
  ingredientId: '',
  movementType: 'entrada' as MovementType,
  quantity: 0,
  reason: '',
  createdBy: 'Administrador',
});
const emptyEquivForm = () => ({
  ingredientId: '',
  bulkUnit: '',
  bulkDescription: '',
  subUnit: '',
  subUnitDescription: '',
  conversionFactor: 1,
  notes: '',
});
// ─── Skeleton ────────────────────────────────────────────────────────────────

function RowSkeleton({ cols = 9 }: { cols?: number }) {
  return (
    <tr className="border-b animate-pulse" style={{ borderColor: '#243f72' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.07)', width: i === 0 ? '120px' : '80px' }} />
        </td>
      ))}
    </tr>
  );
}
// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <tr>
      <td colSpan={9} className="py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
            <BoxSelect size={28} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-base font-semibold text-white mb-1">No hay ingredientes registrados</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Agrega ingredientes para llevar el control de tu inventario.</p>
          </div>
          <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
            <Plus size={16} />Agregar primer ingrediente
          </button>
        </div>
      </td>
    </tr>
  );
}
// ─── Stock Level Bar ──────────────────────────────────────────────────────────

function StockBar({ stock, minStock, reorderPoint }: { stock: number; minStock: number; reorderPoint: number }) {
  const max = Math.max(reorderPoint * 2, stock * 1.2, minStock * 3, 1);
  const pct = Math.min((stock / max) * 100, 100);
  const isLow = stock < minStock;
  const isNearReorder = stock < reorderPoint && !isLow;
  const color = isLow ? '#ef4444' : isNearReorder ? '#f59e0b' : '#22c55e';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
// ─── Component ────────────────────────────────────────────────────────────────

export default function InventarioManagement() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [equivalences, setEquivalences] = useState<UnitEquivalence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loadingEquiv, setLoadingEquiv] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('Todas');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventario');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Ingredient, 'id'>>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof Omit<Ingredient, 'id'>, string>>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState(emptyMovementForm());
  const [historyIngredientId, setHistoryIngredientId] = useState<string | null>(null);
  // Equivalences state
  const [equivModalOpen, setEquivModalOpen] = useState(false);
  const [equivForm, setEquivForm] = useState(emptyEquivForm());
  const [equivEditId, setEquivEditId] = useState<string | null>(null);
  const [deleteEquivId, setDeleteEquivId] = useState<string | null>(null);
  const supabase = createClient();
  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ingredients').select('*').order('category').order('name');
    if (error) {
      toast.error('Error al cargar inventario. Verifica tu conexión.');
      setLoading(false);
      return;
    }
    if (data) {
      setIngredients(data.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category as Exclude<Category, 'Todas'>,
        stock: Number(i.stock),
        unit: i.unit as UnitType,
        minStock: Number(i.min_stock),
        reorderPoint: Number(i.reorder_point ?? 0),
        cost: Number(i.cost),
        supplier: i.supplier,
        supplierUrl: i.supplier_url ?? '',
        supplierPhone: i.supplier_phone ?? '',
        notes: i.notes ?? '',
      })));
    }
    setLoading(false);
  }, []);
  const fetchMovements = useCallback(async (ingredientId?: string) => {
    setLoadingMovements(true);
    let query = supabase
      .from('stock_movements')
      .select('*, ingredients(name, unit)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (ingredientId) query = query.eq('ingredient_id', ingredientId);
    const { data, error } = await query;
    if (error) {
      toast.error('Error al cargar movimientos de inventario.');
      setLoadingMovements(false);
      return;
    }
    if (data) {
      setMovements(data.map((m) => ({
        id: m.id,
        ingredientId: m.ingredient_id,
        ingredientName: (m.ingredients as { name: string; unit: string })?.name ?? '',
        movementType: m.movement_type as MovementType,
        quantity: Number(m.quantity),
        previousStock: Number(m.previous_stock),
        newStock: Number(m.new_stock),
        reason: m.reason,
        createdBy: m.created_by,
        createdAt: m.created_at,
        unit: (m.ingredients as { name: string; unit: string })?.unit ?? '',
      })));
    }
    setLoadingMovements(false);
  }, []);
  const fetchEquivalences = useCallback(async () => {
    setLoadingEquiv(true);
    const { data } = await supabase.from('unit_equivalences').select('*, ingredients(name, unit)').order('created_at');
    if (data) {
      setEquivalences(data.map((e: any) => ({
        id: e.id, ingredientId: e.ingredient_id,
        ingredientName: e.ingredients?.name ?? '',
        ingredientUnit: e.ingredients?.unit ?? '',
        bulkUnit: e.bulk_unit, bulkDescription: e.bulk_description,
        subUnit: e.sub_unit, subUnitDescription: e.sub_unit_description,
        conversionFactor: Number(e.conversion_factor), notes: e.notes ?? '',
      })));
    }
    setLoadingEquiv(false);
  }, []);
  useEffect(() => { fetchIngredients(); }, [fetchIngredients]);
  useEffect(() => {
    if (activeTab === 'movimientos') fetchMovements(historyIngredientId ?? undefined);
    if (activeTab === 'equivalencias') fetchEquivalences();
  }, [activeTab, historyIngredientId, fetchMovements, fetchEquivalences]);
  const lowStockItems = useMemo(() => ingredients.filter((i) => i.stock < i.minStock), [ingredients]);

  // ── Export purchase order CSV ─────────────────────────────────────────────
  const handleExportPurchaseOrder = () => {
    const items = [...lowStockItems, ...reorderItems.filter(r => !lowStockItems.find(l => l.id === r.id))];
    if (items.length === 0) { toast.info('No hay ingredientes que requieran compra'); return; }
    const now = new Date().toLocaleDateString('es-MX');
    const headers = ['Ingrediente', 'Stock Actual', 'Stock Mínimo', 'Unidad', 'Cantidad a Pedir', 'Proveedor', 'Teléfono', 'URL'];
    const rows = items.map(ing => [
      ing.name,
      ing.stock,
      ing.minStock,
      ing.unit,
      Math.max(0, ing.minStock * 2 - ing.stock), // suggest 2x min
      ing.supplier || '',
      ing.supplierPhone || '',
      ing.supplierUrl || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lista-compras-${now}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Lista de compras exportada (${items.length} ingredientes)`);
  };
  const reorderItems = useMemo(() => ingredients.filter((i) => i.stock < i.reorderPoint && i.stock >= i.minStock), [ingredients]);
  const filtered = useMemo(() => {
    return ingredients.filter((ing) => {
      const matchesSearch = ing.name.toLowerCase().includes(search.toLowerCase()) || ing.supplier.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'Todas' || ing.category === activeCategory;
      const matchesLow = !filterLowStock || ing.stock < ing.minStock;
      return matchesSearch && matchesCategory && matchesLow;
    });
  }, [ingredients, search, activeCategory, filterLowStock]);
  function openAdd() { setEditingId(null); setForm(emptyForm()); setFormErrors({}); setModalOpen(true); }
  function openEdit(ing: Ingredient) {
    setEditingId(ing.id);
    setForm({
      name: ing.name, category: ing.category, stock: ing.stock, unit: ing.unit,
      minStock: ing.minStock, reorderPoint: ing.reorderPoint, cost: ing.cost,
      supplier: ing.supplier, supplierUrl: ing.supplierUrl, supplierPhone: ing.supplierPhone, notes: ing.notes,
    });
    setFormErrors({});
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditingId(null); setForm(emptyForm()); setFormErrors({}); }
  function validate(): boolean {
    const errors: Partial<Record<keyof Omit<Ingredient, 'id'>, string>> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido';
    if (form.stock < 0) errors.stock = 'El stock no puede ser negativo';
    if (form.minStock < 0) errors.minStock = 'El mínimo no puede ser negativo';
    if (form.cost < 0) errors.cost = 'El costo no puede ser negativo';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }
  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        const ing = ingredients.find((i) => i.id === editingId);
        const oldStock = ing?.stock ?? 0;
        const { error } = await supabase.from('ingredients').update({
          name: form.name, category: form.category, stock: form.stock, unit: form.unit,
          min_stock: form.minStock, reorder_point: form.reorderPoint, cost: form.cost,
          supplier: form.supplier, supplier_url: form.supplierUrl, supplier_phone: form.supplierPhone,
          notes: form.notes, updated_at: new Date().toISOString(),
        }).eq('id', editingId);
        if (error) throw error;
        if (oldStock !== form.stock) {
          await supabase.from('stock_movements').insert({
            ingredient_id: editingId,
            movement_type: 'ajuste',
            quantity: Math.abs(form.stock - oldStock),
            previous_stock: oldStock,
            new_stock: form.stock,
            reason: 'Ajuste manual desde inventario',
            created_by: 'Administrador',
          });
        }
        toast.success('Ingrediente actualizado');
      } else {
        const { data, error } = await supabase.from('ingredients').insert({
          name: form.name, category: form.category, stock: form.stock, unit: form.unit,
          min_stock: form.minStock, reorder_point: form.reorderPoint, cost: form.cost,
          supplier: form.supplier, supplier_url: form.supplierUrl, supplier_phone: form.supplierPhone,
          notes: form.notes,
        }).select().single();
        if (error) throw error;
        if (data && form.stock > 0) {
          await supabase.from('stock_movements').insert({
            ingredient_id: data.id,
            movement_type: 'entrada',
            quantity: form.stock,
            previous_stock: 0,
            new_stock: form.stock,
            reason: 'Stock inicial',
            created_by: 'Administrador',
          });
        }
        toast.success('Ingrediente creado');
      }
      closeModal();
      await fetchIngredients();
    } catch (err: any) {
      toast.error('Error al guardar: ' + (err?.message ?? 'Intenta de nuevo'));
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('ingredients').delete().eq('id', deleteId);
    if (error) { toast.error('Error al eliminar: ' + error.message); return; }
    toast.success('Ingrediente eliminado');
    setDeleteId(null);
    await fetchIngredients();
  }
  async function handleMovementSave() {
    if (!movementForm.ingredientId || movementForm.quantity <= 0) return;
    const ing = ingredients.find((i) => i.id === movementForm.ingredientId);
    if (!ing) return;
    const delta = movementForm.movementType === 'salida' ? -movementForm.quantity : movementForm.quantity;
    const newStock = Math.max(0, ing.stock + delta);
    await supabase.from('stock_movements').insert({
      ingredient_id: movementForm.ingredientId,
      movement_type: movementForm.movementType,
      quantity: movementForm.quantity,
      previous_stock: ing.stock,
      new_stock: newStock,
      reason: movementForm.reason,
      created_by: movementForm.createdBy,
    });
    await supabase.from('ingredients').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', movementForm.ingredientId);
    setMovementModalOpen(false);
    setMovementForm(emptyMovementForm());
    await fetchIngredients();
    if (activeTab === 'movimientos') await fetchMovements();
  }
  // ─── Equivalences CRUD ───────────────────────────────────────────────────

  function openAddEquiv() { setEquivEditId(null); setEquivForm(emptyEquivForm()); setEquivModalOpen(true); }
  function openEditEquiv(eq: UnitEquivalence) {
    setEquivEditId(eq.id);
    setEquivForm({ ingredientId: eq.ingredientId, bulkUnit: eq.bulkUnit, bulkDescription: eq.bulkDescription, subUnit: eq.subUnit, subUnitDescription: eq.subUnitDescription, conversionFactor: eq.conversionFactor, notes: eq.notes });
    setEquivModalOpen(true);
  }
  async function handleEquivSave() {
    if (!equivForm.ingredientId || equivForm.conversionFactor <= 0) return;
    if (equivEditId) {
      await supabase.from('unit_equivalences').update({
        ingredient_id: equivForm.ingredientId, bulk_unit: equivForm.bulkUnit,
        bulk_description: equivForm.bulkDescription, sub_unit: equivForm.subUnit,
        sub_unit_description: equivForm.subUnitDescription, conversion_factor: equivForm.conversionFactor,
        notes: equivForm.notes, updated_at: new Date().toISOString(),
      }).eq('id', equivEditId);
    } else {
      await supabase.from('unit_equivalences').insert({
        ingredient_id: equivForm.ingredientId, bulk_unit: equivForm.bulkUnit,
        bulk_description: equivForm.bulkDescription, sub_unit: equivForm.subUnit,
        sub_unit_description: equivForm.subUnitDescription, conversion_factor: equivForm.conversionFactor,
        notes: equivForm.notes,
      });
    }
    setEquivModalOpen(false);
    setEquivEditId(null);
    setEquivForm(emptyEquivForm());
    await fetchEquivalences();
  }
  async function handleEquivDelete() {
    if (!deleteEquivId) return;
    await supabase.from('unit_equivalences').delete().eq('id', deleteEquivId);
    setDeleteEquivId(null);
    await fetchEquivalences();
  }
  function updateForm<K extends keyof Omit<Ingredient, 'id'>>(key: K, value: Omit<Ingredient, 'id'>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }
  function openHistoryFor(id: string) {
    setHistoryIngredientId(id);
    setActiveTab('movimientos');
  }
  const deleteTarget = ingredients.find((i) => i.id === deleteId);
  const historyIngredient = historyIngredientId ? ingredients.find((i) => i.id === historyIngredientId) : null;
  const deleteEquivTarget = equivalences.find((e) => e.id === deleteEquivId);
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1e38' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72', backgroundColor: '#0f1e38' }}>
        <div>
          <h1 className="text-xl font-bold text-white">Inventario</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Gestión de ingredientes, stock y proveedores</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMovementModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <RefreshCw size={15} />
            Registrar Movimiento
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
            <Plus size={16} />
            Agregar Ingrediente
          </button>
        </div>
      </div>
      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: '#243f72', backgroundColor: '#132240' }}>
        <div className="flex items-center gap-2">
          <Package size={16} style={{ color: '#f59e0b' }} />
          <span className="text-sm text-white font-semibold">{loading ? '…' : ingredients.length}</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>ingredientes totales</span>
        </div>
        {!loading && lowStockItems.length > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm text-red-400 font-semibold">{lowStockItems.length}</span>
            <span className="text-sm text-red-400">con stock crítico</span>
          </div>
        )}
        {!loading && reorderItems.length > 0 && (
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-amber-400" />
            <span className="text-sm text-amber-400 font-semibold">{reorderItems.length}</span>
            <span className="text-sm text-amber-400">por reordenar</span>
          </div>
        )}
      </div>
      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
        {([
          { key: 'inventario', label: 'Inventario', icon: <Package size={14} /> },
          { key: 'movimientos', label: 'Historial de Movimientos', icon: <History size={14} /> },
          { key: 'alertas', label: `Alertas (${lowStockItems.length + reorderItems.length})`, icon: <Bell size={14} /> },
          { key: 'equivalencias', label: 'Equivalencias', icon: <Scale size={14} /> },
          { key: 'analisis', label: 'Análisis de Desperdicio', icon: <BarChart2 size={14} /> },
          { key: 'pronostico', label: 'Pronóstico 7 días', icon: <TrendingUp size={14} /> },
        ] as { key: ActiveTab; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-150"
            style={{ borderColor: activeTab === tab.key ? '#f59e0b' : 'transparent', color: activeTab === tab.key ? '#f59e0b' : 'rgba(255,255,255,0.45)', border: activeTab === tab.key ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>
      {/* ── TAB: INVENTARIO ── */}
      {activeTab === 'inventario' && (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input type="text" placeholder="Buscar ingrediente o proveedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: '#1a2f52', border: '1px solid #243f72', color: 'rgba(255,255,255,0.85)' }} />
              </div>
              <button onClick={() => setFilterLowStock((v) => !v)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all" style={{ backgroundColor: filterLowStock ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)', color: filterLowStock ? '#f87171' : 'rgba(255,255,255,0.6)', border: filterLowStock ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
                <AlertTriangle size={14} />
                Stock crítico
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ backgroundColor: activeCategory === cat ? '#f59e0b' : 'rgba(255,255,255,0.06)', color: activeCategory === cat ? '#1B3A6B' : 'rgba(255,255,255,0.6)', border: activeCategory === cat ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: '#132240' }}>
                <tr className="border-b" style={{ borderColor: '#243f72' }}>
                  {['Ingrediente', 'Categoría', 'Stock', 'Nivel', 'Mínimo', 'Reorden', 'Costo/u', 'Proveedor', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} cols={9} />)
                ) : ingredients.length === 0 ? (
                  <EmptyState onAdd={openAdd} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {search ? `Sin resultados para "${search}"` : 'No hay ingredientes en esta categoría'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((ing) => {
                    const isLow = ing.stock < ing.minStock;
                    const isNearReorder = ing.stock < ing.reorderPoint && !isLow;
                    return (
                      <tr key={ing.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: '#1a2f52' }}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {isLow && <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />}
                            {!isLow && isNearReorder && <TrendingDown size={13} className="text-amber-400 flex-shrink-0" />}
                            <span className="text-sm font-semibold text-white">{ing.name}</span>
                          </div>
                          {ing.notes && <p className="text-xs mt-0.5 truncate max-w-[140px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{ing.notes}</p>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[ing.category]}`}>{ing.category}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-sm font-mono font-semibold ${isLow ? 'text-red-400' : isNearReorder ? 'text-amber-400' : 'text-white'}`}>{ing.stock} {ing.unit}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StockBar stock={ing.stock} minStock={ing.minStock} reorderPoint={ing.reorderPoint} />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{ing.minStock} {ing.unit}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{ing.reorderPoint} {ing.unit}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-mono" style={{ color: '#f59e0b' }}>${ing.cost.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{ing.supplier || '—'}</span>
                            <div className="flex items-center gap-2">
                              {ing.supplierPhone && (
                                <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                  <Phone size={10} />{ing.supplierPhone}
                                </span>
                              )}
                              {ing.supplierUrl && (
                                <a href={ing.supplierUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs hover:text-blue-300 transition-colors" style={{ color: '#60a5fa' }}>
                                  <ExternalLink size={10} />Web
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openHistoryFor(ing.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Ver historial">
                              <History size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                            </button>
                            <button onClick={() => openEdit(ing)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Editar">
                              <Pencil size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
                            </button>
                            <button onClick={() => setDeleteId(ing.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors" title="Eliminar">
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {/* ── TAB: MOVIMIENTOS ── */}
      {activeTab === 'movimientos' && (
        <div className="flex-1 overflow-auto">
          {/* Filter bar */}
          <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
            {historyIngredient && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <span style={{ color: '#f59e0b' }}>Filtrando: {historyIngredient.name}</span>
                <button onClick={() => setHistoryIngredientId(null)} className="ml-1 hover:opacity-70">
                  <X size={12} style={{ color: '#f59e0b' }} />
                </button>
              </div>
            )}
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
              <select
                value={historyIngredientId ?? ''}
                onChange={(e) => setHistoryIngredientId(e.target.value || null)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none appearance-none"
                style={{ backgroundColor: '#1a2f52', border: '1px solid #243f72', color: 'rgba(255,255,255,0.85)' }}
              >
                <option value="" style={{ backgroundColor: '#162d55' }}>Todos los ingredientes</option>
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id} style={{ backgroundColor: '#162d55' }}>{i.name}</option>
                ))}
              </select>
            </div>
          </div>
          <table className="w-full">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: '#132240' }}>
              <tr className="border-b" style={{ borderColor: '#243f72' }}>
                {['Fecha', 'Ingrediente', 'Tipo', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Motivo', 'Registrado por'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingMovements ? (
                Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} cols={8} />)
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <History size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No hay movimientos registrados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                movements.map((mv) => {
                  const mc = MOVEMENT_COLORS[mv.movementType];
                  return (
                    <tr key={mv.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: '#1a2f52' }}>
                      <td className="px-4 py-3.5 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(mv.createdAt)}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-white">{mv.ingredientName}</td>
                      <td className="px-4 py-3.5">
                        <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-semibold w-fit ${mc.bg}`}>
                          {mc.icon}{mc.text}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-mono font-semibold ${mv.movementType === 'salida' ? 'text-red-400' : mv.movementType === 'entrada' ? 'text-green-400' : 'text-blue-400'}`}>
                          {mv.movementType === 'salida' ? '-' : '+'}{mv.quantity} {mv.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{mv.previousStock} {mv.unit}</td>
                      <td className="px-4 py-3.5 text-sm font-mono text-white">{mv.newStock} {mv.unit}</td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{mv.reason || '—'}</td>
                      <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{mv.createdBy}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* ── TAB: ALERTAS ── */}
      {activeTab === 'alertas' && (
        <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
          {/* Critical stock */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-400" />
              <h2 className="text-sm font-bold text-white">Stock Crítico</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>{lowStockItems.length}</span>
            </div>
            <div className="flex justify-end mb-2">
              <button onClick={handleExportPurchaseOrder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Download size={13} />
                Exportar lista de compras
              </button>
            </div>
            {lowStockItems.length === 0 ? (
              <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                ✅ Ningún ingrediente en stock crítico
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={15} className="text-red-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">{ing.name}</p>
                        <p className="text-xs text-red-400">Stock: {ing.stock} {ing.unit} — Mínimo: {ing.minStock} {ing.unit}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {ing.supplier && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{ing.supplier}</span>}
                      {ing.supplierPhone && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          <Phone size={10} />{ing.supplierPhone}
                        </span>
                      )}
                      <button onClick={() => openEdit(ing)} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                        Actualizar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Reorder point */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={16} className="text-amber-400" />
              <h2 className="text-sm font-bold text-white">Por Reordenar</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>{reorderItems.length}</span>
            </div>
            {reorderItems.length === 0 ? (
              <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                ✅ Ningún ingrediente requiere reorden
              </div>
            ) : (
              <div className="space-y-2">
                {reorderItems.map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div className="flex items-center gap-3">
                      <TrendingDown size={15} className="text-amber-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">{ing.name}</p>
                        <p className="text-xs text-amber-400">Stock: {ing.stock} {ing.unit} — Punto de reorden: {ing.reorderPoint} {ing.unit}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {ing.supplier && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{ing.supplier}</span>}
                      {ing.supplierPhone && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          <Phone size={10} />{ing.supplierPhone}
                        </span>
                      )}
                      {ing.supplierUrl && (
                        <a href={ing.supplierUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                          <ExternalLink size={11} />Ordenar
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* All good */}
          {lowStockItems.length === 0 && reorderItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
                <TrendingUp size={28} className="text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-white mb-1">¡Inventario en buen estado!</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Todos los ingredientes tienen stock suficiente.</p>
              </div>
            </div>
          )}
        </div>
      )}
      {/* ── TAB: EQUIVALENCIAS ── */}
      {activeTab === 'equivalencias' && (
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
            <div>
              <p className="text-sm text-white font-semibold">Tabla de Equivalencias de Unidades</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Define cómo se convierten las unidades de compra a unidades de uso. Ej: 1 bolsa de pan = 8 pares de pan.
              </p>
            </div>
            <button onClick={openAddEquiv} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
              <Plus size={15} />Nueva Equivalencia
            </button>
          </div>
          {loadingEquiv ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />)}
            </div>
          ) : equivalences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
                <Scale size={28} style={{ color: '#f59e0b' }} />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-white mb-1">Sin equivalencias configuradas</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Agrega equivalencias para que el sistema convierta automáticamente las unidades de compra.
                </p>
              </div>
              <button onClick={openAddEquiv} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                <Plus size={16} />Agregar primera equivalencia
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: '#132240' }}>
                <tr className="border-b" style={{ borderColor: '#243f72' }}>
                  {['Ingrediente', 'Unidad de Compra', 'Descripción', 'Unidad de Uso', 'Descripción', 'Factor', 'Notas', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equivalences.map((eq) => (
                  <tr key={eq.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: '#1a2f52' }}>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-white">{eq.ingredientName}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Unidad base: {eq.ingredientUnit}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-mono font-semibold" style={{ color: '#f59e0b' }}>1 {eq.bulkUnit}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{eq.bulkDescription || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-mono font-semibold text-green-400">{eq.conversionFactor} {eq.subUnit}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{eq.subUnitDescription || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit" style={{ backgroundColor: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.25)' }}>
                        <span className="text-xs font-mono font-semibold" style={{ color: '#818cf8' }}>
                          1 {eq.bulkUnit} = {eq.conversionFactor} {eq.subUnit}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{eq.notes || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditEquiv(eq)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Editar"><Pencil size={13} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
                        <button onClick={() => setDeleteEquivId(eq.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors" title="Eliminar"><Trash2 size={13} className="text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* ── TAB: ANÁLISIS DE DESPERDICIO ── */}
      {activeTab === 'analisis' && <AnalisisDesperdicioTab />}
      {/* ── TAB: PRONÓSTICO ── */}
      {activeTab === 'pronostico' && <ForecastingChart />}
      {/* ── MODAL: Delete Ingredient ── */}
      {deleteId && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Eliminar ingrediente</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
              ¿Estás seguro de que deseas eliminar <span className="font-semibold text-white">"{deleteTarget.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white">Eliminar</button>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL: Delete Equivalence ── */}
      {deleteEquivId && deleteEquivTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteEquivId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Eliminar equivalencia</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
              ¿Eliminar la equivalencia de <span className="font-semibold text-white">"{deleteEquivTarget.ingredientName}"</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteEquivId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
              <button onClick={handleEquivDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Agregar / Editar Ingrediente ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#243f72' }}>
              <h2 className="font-bold text-white text-base">{editingId ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}</h2>
              <button onClick={closeModal} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre *</label>
                <input className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: `1px solid ${formErrors.name ? '#ef4444' : 'rgba(255,255,255,0.15)'}` }}
                  value={form.name} onChange={e => updateForm('name', e.target.value)}
                  placeholder="Ej: Carne de res, Tomate..." />
                {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
              </div>
              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Categoría *</label>
                <select className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none appearance-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={form.category} onChange={e => updateForm('category', e.target.value as any)}>
                  {CATEGORIES.filter(c => c !== 'Todas').map(c => <option key={c} value={c} style={{ backgroundColor: '#162d55' }}>{c}</option>)}
                </select>
              </div>
              {/* Unidad */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Unidad *</label>
                <select className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none appearance-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={form.unit} onChange={e => updateForm('unit', e.target.value as any)}>
                  {UNITS.map(u => <option key={u} value={u} style={{ backgroundColor: '#162d55' }}>{UNIT_LABELS[u]}</option>)}
                </select>
              </div>
              {/* Stock actual */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Stock actual *</label>
                <input type="number" min={0} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: `1px solid ${formErrors.stock ? '#ef4444' : 'rgba(255,255,255,0.15)'}` }}
                  value={form.stock} onChange={e => updateForm('stock', Number(e.target.value))} />
                {formErrors.stock && <p className="text-xs text-red-400 mt-1">{formErrors.stock}</p>}
              </div>
              {/* Stock mínimo */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Stock mínimo</label>
                <input type="number" min={0} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={form.minStock} onChange={e => updateForm('minStock', Number(e.target.value))} />
              </div>
              {/* Punto de reorden */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Punto de reorden</label>
                <input type="number" min={0} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={form.reorderPoint} onChange={e => updateForm('reorderPoint', Number(e.target.value))} />
              </div>
              {/* Costo */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Costo por unidad ($)</label>
                <input type="number" min={0} step="0.01" className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={form.cost} onChange={e => updateForm('cost', Number(e.target.value))} />
              </div>
              {/* Proveedor */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Proveedor</label>
                <input className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={form.supplier} onChange={e => updateForm('supplier', e.target.value)}
                  placeholder="Nombre del proveedor" />
              </div>
              {/* Tel proveedor */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Teléfono proveedor</label>
                <input className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={form.supplierPhone} onChange={e => updateForm('supplierPhone', e.target.value)}
                  placeholder="55 1234 5678" />
              </div>
              {/* URL proveedor */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>URL / Catálogo</label>
                <input className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={form.supplierUrl} onChange={e => updateForm('supplierUrl', e.target.value)}
                  placeholder="https://proveedor.com" />
              </div>
              {/* Notas */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Notas</label>
                <textarea rows={2} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={form.notes} onChange={e => updateForm('notes', e.target.value)}
                  placeholder="Instrucciones de almacenamiento, observaciones..." />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: '#243f72' }}>
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar ingrediente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Registrar Movimiento ── */}
      {movementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMovementModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#243f72' }}>
              <h2 className="font-bold text-white text-base">Registrar Movimiento</h2>
              <button onClick={() => setMovementModalOpen(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Tipo de movimiento</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['entrada', 'salida', 'ajuste'] as MovementType[]).map(t => (
                    <button key={t} onClick={() => setMovementForm(p => ({ ...p, movementType: t }))}
                      className="py-2 rounded-lg text-xs font-semibold capitalize transition-all"
                      style={{
                        backgroundColor: movementForm.movementType === t
                          ? t === 'entrada' ? '#22c55e' : t === 'salida' ? '#ef4444' : '#3b82f6' :'rgba(255,255,255,0.07)',
                        color: movementForm.movementType === t ? 'white' : 'rgba(255,255,255,0.5)',
                      }}>
                      {t === 'entrada' ? '📥 Entrada' : t === 'salida' ? '📤 Salida' : '🔄 Ajuste'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Ingrediente */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Ingrediente *</label>
                <select className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none appearance-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={movementForm.ingredientId} onChange={e => setMovementForm(p => ({ ...p, ingredientId: e.target.value }))}>
                  <option value="" style={{ backgroundColor: '#162d55' }}>Seleccionar ingrediente...</option>
                  {ingredients.map(i => (
                    <option key={i.id} value={i.id} style={{ backgroundColor: '#162d55' }}>
                      {i.name} — {i.stock} {i.unit} disponibles
                    </option>
                  ))}
                </select>
              </div>
              {/* Cantidad */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Cantidad *
                  {movementForm.ingredientId && (
                    <span className="ml-2 font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      ({ingredients.find(i => i.id === movementForm.ingredientId)?.unit})
                    </span>
                  )}
                </label>
                <input type="number" min={0} step="0.001" className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={movementForm.quantity || ''} onChange={e => setMovementForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                  placeholder="0.000" />
              </div>
              {/* Motivo */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Motivo / Descripción
                </label>
                <input className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={movementForm.reason} onChange={e => setMovementForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder={movementForm.movementType === 'entrada' ? 'Compra a proveedor, donación...' : movementForm.movementType === 'salida' ? 'Uso en cocina, merma...' : 'Corrección de inventario...'} />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: '#243f72' }}>
              <button onClick={() => setMovementModalOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
              <button onClick={handleMovementSave} disabled={saving || !movementForm.ingredientId || movementForm.quantity <= 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ backgroundColor: movementForm.movementType === 'entrada' ? '#22c55e' : movementForm.movementType === 'salida' ? '#ef4444' : '#3b82f6', color: 'white' }}>
                {saving ? 'Registrando...' : movementForm.movementType === 'entrada' ? 'Registrar entrada' : movementForm.movementType === 'salida' ? 'Registrar salida' : 'Registrar ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Nueva / Editar Equivalencia ── */}
      {equivModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEquivModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl shadow-2xl" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#243f72' }}>
              <h2 className="font-bold text-white text-base">{equivEditId ? 'Editar Equivalencia' : 'Nueva Equivalencia'}</h2>
              <button onClick={() => setEquivModalOpen(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Permite al sistema convertir automáticamente entre la unidad de compra (mayoreo) y la unidad de uso (cocina).
              </p>
              {/* Ingrediente */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Ingrediente *</label>
                <select className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none appearance-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={equivForm.ingredientId} onChange={e => setEquivForm(p => ({ ...p, ingredientId: e.target.value }))}>
                  <option value="" style={{ backgroundColor: '#162d55' }}>Seleccionar ingrediente...</option>
                  {ingredients.map(i => <option key={i.id} value={i.id} style={{ backgroundColor: '#162d55' }}>{i.name} ({i.unit})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Unidad de compra */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Unidad de compra *</label>
                  <input className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                    value={equivForm.bulkUnit} onChange={e => setEquivForm(p => ({ ...p, bulkUnit: e.target.value }))}
                    placeholder="Ej: caja, costal, cubeta" />
                </div>
                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Descripción</label>
                  <input className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                    value={equivForm.bulkDescription} onChange={e => setEquivForm(p => ({ ...p, bulkDescription: e.target.value }))}
                    placeholder="Ej: Caja de 24 unidades" />
                </div>
                {/* Unidad de uso */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Unidad de uso *</label>
                  <input className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                    value={equivForm.subUnit} onChange={e => setEquivForm(p => ({ ...p, subUnit: e.target.value }))}
                    placeholder="Ej: kg, lt, pz" />
                </div>
                {/* Factor de conversión */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Factor de conversión *</label>
                  <input type="number" min={0.001} step="0.001" className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                    value={equivForm.conversionFactor} onChange={e => setEquivForm(p => ({ ...p, conversionFactor: Number(e.target.value) }))}
                    placeholder="Ej: 24" />
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {equivForm.conversionFactor > 0 && equivForm.bulkUnit && equivForm.subUnit
                      ? `1 ${equivForm.bulkUnit} = ${equivForm.conversionFactor} ${equivForm.subUnit}`
                      : '1 [compra] = N [uso]'}
                  </p>
                </div>
              </div>
              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Notas</label>
                <input className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                  value={equivForm.notes} onChange={e => setEquivForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Observaciones adicionales..." />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: '#243f72' }}>
              <button onClick={() => setEquivModalOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
              <button onClick={handleEquivSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                {saving ? 'Guardando...' : equivEditId ? 'Guardar cambios' : 'Crear equivalencia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}