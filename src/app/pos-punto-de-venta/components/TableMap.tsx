'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Users, Clock, ShoppingBag, Plus, LayoutGrid, Link2, X, Move, Trash2, Lock, Unlock } from 'lucide-react';
import { Table, TableStatus } from './POSClient';

export interface LayoutTablePosition {
  id: string;
  number: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'rect' | 'round';
  capacity: number;
  elementType?: string;
  color?: string;
}

const ARCH_ELEMENT_CONFIG: Record<string, { emoji: string; bg: string; border: string; text: string; label: string }> = {
  pared:      { emoji: '',    bg: '#374151', border: '#4b5563', text: '#9ca3af', label: '' },
  bano:       { emoji: '🚻', bg: '#0c4a6e', border: '#075985', text: '#38bdf8', label: 'Baño' },
  barra:      { emoji: '🍺', bg: '#451a03', border: '#78350f', text: '#f59e0b', label: 'Barra' },
  entrada:    { emoji: '🚪', bg: '#052e16', border: '#14532d', text: '#4ade80', label: 'Entrada' },
  ventana:    { emoji: '🪟', bg: '#082f49', border: '#0c4a6e', text: '#7dd3fc', label: 'Ventana' },
  decoracion: { emoji: '🌿', bg: '#1a2e05', border: '#365314', text: '#84cc16', label: '' },
};

interface TableMapProps {
  tables: Table[];
  onTableSelect: (table: Table) => void;
  onMarkOccupied: (table: Table) => void;
  selectedTableId?: string;
  mergeMode?: boolean;
  mergeSelection?: string[];
  onUnmerge?: (table: Table) => void;
  reservedTables?: string[];
  currentWaiter?: string;
  // Layout props
  layoutTables?: LayoutTablePosition[];
  onMoveTable?: (tableNumber: number, newX: number, newY: number) => void;
  onDeleteTable?: (tableNumber: number) => void;
}

const statusLabel: Record<TableStatus, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  espera: 'En Espera',
};

const CELL = 64; // px per grid cell in POS layout view
const GRID_COLS = 12;
const GRID_ROWS = 8;

export default function TableMap({
  tables,
  onTableSelect,
  onMarkOccupied,
  selectedTableId,
  mergeMode = false,
  mergeSelection = [],
  onUnmerge,
  reservedTables = [],
  currentWaiter,
  layoutTables,
  onMoveTable,
  onDeleteTable,
}: TableMapProps) {
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [reservConfirm, setReservConfirm] = useState<{table: any} | null>(null);
  const [dragging, setDragging] = useState<{
    tableNumber: number;
    startMouseX: number;
    startMouseY: number;
    origX: number;
    origY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const libre = tables.filter((t) => t.status === 'libre').length;
  const ocupada = tables.filter((t) => t.status === 'ocupada').length;
  const espera = tables.filter((t) => t.status === 'espera').length;

  // ── Merge groups ──────────────────────────────────────────────────────────
  const mergeGroups: Record<string, Table[]> = {};
  tables.forEach((t) => {
    if (t.mergeGroupId) {
      if (!mergeGroups[t.mergeGroupId]) mergeGroups[t.mergeGroupId] = [];
      mergeGroups[t.mergeGroupId].push(t);
    }
  });

  // ── Layout drag handlers ──────────────────────────────────────────────────
  const handleLayoutMouseDown = useCallback((e: React.MouseEvent, lt: LayoutTablePosition) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging({
      tableNumber: lt.number,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origX: lt.x,
      origY: lt.y,
      currentX: lt.x,
      currentY: lt.y,
    });
  }, [editMode]);

  const handleLayoutTouchStart = useCallback((e: React.TouchEvent, lt: LayoutTablePosition) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    setDragging({
      tableNumber: lt.number,
      startMouseX: touch.clientX,
      startMouseY: touch.clientY,
      origX: lt.x,
      origY: lt.y,
      currentX: lt.x,
      currentY: lt.y,
    });
  }, [editMode]);

  const handleGridMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = Math.round((e.clientX - dragging.startMouseX) / CELL);
    const dy = Math.round((e.clientY - dragging.startMouseY) / CELL);
    const newX = Math.max(0, Math.min(GRID_COLS - 1, dragging.origX + dx));
    const newY = Math.max(0, Math.min(GRID_ROWS - 1, dragging.origY + dy));
    setDragging((prev) => prev ? { ...prev, currentX: newX, currentY: newY } : null);
  }, [dragging]);

  const handleGridTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = Math.round((touch.clientX - dragging.startMouseX) / CELL);
    const dy = Math.round((touch.clientY - dragging.startMouseY) / CELL);
    const newX = Math.max(0, Math.min(GRID_COLS - 1, dragging.origX + dx));
    const newY = Math.max(0, Math.min(GRID_ROWS - 1, dragging.origY + dy));
    setDragging((prev) => prev ? { ...prev, currentX: newX, currentY: newY } : null);
  }, [dragging]);

  const handleGridMouseUp = useCallback(() => {
    if (!dragging) return;
    if (onMoveTable && (dragging.currentX !== dragging.origX || dragging.currentY !== dragging.origY)) {
      onMoveTable(dragging.tableNumber, dragging.currentX, dragging.currentY);
    }
    setDragging(null);
  }, [dragging, onMoveTable]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
          <LayoutGrid size={28} className="text-gray-300" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-700 mb-1">No hay mesas configuradas</p>
          <p className="text-sm text-gray-400">
            Ve a Configuración → Layout Mesas para agregar mesas al restaurante.
          </p>
        </div>
      </div>
    );
  }

  // ── LAYOUT MODE ───────────────────────────────────────────────────────────
  if (layoutTables && layoutTables.length > 0) {
    return (
      <div className="p-5">
        {/* Legend + Summary + Edit toggle */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-green-200 border border-green-400" />
              <span className="text-xs text-gray-500">Libre ({libre})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-200 border border-red-400" />
              <span className="text-xs text-gray-500">Ocupada ({ocupada})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-400" />
              <span className="text-xs text-gray-500">En Espera ({espera})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-purple-200 border border-purple-400" />
              <span className="text-xs text-gray-500">Unidas</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {ocupada}/{tables.length} mesas · {tables.length > 0 ? Math.round((ocupada / tables.length) * 100) : 0}% ocupación
            </span>
            {(onMoveTable || onDeleteTable) && (
              <button
                onClick={() => { setEditMode((v) => !v); setDragging(null); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                style={{
                  backgroundColor: editMode ? 'rgba(245,158,11,0.15)' : '#f3f4f6',
                  color: editMode ? '#d97706' : '#6b7280',
                  border: editMode ? '1px solid rgba(245,158,11,0.4)' : '1px solid #e5e7eb',
                }}
                title={editMode ? 'Salir del modo edición' : 'Editar layout (mover/eliminar mesas)'}
              >
                {editMode ? <Unlock size={12} /> : <Lock size={12} />}
                {editMode ? 'Editar: ON' : 'Editar layout'}
              </button>
            )}
          </div>
        </div>

        {editMode && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg mb-3 text-xs" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
            <Move size={13} style={{ color: '#d97706' }} />
            <span className="font-semibold text-amber-800">Modo edición:</span>
            <span className="text-amber-700">Arrastra las mesas para moverlas · Haz clic en 🗑 para eliminar · Los cambios se guardan automáticamente</span>
          </div>
        )}

        {/* Layout canvas */}
        <div className="overflow-auto">
          <div
            ref={gridRef}
            className="relative select-none rounded-xl"
            style={{
              width: GRID_COLS * CELL,
              height: GRID_ROWS * CELL,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)
              `,
              backgroundSize: `${CELL}px ${CELL}px`,
              cursor: dragging ? 'grabbing' : 'default',
            }}
            onMouseMove={handleGridMouseMove}
            onMouseUp={handleGridMouseUp}
            onMouseLeave={handleGridMouseUp}
            onTouchMove={handleGridTouchMove}
            onTouchEnd={handleGridMouseUp}
            onTouchCancel={handleGridMouseUp}
          >
            {/* ── Architectural elements layer ── */}
            {layoutTables
              .filter(lt => lt.elementType && lt.elementType !== 'mesa')
              .map(lt => {
                const cfg = ARCH_ELEMENT_CONFIG[lt.elementType!] ?? ARCH_ELEMENT_CONFIG['pared'];
                const isPared = lt.elementType === 'pared' || lt.elementType === 'ventana';
                return (
                  <div
                    key={`arch-${lt.id}`}
                    className="absolute flex items-center justify-center select-none"
                    style={{
                      left: lt.x * CELL + 2,
                      top: lt.y * CELL + 2,
                      width: lt.w * CELL - 4,
                      height: lt.h * CELL - 4,
                      backgroundColor: lt.color ?? cfg.bg,
                      border: `2px solid ${cfg.border}`,
                      borderRadius: isPared ? '4px' : '10px',
                      zIndex: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {lt.elementType === 'pared' ? (
                      <div className="w-full h-full" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 8px)',
                      }} />
                    ) : lt.elementType === 'ventana' ? (
                      <div className="w-full h-full flex items-center justify-center" style={{
                        background: 'repeating-linear-gradient(0deg, rgba(56,189,248,0.15) 0px, rgba(56,189,248,0.15) 4px, transparent 4px, transparent 8px)',
                      }}>
                        <span style={{ fontSize: '14px' }}>🪟</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        {cfg.emoji && <span style={{ fontSize: lt.w * CELL > 80 ? '20px' : '14px' }}>{cfg.emoji}</span>}
                        {cfg.label && lt.w * CELL > 60 && (
                          <span className="text-xs font-semibold" style={{ color: cfg.text, fontSize: '10px' }}>{lt.name}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            }

            {/* ── Table cards ── */}
            {layoutTables.map((lt) => {
              // Skip non-table architectural elements
              if (lt.elementType && lt.elementType !== 'mesa') return null;
              // Find the matching live table by number
              const liveTable = tables.find((t) => t.number === lt.number);
              if (!liveTable) return null;

              const isDraggingThis = dragging?.tableNumber === lt.number;
              const displayX = isDraggingThis ? dragging!.currentX : lt.x;
              const displayY = isDraggingThis ? dragging!.currentY : lt.y;

              const isSelected = selectedTableId === liveTable.id;
              const isMergeSelected = mergeSelection.includes(liveTable.id);
              const isMerged = !!liveTable.mergeGroupId;
              const isHovered = hoveredTable === liveTable.id;
              const mergeGroupSize = isMerged ? (mergeGroups[liveTable.mergeGroupId!]?.length ?? 1) : 0;
              // Waiter blocking: table occupied by a different waiter
              const isOtherWaiter = liveTable.status === 'ocupada' && !!liveTable.waiter && !!currentWaiter && liveTable.waiter !== currentWaiter;

              // Status colors
              let bgColor = '#dcfce7';
              let borderColor = '#86efac';
              let textColor = '#166534';
              if (isOtherWaiter) { bgColor = '#f3f4f6'; borderColor = '#d1d5db'; textColor = '#6b7280'; }
              else if (isMerged) { bgColor = '#ede9fe'; borderColor = '#c4b5fd'; textColor = '#6d28d9'; }
              else if (liveTable.status === 'ocupada') { bgColor = '#fee2e2'; borderColor = '#fca5a5'; textColor = '#991b1b'; }
              else if (liveTable.status === 'espera') { bgColor = '#fef3c7'; borderColor = '#fcd34d'; textColor = '#92400e'; }

              if (isSelected) { borderColor = '#f59e0b'; }
              if (isMergeSelected) { borderColor = '#3b82f6'; }

              const handleClick = (e: React.MouseEvent) => {
                if (editMode) return; // don't select in edit mode
                if (mergeMode) { onTableSelect(liveTable); return; }
                if (isMerged) { onTableSelect(liveTable); return; }
                if (liveTable.status === 'libre') {
                  // Warn if table has a reservation coming up
                  if (reservedTables.includes(liveTable.id)) {
                    setReservConfirm({ table: liveTable });
                    return;
                  }
                  onMarkOccupied(liveTable);
                }
                else onTableSelect(liveTable);
              };

              return (
                <div
                  key={lt.id}
                  className="absolute flex flex-col items-center justify-center transition-shadow"
                  style={{
                    left: displayX * CELL + 4,
                    top: displayY * CELL + 4,
                    width: lt.w * CELL - 8,
                    height: lt.h * CELL - 8,
                    backgroundColor: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: lt.shape === 'round' ? '50%' : '10px',
                    cursor: editMode ? 'grab' : isOtherWaiter ? 'not-allowed' : 'pointer',
                    zIndex: isDraggingThis ? 20 : isSelected ? 10 : 1,
                    boxShadow: isSelected ? `0 0 0 3px rgba(245,158,11,0.35)` : isMergeSelected ? '0 0 0 3px rgba(59,130,246,0.35)' : isDraggingThis ? '0 4px 16px rgba(0,0,0,0.18)' : 'none',
                    opacity: isDraggingThis ? 0.85 : isOtherWaiter ? 0.6 : 1,
                    userSelect: 'none',
                  }}
                  onMouseEnter={() => setHoveredTable(liveTable.id)}
                  onMouseLeave={() => setHoveredTable(null)}
                  onMouseDown={(e) => handleLayoutMouseDown(e, lt)}
                  onTouchStart={(e) => handleLayoutTouchStart(e, lt)}
                  onClick={handleClick}
                >
                  {/* Lock icon for other waiter's tables */}
                  {isOtherWaiter && (
                    <div className="absolute top-1 right-1 text-gray-400 z-10">
                      <Lock size={10} />
                    </div>
                  )}

                  {/* Merge badge */}
                  {isMerged && !isOtherWaiter && (
                    <div className="absolute top-1 right-1 flex items-center gap-0.5 px-1 py-0.5 rounded-full z-10" style={{ backgroundColor: 'rgba(168,85,247,0.2)', fontSize: '8px', color: '#7c3aed' }}>
                      <Link2 size={7} />
                      <span className="font-bold">{mergeGroupSize}</span>
                    </div>
                  )}

                  {/* Unmerge button */}
                  {isMerged && isHovered && !mergeMode && !editMode && !isOtherWaiter && onUnmerge && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUnmerge(liveTable); }}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center z-20 transition-colors"
                      style={{ backgroundColor: 'rgba(239,68,68,0.8)' }}
                      title="Separar mesas"
                    >
                      <X size={9} className="text-white" />
                    </button>
                  )}

                  {/* Delete button in edit mode */}
                  {editMode && isHovered && onDeleteTable && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); onDeleteTable(liveTable.number); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center z-20 transition-colors"
                      style={{ backgroundColor: 'rgba(239,68,68,0.85)' }}
                      title="Eliminar mesa"
                    >
                      <Trash2 size={9} className="text-white" />
                    </button>
                  )}

                  {/* Merge selection checkmark */}
                  {mergeMode && isMergeSelected && (
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center z-20" style={{ backgroundColor: '#3b82f6' }}>
                      <span className="text-white font-bold" style={{ fontSize: '9px' }}>✓</span>
                    </div>
                  )}

                  {/* Move icon in edit mode */}
                  {editMode && !isHovered && (
                    <Move size={10} className="absolute top-1 left-1 opacity-30" style={{ color: textColor }} />
                  )}

                  {isOtherWaiter ? (
                    <>
                      <div className="text-lg leading-none mb-0.5">🔒</div>
                      <div className="text-xs font-medium text-center leading-tight truncate px-1" style={{ color: textColor, fontSize: '10px', maxWidth: '90%' }}>
                        {liveTable.name.replace('Mesa ', '').length > 6 ? liveTable.name.replace('Mesa ', 'M.') : liveTable.name}
                      </div>
                      <div className="mt-0.5 text-center" style={{ fontSize: '8px', color: '#9ca3af' }}>
                        {liveTable.waiter?.split(' ')[0]}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-bold leading-none mb-0.5" style={{ color: textColor }}>{liveTable.number}</div>
                      <div className="text-xs font-medium text-center leading-tight truncate px-1" style={{ color: textColor, fontSize: '10px', maxWidth: '90%' }}>
                        {liveTable.name.replace('Mesa ', '').length > 6 ? liveTable.name.replace('Mesa ', 'M.') : liveTable.name}
                      </div>
                      <div className="flex items-center gap-0.5 mt-0.5" style={{ color: textColor, opacity: 0.7 }}>
                        <Users size={9} />
                        <span style={{ fontSize: '9px' }}>{liveTable.capacity}</span>
                      </div>

                      {(liveTable.status === 'ocupada' || isMerged) && liveTable.openedAt && (
                        <div className="flex items-center gap-0.5 mt-1" style={{ color: textColor, opacity: 0.8 }}>
                          <Clock size={8} />
                          <span style={{ fontSize: '8px' }}>{liveTable.openedAt}</span>
                        </div>
                      )}
                      {liveTable.partialTotal !== undefined && (
                        <div className="mt-0.5 font-bold font-mono" style={{ fontSize: '9px', color: textColor }}>${liveTable.partialTotal}</div>
                      )}

                      {/* Hover overlay for libre tables */}
                      {liveTable.status === 'libre' && !isMerged && isHovered && !mergeMode && !editMode && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-green-500/10">
                          <Plus size={20} className="text-green-600" />
                        </div>
                      )}
                      {mergeMode && isHovered && !isMergeSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10" style={{ borderRadius: lt.shape === 'round' ? '50%' : '8px' }}>
                          <Plus size={20} className="text-blue-500" />
                        </div>
                      )}
                    </>
                  )}

                  {/* Status badge */}
                  <div
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full font-semibold"
                    style={{
                      fontSize: '8px',
                      backgroundColor: isOtherWaiter ? '#f3f4f6' : isMerged ? 'rgba(168,85,247,0.15)' : liveTable.status === 'libre' ? '#dcfce7' : liveTable.status === 'ocupada' ? '#fee2e2' : '#fef3c7',
                      color: isOtherWaiter ? '#9ca3af' : isMerged ? '#7c3aed' : liveTable.status === 'libre' ? '#166534' : liveTable.status === 'ocupada' ? '#991b1b' : '#92400e',
                    }}
                  >
                    {isOtherWaiter ? 'Bloqueada' : isMerged ? 'Unida' : statusLabel[liveTable.status]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Waiter legend */}
        {tables.some((t) => t.waiter) && (
          <div className="mt-4 p-4 rounded-xl border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Meseros en turno</p>
            <div className="flex flex-wrap gap-3">
              {Array.from(new Set(tables.filter((t) => t.waiter).map((t) => t.waiter!))).map((name) => {
                const count = tables.filter((t) => t.waiter === name).length;
                const initials = name.split(' ').map((n) => n[0]).join('');
                return (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#1B3A6B', color: '#f59e0b', fontSize: '9px' }}>{initials}</div>
                    <span className="text-xs text-gray-600">{name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>{count} mesa{count !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── GRID MODE (fallback when no layout) ──────────────────────────────────
  return (
    <>
    <div className="p-5">
      {/* Legend + Summary */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-200 border border-green-400" />
            <span className="text-xs text-gray-500">Libre ({libre})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-200 border border-red-400" />
            <span className="text-xs text-gray-500">Ocupada ({ocupada})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-400" />
            <span className="text-xs text-gray-500">En Espera ({espera})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-purple-200 border border-purple-400" />
            <span className="text-xs text-gray-500">Unidas</span>
          </div>
        </div>
        <div className="ml-auto text-xs text-gray-400">
          {ocupada}/{tables.length} mesas ocupadas · {tables.length > 0 ? Math.round((ocupada / tables.length) * 100) : 0}% ocupación
        </div>
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-4 gap-3">
        {tables.map((table) => {
          const isSelected = selectedTableId === table.id;
          const isMergeSelected = mergeSelection.includes(table.id);
          const isMerged = !!table.mergeGroupId;
          const isHovered = hoveredTable === table.id;
          const mergeGroupSize = isMerged ? (mergeGroups[table.mergeGroupId!]?.length ?? 1) : 0;
          // Waiter blocking: table occupied by a different waiter
          const isOtherWaiter = table.status === 'ocupada' && !!table.waiter && !!currentWaiter && table.waiter !== currentWaiter;

          let cellClass = 'table-map-cell ';
          if (isOtherWaiter) cellClass += 'table-espera'; // grey-ish
          else if (isMerged) cellClass += 'table-merged';
          else if (table.status === 'libre') cellClass += 'table-libre';
          else if (table.status === 'ocupada') cellClass += 'table-ocupada';
          else cellClass += 'table-espera';

          if (isSelected) cellClass += ' ring-2 ring-amber-400 ring-offset-2';
          if (isMergeSelected) cellClass += ' ring-2 ring-blue-500 ring-offset-2';

          const handleClick = () => {
            if (mergeMode) { onTableSelect(table); return; }
            if (isMerged) { onTableSelect(table); return; }
            if (table.status === 'libre') {
              if (reservedTables.includes(table.id)) {
                setReservConfirm({ table });
                return;
              }
              onMarkOccupied(table);
            }
            else onTableSelect(table);
          };

          return (
            <div
              key={table.id}
              className={cellClass}
              style={{ minHeight: '100px', position: 'relative', cursor: isOtherWaiter ? 'not-allowed' : 'pointer', opacity: isOtherWaiter ? 0.6 : 1 }}
              onMouseEnter={() => setHoveredTable(table.id)}
              onMouseLeave={() => setHoveredTable(null)}
              onClick={handleClick}
            >
              {isOtherWaiter && (
                <div className="absolute top-1.5 right-1.5 text-gray-400 z-10">
                  <Lock size={12} />
                </div>
              )}
              {isMerged && !isOtherWaiter && (
                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded-full text-purple-700 z-10" style={{ backgroundColor: 'rgba(168,85,247,0.15)', fontSize: '8px' }}>
                  <Link2 size={8} />
                  <span className="font-bold">{mergeGroupSize}</span>
                </div>
              )}
              {isMerged && isHovered && !mergeMode && !isOtherWaiter && onUnmerge && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUnmerge(table); }}
                  className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center z-20 transition-colors"
                  style={{ backgroundColor: 'rgba(239,68,68,0.8)' }}
                  title="Separar mesas"
                >
                  <X size={9} className="text-white" />
                </button>
              )}
              {mergeMode && isMergeSelected && (
                <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center z-20" style={{ backgroundColor: '#3b82f6' }}>
                  <span className="text-white font-bold" style={{ fontSize: '9px' }}>✓</span>
                </div>
              )}
              {isOtherWaiter ? (
                <>
                  <div className="text-xl leading-none mb-1">🔒</div>
                  <div className="text-xs font-medium text-center leading-tight mb-1 truncate w-full px-1">
                    {table.name.replace('Mesa ', '').length > 8 ? table.name.replace('Mesa ', 'M.') : table.name}
                  </div>
                  <div className="text-xs text-gray-400 text-center">{table.waiter?.split(' ')[0]}</div>
                </>
              ) : (
                <>
                  <div className="text-xl font-bold leading-none mb-1">{table.number}</div>
                  {reservedTables.includes(table.id) && table.status !== 'ocupada' && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(139,92,246,0.25)', color: '#ddd6fe', fontSize: '9px' }}>
                      Reservada
                    </span>
                  )}
                  <div className="text-xs font-medium text-center leading-tight mb-2 truncate w-full px-1">
                    {table.name.replace('Mesa ', '').length > 8 ? table.name.replace('Mesa ', 'M.') : table.name}
                  </div>
                  <div className="flex items-center gap-1 text-xs opacity-70">
                    <Users size={10} />
                    <span>{table.capacity}</span>
                  </div>
                  {(table.status === 'ocupada' || isMerged) && (
                    <div className="mt-2 w-full">
                      {table.openedAt && (
                        <div className="flex items-center gap-1 text-xs opacity-80 justify-center">
                          <Clock size={9} />
                          <span>{table.openedAt}</span>
                        </div>
                      )}
                      {table.itemCount !== undefined && (
                        <div className="flex items-center gap-1 text-xs opacity-80 justify-center mt-0.5">
                          <ShoppingBag size={9} />
                          <span>{table.itemCount} items</span>
                        </div>
                      )}
                      {table.partialTotal !== undefined && (
                        <div className="mt-1.5 text-xs font-bold text-center font-mono">${table.partialTotal}</div>
                      )}
                    </div>
                  )}
                  {table.status === 'espera' && !isMerged && (
                    <div className="mt-2 text-xs opacity-80 text-center">
                      {table.openedAt && (
                        <div className="flex items-center gap-1 justify-center">
                          <Clock size={9} />
                          <span>Desde {table.openedAt}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {table.status === 'libre' && !isMerged && isHovered && !mergeMode && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-green-500/10">
                      <Plus size={24} className="text-green-600" />
                    </div>
                  )}
                  {mergeMode && isHovered && !isMergeSelected && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-blue-500/10">
                      <Plus size={24} className="text-blue-500" />
                    </div>
                  )}
                </>
              )}
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                style={{
                  fontSize: '9px',
                  backgroundColor: isOtherWaiter ? '#f3f4f6' : isMerged ? 'rgba(168,85,247,0.15)' : table.status === 'libre' ? '#dcfce7' : table.status === 'ocupada' ? '#fee2e2' : '#fef3c7',
                  color: isOtherWaiter ? '#9ca3af' : isMerged ? '#7c3aed' : table.status === 'libre' ? '#166534' : table.status === 'ocupada' ? '#991b1b' : '#92400e',
                }}
              >
                {isOtherWaiter ? 'Bloqueada' : isMerged ? 'Unida' : statusLabel[table.status]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Waiter legend */}
      {tables.some((t) => t.waiter) && (
        <div className="mt-5 p-4 rounded-xl border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Meseros en turno</p>
          <div className="flex flex-wrap gap-3">
            {Array.from(new Set(tables.filter((t) => t.waiter).map((t) => t.waiter!))).map((name) => {
              const count = tables.filter((t) => t.waiter === name).length;
              const initials = name.split(' ').map((n) => n[0]).join('');
              return (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#1B3A6B', color: '#f59e0b', fontSize: '9px' }}>{initials}</div>
                  <span className="text-xs text-gray-600">{name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>{count} mesa{count !== 1 ? 's' : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>


      {/* ── Reservation warning modal ── */}
      {reservConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="reserv-warn-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#fef3c7' }}>
              <span className="text-2xl">📅</span>
            </div>
            <h3 id="reserv-warn-title" className="text-base font-bold text-center text-gray-900 mb-2">Reservación próxima</h3>
            <p className="text-sm text-center text-gray-500 mb-5">
              <strong className="text-gray-800">{reservConfirm.table.name}</strong> tiene una reservación en los próximos minutos. ¿Deseas sentar a alguien de todas formas?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setReservConfirm(null)} aria-label="Elegir otra mesa"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700">
                Elegir otra mesa
              </button>
              <button
                onClick={() => { onMarkOccupied(reservConfirm.table); setReservConfirm(null); }}
                aria-label="Confirmar sentar en mesa con reservación"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: '#f59e0b' }}>
                Sentar aquí
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}