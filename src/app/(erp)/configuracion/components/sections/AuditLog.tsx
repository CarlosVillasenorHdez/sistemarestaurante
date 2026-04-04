'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Search, RefreshCw, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AuditEntry {
  id: string;
  created_at: string;
  user_name: string;
  user_role: string;
  action: string;
  entity: string;
  entity_name: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  details: string | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  orden_cancelada:       { label: 'Orden cancelada',       color: '#f87171', bg: 'rgba(248,113,113,0.12)', emoji: '🚫' },
  merma_registrada:      { label: 'Merma registrada',      color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  emoji: '⚠️' },
  orden_cerrada:         { label: 'Orden cerrada',          color: '#34d399', bg: 'rgba(52,211,153,0.12)',  emoji: '✅' },
  precio_cambiado:       { label: 'Precio cambiado',        color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', emoji: '💰' },
  disponibilidad_cambiada:{ label: 'Disponibilidad',        color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  emoji: '👁' },
  platillo_eliminado:    { label: 'Platillo eliminado',     color: '#f87171', bg: 'rgba(248,113,113,0.12)', emoji: '🗑' },
  receta_modificada:     { label: 'Receta modificada',      color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  emoji: '📝' },
  corte_cerrado:         { label: 'Corte de caja',          color: '#34d399', bg: 'rgba(52,211,153,0.12)',  emoji: '🏦' },
  usuario_creado:        { label: 'Usuario creado',         color: '#34d399', bg: 'rgba(52,211,153,0.12)',  emoji: '👤' },
  usuario_desactivado:   { label: 'Usuario desactivado',    color: '#f87171', bg: 'rgba(248,113,113,0.12)', emoji: '🔒' },
  permisos_guardados:    { label: 'Permisos guardados',     color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', emoji: '🛡' },
  ingrediente_ajustado:  { label: 'Ingrediente ajustado',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  emoji: '📦' },
  layout_guardado:       { label: 'Layout guardado',        color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  emoji: '🗺' },
  merma_atencion:        { label: 'Merma por atención',     color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  emoji: '🔥' },
};

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_LABELS[action] ?? { label: action, color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', emoji: '•' };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: meta.color, backgroundColor: meta.bg }}>
      {meta.emoji} {meta.label}
    </span>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

function DiffCell({ old_value, new_value, action }: Pick<AuditEntry, 'old_value' | 'new_value' | 'action'>) {
  if (action === 'precio_cambiado' && old_value?.price !== undefined && new_value?.price !== undefined) {
    return (
      <span className="text-xs font-mono">
        <span style={{ color: '#f87171' }}>${Number(old_value.price).toFixed(2)}</span>
        {' → '}
        <span style={{ color: '#34d399' }}>${Number(new_value.price).toFixed(2)}</span>
      </span>
    );
  }
  if (action === 'disponibilidad_cambiada' && new_value?.available !== undefined) {
    return (
      <span className="text-xs" style={{ color: new_value.available ? '#34d399' : '#f87171' }}>
        {new_value.available ? '✓ Activado' : '✗ Desactivado'}
      </span>
    );
  }
  if (action === 'corte_cerrado' && new_value?.ventas_total !== undefined) {
    return (
      <span className="text-xs font-mono" style={{ color: '#34d399' }}>
        ${Number(new_value.ventas_total).toFixed(2)}
      </span>
    );
  }
  return null;
}

export default function AuditLog() {
  const supabase = createClient();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('audit_log')
      .select('id,created_at,user_name,user_role,action,entity,entity_name,old_value,new_value,details')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterAction) query = query.eq('action', filterAction);
    if (filterUser)   query = query.ilike('user_name', `%${filterUser}%`);

    const { data } = await query;
    setEntries((data as AuditEntry[]) || []);
    setLoading(false);
  }, [supabase, page, filterAction, filterUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? entries.filter(e =>
        e.user_name.toLowerCase().includes(search.toLowerCase()) ||
        (e.entity_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (e.details ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const uniqueActions = [...new Set(Object.keys(ACTION_LABELS))];

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
            <Shield size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>Historial de Auditoría</h2>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Registro inmutable de todas las acciones del sistema
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <input
            type="text" placeholder="Buscar por usuario, entidad o detalle..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', color: '#f1f5f9' }}
          />
        </div>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-lg text-sm outline-none appearance-none"
          style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', color: '#f1f5f9' }}>
          <option value="">Todas las acciones</option>
          {uniqueActions.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a]?.emoji} {ACTION_LABELS[a]?.label}</option>
          ))}
        </select>
        <input
          type="text" placeholder="Filtrar usuario..."
          value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(0); }}
          className="w-40 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', color: '#f1f5f9' }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2d3d' }}>
        {/* Header row */}
        <div className="grid text-xs font-semibold px-4 py-2.5"
          style={{ gridTemplateColumns: '110px 160px 120px 1fr 120px 28px', backgroundColor: '#0d1720', color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid #1e2d3d' }}>
          <span>Fecha / Hora</span>
          <span>Usuario</span>
          <span>Acción</span>
          <span>Entidad / Detalle</span>
          <span>Cambio</span>
          <span></span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12" style={{ backgroundColor: '#0f1923' }}>
            <RefreshCw size={20} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ backgroundColor: '#0f1923' }}>
            <Shield size={32} className="mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {search || filterAction || filterUser ? 'Sin resultados para este filtro' : 'Aún no hay registros de auditoría'}
            </p>
          </div>
        ) : (
          filtered.map((entry, idx) => {
            const { date, time } = formatTime(entry.created_at);
            const isExpanded = expanded === entry.id;
            return (
              <div key={entry.id}>
                <div
                  className="grid items-center px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    gridTemplateColumns: '110px 160px 120px 1fr 120px 28px',
                    backgroundColor: idx % 2 === 0 ? '#0f1923' : 'rgba(255,255,255,0.015)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onClick={() => setExpanded(isExpanded ? null : entry.id)}
                >
                  {/* Date/time */}
                  <div>
                    <p className="text-xs font-mono" style={{ color: '#f1f5f9' }}>{time}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{date}</p>
                  </div>
                  {/* User */}
                  <div>
                    <p className="text-sm truncate" style={{ color: '#f1f5f9' }}>{entry.user_name}</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{entry.user_role}</p>
                  </div>
                  {/* Action */}
                  <div><ActionBadge action={entry.action} /></div>
                  {/* Entity + detail */}
                  <div className="min-w-0">
                    <p className="text-sm truncate" style={{ color: '#f1f5f9' }}>
                      {entry.entity_name ?? entry.entity}
                    </p>
                    {entry.details && (
                      <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {entry.details}
                      </p>
                    )}
                  </div>
                  {/* Diff */}
                  <div>
                    <DiffCell old_value={entry.old_value} new_value={entry.new_value} action={entry.action} />
                  </div>
                  {/* Expand */}
                  <div className="flex justify-end">
                    <ChevronDown size={14}
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 py-3 text-xs space-y-2"
                    style={{ backgroundColor: 'rgba(245,158,11,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="grid grid-cols-2 gap-4">
                      {entry.old_value && (
                        <div>
                          <p className="font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Antes</p>
                          <pre className="text-xs font-mono px-3 py-2 rounded-lg overflow-auto"
                            style={{ backgroundColor: '#0d1720', color: '#f87171', maxHeight: 120 }}>
                            {JSON.stringify(entry.old_value, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.new_value && (
                        <div>
                          <p className="font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Después</p>
                          <pre className="text-xs font-mono px-3 py-2 rounded-lg overflow-auto"
                            style={{ backgroundColor: '#0d1720', color: '#34d399', maxHeight: 120 }}>
                            {JSON.stringify(entry.new_value, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                    {entry.details && !entry.old_value && !entry.new_value && (
                      <p style={{ color: 'rgba(255,255,255,0.6)' }}>{entry.details}</p>
                    )}
                    <p className="font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>ID: {entry.id}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && (entries.length === PAGE_SIZE || page > 0) && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30 transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
            ← Anterior
          </button>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Página {page + 1} · {filtered.length} registros
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={entries.length < PAGE_SIZE}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30 transition-all"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
