'use client';

import React, { useState, useCallback, useEffect } from 'react';

import { LayoutGrid, Move, XCircle, Hash, Trash2, Save, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAudit } from '@/hooks/useAudit';
import { ElementType, LayoutTable, ELEMENT_TYPES } from './types';
import Icon from '@/components/ui/AppIcon';


function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon size={18} style={{ color: '#f59e0b' }} />
      <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>{title}</h2>
    </div>
  );
}

function SaveButton({ saved, onClick, label }: { saved: boolean; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
      style={{ backgroundColor: saved ? 'rgba(34,197,94,0.15)' : '#f59e0b', color: saved ? '#22c55e' : '#1B3A6B', border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none' }}>
      {saved ? <CheckCircle size={15} /> : <Save size={15} />}
      {saved ? 'Guardado' : (label ?? 'Guardar Layout')}
    </button>
  );
}

export default function ConfigLayout() {
  const supabase = createClient();
  const { log: auditLog } = useAudit();

  const [layoutTables, setLayoutTables] = useState<LayoutTable[]>([]);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [selectedLayoutTable, setSelectedLayoutTable] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const CELL = 56;
  const GRID_MIN_COLS = 8; const GRID_MAX_COLS = 24;
  const GRID_MIN_ROWS = 6; const GRID_MAX_ROWS = 16;
  const [gridCols, setGridCols] = useState(12);
  const [gridRows, setGridRows] = useState(8);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableShape, setNewTableShape] = useState<'rect' | 'round'>('rect');
  const [newElementType, setNewElementType] = useState<ElementType>('mesa');
  const [showClearConfirm, setShowClearConfirm] = useState(false);


  const loadLayout = useCallback(async () => {
    setLayoutLoading(true);
    try {
      const { data } = await supabase.from('restaurant_layout').select('*').limit(1).single();
      if (data) {
        setLayoutId(data.id);
        setLayoutTables((data.tables_layout as LayoutTable[]) || []);
        if (data.width)  setGridCols(Math.max(8, Math.min(24, Number(data.width))));
        if (data.height) setGridRows(Math.max(6, Math.min(16, Number(data.height))));
      }
    } catch {
      // no layout yet
    } finally {
      setLayoutLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  // ── Logo upload ──────────────────────────────────────────────────────────────


  async function handleSaveLayout() {
    const payload = { tables_layout: layoutTables, width: gridCols, height: gridRows, updated_at: new Date().toISOString() };
    if (layoutId) {
      await supabase.from('restaurant_layout').update(payload).eq('id', layoutId);
    } else {
      const { data } = await supabase.from('restaurant_layout').insert({ ...payload, name: 'Planta Principal', width: 12, height: 8 }).select().single();
      if (data) setLayoutId(data.id);
    }

    // ── Sync restaurant_tables to match the layout ──────────────────────────
    // ONLY real mesas — elementType === 'mesa' or undefined (backwards compat)
    // Full replace strategy: delete ALL, re-insert only mesas
    // This guarantees no architectural elements (paredes, baños, etc.) leak in
    const realTables = layoutTables.filter((t) => !t.elementType || t.elementType === 'mesa');

    // 1. Fetch existing rows to preserve order IDs and statuses for occupied tables
    const { data: existingRows } = await supabase
      .from('restaurant_tables')
      .select('id, number, status, current_order_id, waiter');

    // 2. Delete ALL existing rows — clean slate
    await supabase.from('restaurant_tables')
      .delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Re-insert only real mesa entries, preserving operational state for occupied tables
    for (const lt of realTables) {
      const existing = (existingRows || []).find((r: any) => r.number === lt.number);
      await supabase.from('restaurant_tables').insert({
        number: lt.number,
        name: lt.name,
        capacity: lt.capacity,
        status: existing?.status ?? 'libre',
        current_order_id: existing?.current_order_id ?? null,
        waiter: existing?.waiter ?? null,
      });
    }

    // 4. Sync real table count to system_config
    await supabase.from('system_config').upsert(
      { config_key: 'table_count', config_value: String(realTables.length) },
      { onConflict: 'config_key' }
    );
    setLayoutSaved(true);
    setTimeout(() => setLayoutSaved(false), 2500);
  }


  function openAddForm() {
    const nextNum = layoutTables.length > 0 ? Math.max(...layoutTables.map((t) => t.number)) + 1 : 1;
    setNewTableName(`Mesa ${nextNum}`);
    setNewTableCapacity(4);
    setNewTableShape('rect');
    setShowAddForm(true);
  }


  function confirmAddTable() {
    const nextNum = layoutTables.length > 0 ? Math.max(...layoutTables.map((t) => t.number)) + 1 : 1;
    const newTable: LayoutTable = {
      id: crypto.randomUUID(),
      number: nextNum,
      name: newTableName.trim() || `Mesa ${nextNum}`,
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      shape: 'rect',
      capacity: 4,
    };
    setLayoutTables((prev) => [...prev, newTable]);
    setShowAddForm(false);
  }


  async function handleClearAllTables() {
    setLayoutTables([]);
    setSelectedLayoutTable(null);
    setShowClearConfirm(false);
    // Save empty layout and reset table_count
    const payload = { tables_layout: [], updated_at: new Date().toISOString() };
    if (layoutId) {
      await supabase.from('restaurant_layout').update(payload).eq('id', layoutId);
    }
    // Delete all restaurant_tables rows
    await supabase.from('restaurant_tables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('system_config').upsert(
      { config_key: 'table_count', config_value: '0' },
      { onConflict: 'config_key' }
    );
  }


  function addLayoutElement(type: ElementType = newElementType) {
    const etConfig = ELEMENT_TYPES.find(e => e.type === type)!;
    if (type === 'mesa') {
      const tableNums = layoutTables.filter(t => !t.elementType || t.elementType === 'mesa').map(t => t.number);
      const nextNum = tableNums.length > 0 ? Math.max(...tableNums) + 1 : 1;
      setLayoutTables(prev => [...prev, {
        id: crypto.randomUUID(), number: nextNum, name: `Mesa ${nextNum}`,
        x: 1, y: 1, w: etConfig.defaultW, h: etConfig.defaultH,
        shape: newTableShape, capacity: 4, elementType: 'mesa',
      }]);
    } else {
      const count = layoutTables.filter(t => t.elementType === type).length + 1;
      // Walls default to full grid width; other elements keep their defaultW
      const defaultW = type === 'pared' ? gridCols : etConfig.defaultW;
      const defaultH = type === 'pared' ? 1 : etConfig.defaultH;
      setLayoutTables(prev => [...prev, {
        id: crypto.randomUUID(), number: 0, name: `${etConfig.label} ${count}`,
        x: 0, y: 1, w: defaultW, h: defaultH,
        shape: 'rect', capacity: 0, elementType: type, color: etConfig.color,
      }]);
    }
  }


  function addLayoutTable() {
    addLayoutElement('mesa');
  }


  function removeLayoutTable(id: string) {
    setLayoutTables((prev) => prev.filter((t) => t.id !== id));
    if (selectedLayoutTable === id) setSelectedLayoutTable(null);
  }


  function updateLayoutTable(id: string, changes: Partial<LayoutTable>) {
    setLayoutTables((prev) => prev.map((t) => t.id === id ? { ...t, ...changes } : t));
  }


  function handleGridMouseDown(e: React.MouseEvent, tableId: string) {
    e.preventDefault();
    const table = layoutTables.find((t) => t.id === tableId);
    if (!table) return;
    setSelectedLayoutTable(tableId);
    setDragging({ id: tableId, startX: e.clientX, startY: e.clientY, origX: table.x, origY: table.y });
  }


  function handleGridMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const dx = Math.round((e.clientX - dragging.startX) / CELL);
    const dy = Math.round((e.clientY - dragging.startY) / CELL);
    const newX = Math.max(0, Math.min(11, dragging.origX + dx));
    const newY = Math.max(0, Math.min(7, dragging.origY + dy));
    updateLayoutTable(dragging.id, { x: newX, y: newY });
  }


  function handleGridMouseUp() {
    setDragging(null);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  // ── Save feature flags ────────────────────────────────────────────────────

  useEffect(() => { loadLayout(); }, [loadLayout]);

  return (
    <div>
              <SectionTitle icon={LayoutGrid} title="Diseñador de Layout del Restaurante" />
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Agrega y arrastra las mesas para recrear el plano de tu restaurante. Este es el único lugar donde se configura el número de mesas y su capacidad.
              </p>

              {layoutLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
                </div>
              ) : (
                <div className="flex gap-5">
                  {/* Grid canvas */}
                  <div className="flex-1">
                    {/* Grid size controls */}
                    <div className="flex items-center gap-5 mb-3 px-1">
                      {[
                        { label: 'Ancho', val: gridCols, set: setGridCols, min: 8, max: 24 },
                        { label: 'Alto',  val: gridRows, set: setGridRows, min: 6, max: 16 },
                      ].map(({ label, val, set, min, max }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}:</span>
                          <button onClick={() => set((v: number) => Math.max(min, v - 1))}
                            className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>−</button>
                          <span className="text-xs font-mono w-5 text-center" style={{ color: '#f1f5f9' }}>{val}</span>
                          <button onClick={() => set((v: number) => Math.min(max, v + 1))}
                            className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>+</button>
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>({min}–{max})</span>
                        </div>
                      ))}
                    </div>
                    <div
                      className="relative rounded-xl overflow-hidden select-none"
                      style={{
                        width: gridCols * CELL,
                        height: gridRows * CELL,
                        backgroundColor: '#0d1720',
                        border: '1px solid #1e2d3d',
                        backgroundImage: `
                          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
                        `,
                        backgroundSize: `${CELL}px ${CELL}px`,
                        cursor: dragging ? 'grabbing' : 'default',
                      }}
                      onMouseMove={handleGridMouseMove}
                      onMouseUp={handleGridMouseUp}
                      onMouseLeave={handleGridMouseUp}
                    >
                      {layoutTables.map((table) => {
                        const isSelected = selectedLayoutTable === table.id;
                        return (
                          <div
                            key={table.id}
                            onMouseDown={(e) => handleGridMouseDown(e, table.id)}
                            onClick={() => setSelectedLayoutTable(table.id)}
                            className="absolute flex flex-col items-center justify-center transition-shadow"
                            style={{
                              left: table.x * CELL + 4,
                              top: table.y * CELL + 4,
                              width: table.w * CELL - 8,
                              height: table.h * CELL - 8,
                              backgroundColor: isSelected ? 'rgba(245,158,11,0.25)' : 'rgba(27,58,107,0.7)',
                              border: `2px solid ${isSelected ? '#f59e0b' : '#2a3f5f'}`,
                              borderRadius: table.shape === 'round' ? '50%' : '8px',
                              cursor: 'grab',
                              zIndex: isSelected ? 10 : 1,
                              boxShadow: isSelected ? '0 0 0 2px rgba(245,158,11,0.3)' : 'none',
                            }}
                          >
                            <span className="text-xs font-bold" style={{ color: isSelected ? '#f59e0b' : '#f1f5f9' }}>{table.number}</span>
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px' }}>{table.capacity}p</span>
                          </div>
                        );
                      })}
                      {layoutTables.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-40">
                          <LayoutGrid size={32} style={{ color: 'rgba(255,255,255,0.3)' }} />
                          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Agrega mesas para comenzar</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <Move size={10} className="inline mr-1" />
                      Arrastra las mesas para posicionarlas en el plano
                    </p>
                  </div>

                  {/* Side panel */}
                  <div className="w-64 flex-shrink-0">
                    {/* Add table form */}
                    {showAddForm ? (
                      <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: '#1a2535', border: '1px solid rgba(245,158,11,0.3)' }}>
                        <h3 className="text-sm font-bold mb-3" style={{ color: '#f59e0b' }}>Nueva Mesa</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre</label>
                            <input
                              type="text"
                              value={newTableName}
                              onChange={(e) => setNewTableName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                              style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }}
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Capacidad (personas)</label>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setNewTableCapacity((p) => Math.max(1, p - 1))} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>−</button>
                              <input type="number" min={1} max={20} value={newTableCapacity} onChange={(e) => setNewTableCapacity(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 text-center px-2 py-1.5 rounded-lg text-xs outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
                              <button onClick={() => setNewTableCapacity((p) => Math.min(20, p + 1))} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>+</button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Forma</label>
                            <div className="flex gap-2">
                              {(['rect', 'round'] as const).map((shape) => (
                                <button
                                  key={shape}
                                  onClick={() => setNewTableShape(shape)}
                                  className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all"
                                  style={{
                                    backgroundColor: newTableShape === shape ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                                    color: newTableShape === shape ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                                    border: `1px solid ${newTableShape === shape ? 'rgba(245,158,11,0.3)' : '#2a3f5f'}`,
                                  }}
                                >
                                  {shape === 'rect' ? 'Cuadrada' : 'Redonda'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => setShowAddForm(false)} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid #2a3f5f' }}>Cancelar</button>
                            <button onClick={confirmAddTable} className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>Agregar</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Agregar elemento:</p>
                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                          {ELEMENT_TYPES.map(et => (
                            <button
                              key={et.type}
                              onClick={() => et.type === 'mesa' ? openAddForm() : addLayoutElement(et.type)}
                              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid #2a3f5f' }}
                            >
                              <span>{et.emoji}</span> {et.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
                        >
                          <XCircle size={13} /> Borrar todo
                        </button>
                      </div>
                    )}

                    <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Hash size={16} style={{ color: '#f59e0b' }} />
                        <h3 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Mesas ({layoutTables.length})</h3>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {layoutTables.map((table) => (
                          <div
                            key={table.id}
                            onClick={() => setSelectedLayoutTable(table.id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
                            style={{
                              backgroundColor: selectedLayoutTable === table.id ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${selectedLayoutTable === table.id ? 'rgba(245,158,11,0.3)' : 'transparent'}`,
                            }}
                          >
                            <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(27,58,107,0.8)', color: '#f59e0b', borderRadius: table.shape === 'round' ? '50%' : '4px' }}>
                              {table.number}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block text-xs truncate" style={{ color: '#f1f5f9' }}>{table.name}</span>
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{table.capacity} personas</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeLayoutTable(table.id); }}
                              className="p-1 rounded hover:bg-red-500/20 transition-colors"
                              style={{ color: 'rgba(255,255,255,0.3)' }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                        {layoutTables.length === 0 && (
                          <p className="text-xs text-center py-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin mesas agregadas</p>
                        )}
                      </div>
                    </div>

                    {/* Selected table editor */}
                    {selectedLayoutTable && (() => {
                      const t = layoutTables.find((lt) => lt.id === selectedLayoutTable);
                      if (!t) return null;
                      return (
                        <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: '#1a2535', border: '1px solid rgba(245,158,11,0.25)' }}>
                          <h3 className="text-sm font-semibold mb-3" style={{ color: '#f59e0b' }}>
                            {ELEMENT_TYPES.find(e => e.type === (t.elementType || 'mesa'))?.emoji} Editar {t.name}
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre</label>
                              <input type="text" value={t.name} onChange={(e) => updateLayoutTable(t.id, { name: e.target.value })} className="w-full px-3 py-1.5 rounded-lg text-xs outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Capacidad (personas)</label>
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateLayoutTable(t.id, { capacity: Math.max(1, t.capacity - 1) })} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>−</button>
                                <input type="number" min={1} max={20} value={t.capacity} onChange={(e) => updateLayoutTable(t.id, { capacity: parseInt(e.target.value) || 1 })} className="w-14 text-center px-2 py-1.5 rounded-lg text-xs outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
                                <button onClick={() => updateLayoutTable(t.id, { capacity: Math.min(20, t.capacity + 1) })} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>+</button>
                              </div>
                            </div>
                            {(!t.elementType || t.elementType === 'mesa') && (
                            <div>
                              <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Forma</label>
                              <div className="flex gap-2">
                                {(['rect', 'round'] as const).map((shape) => (
                                  <button
                                    key={shape}
                                    onClick={() => updateLayoutTable(t.id, { shape })}
                                    className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all"
                                    style={{
                                      backgroundColor: t.shape === shape ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                                      color: t.shape === shape ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                                      border: `1px solid ${t.shape === shape ? 'rgba(245,158,11,0.3)' : '#2a3f5f'}`,
                                    }}
                                  >
                                    {shape === 'rect' ? 'Cuadrada' : 'Redonda'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            )}

                            {/* ── Size controls — for all element types ── */}
                            <div>
                              <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Tamaño (celdas)</label>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Ancho</label>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => updateLayoutTable(t.id, { w: Math.max(1, t.w - 1) })} className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>−</button>
                                    <span className="w-8 text-center text-xs font-bold" style={{ color: '#f1f5f9' }}>{t.w}</span>
                                    <button onClick={() => updateLayoutTable(t.id, { w: Math.min(8, t.w + 1) })} className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>+</button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Alto</label>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => updateLayoutTable(t.id, { h: Math.max(1, t.h - 1) })} className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>−</button>
                                    <span className="w-8 text-center text-xs font-bold" style={{ color: '#f1f5f9' }}>{t.h}</span>
                                    <button onClick={() => updateLayoutTable(t.id, { h: Math.min(6, t.h + 1) })} className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>+</button>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })()}

                    <div className="mt-1">
                      <SaveButton saved={layoutSaved} onClick={handleSaveLayout} label="Guardar Layout" />
                    </div>
                  </div>
                </div>
              )}

              {/* Clear all tables confirmation modal */}
              {showClearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
                  <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
                      <Trash2 size={22} style={{ color: '#ef4444' }} />
                    </div>
                    <h3 className="text-base font-bold text-center mb-1" style={{ color: '#f1f5f9' }}>Borrar todas las mesas</h3>
                    <p className="text-sm text-center mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Se eliminarán todas las mesas del layout. Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>Cancelar</button>
                      <button onClick={handleClearAllTables} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#ef4444', color: '#fff' }}>Borrar todo</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
  );
}
