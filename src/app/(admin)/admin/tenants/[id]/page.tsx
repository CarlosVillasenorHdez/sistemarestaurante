'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PLAN_MODULES, planPrice, type PlanKey } from '@/lib/plans';

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  owner_email: string | null;
  country: string;
  city: string;
  state_region: string;
  address: string;
  lat: number | null;
  lng: number | null;
  timezone: string;
  created_at: string;
  updated_at: string;
  trial_ends_at: string | null;
  plan_valid_until: string | null;
  max_branches: number;
  max_users: number;
}

const PLANS = Object.keys(PLAN_MODULES) as PlanKey[];

function toInputDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [extending, setExtending] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // Editable draft
  const [draft, setDraft] = useState<Partial<TenantDetail>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from('tenants').select('*').eq('id', id).single();
    if (data) {
      setTenant(data as TenantDetail);
      setDraft(data as TenantDetail);
    }
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => { load(); }, [load]);

  function set<K extends keyof TenantDetail>(key: K, value: TenantDetail[K]) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    await supabase.from('tenants').update({
      name:            draft.name,
      plan:            draft.plan,
      is_active:       draft.is_active,
      owner_email:     draft.owner_email || null,
      country:         draft.country,
      city:            draft.city,
      state_region:    draft.state_region,
      address:         draft.address,
      timezone:        draft.timezone,
      max_branches:    draft.max_branches,
      max_users:       draft.max_users,
      plan_valid_until: draft.plan_valid_until || null,
      updated_at:      new Date().toISOString(),
    }).eq('id', id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await load();
  }

  async function extender30Dias() {
    if (!tenant) return;
    setExtending(true);
    const base = tenant.plan_valid_until
      ? new Date(tenant.plan_valid_until)
      : new Date();
    base.setDate(base.getDate() + 30);
    const nueva = base.toISOString();
    await supabase.from('tenants').update({
      plan_valid_until: nueva,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    setExtending(false);
    await load();
  }

  async function darDeBaja() {
    if (!confirm('¿Dar de baja este tenant? Perderá acceso inmediatamente.')) return;
    setDisabling(true);
    await supabase.from('tenants').update({
      is_active: false,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    setDisabling(false);
    await load();
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!tenant) return (
    <p className="text-sm" style={{ color: '#f87171' }}>Tenant no encontrado.</p>
  );

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #2a3f5f',
    backgroundColor: '#0f1923',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
        <Link href="/admin/tenants" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
          Tenants
        </Link>
        <span>/</span>
        <span style={{ color: '#f1f5f9' }}>{tenant.name}</span>
      </div>

      {/* Title + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>{tenant.name}</h1>
          <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {tenant.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Extend 30 days */}
          <button
            onClick={extender30Dias}
            disabled={extending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              backgroundColor: 'rgba(96,165,250,0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(96,165,250,0.3)',
              opacity: extending ? 0.5 : 1,
              cursor: extending ? 'wait' : 'pointer',
            }}>
            ⏳ {extending ? 'Extendiendo...' : 'Extender 30 días'}
          </button>
          {/* Dar de baja */}
          {tenant.is_active && (
            <button
              onClick={darDeBaja}
              disabled={disabling}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: 'rgba(248,113,113,0.12)',
                color: '#f87171',
                border: '1px solid rgba(248,113,113,0.3)',
                opacity: disabling ? 0.5 : 1,
                cursor: disabling ? 'wait' : 'pointer',
              }}>
              🔴 {disabling ? 'Procesando...' : 'Dar de baja'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Col 1: Info general ── */}
        <div className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
          <h3 className="text-xs font-bold" style={{ color: '#f59e0b' }}>INFORMACIÓN GENERAL</h3>

          <div>
            <label style={labelStyle}>Nombre del restaurante</label>
            <input style={inputStyle} value={draft.name ?? ''} onChange={e => set('name', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Email del dueño</label>
            <input style={inputStyle} type="email" value={draft.owner_email ?? ''}
              onChange={e => set('owner_email', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>País</label>
              <input style={inputStyle} value={draft.country ?? ''} onChange={e => set('country', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Ciudad</label>
              <input style={inputStyle} value={draft.city ?? ''} onChange={e => set('city', e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Dirección</label>
            <input style={inputStyle} value={draft.address ?? ''} onChange={e => set('address', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Zona horaria</label>
            <input style={inputStyle} value={draft.timezone ?? ''} onChange={e => set('timezone', e.target.value)} />
          </div>
        </div>

        {/* ── Col 2: Suscripción ── */}
        <div className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
          <h3 className="text-xs font-bold" style={{ color: '#f59e0b' }}>SUSCRIPCIÓN</h3>

          <div>
            <label style={labelStyle}>Plan</label>
            <select style={inputStyle} value={draft.plan ?? ''}
              onChange={e => set('plan', e.target.value)}>
              {PLANS.map(p => (
                <option key={p} value={p}>
                  {PLAN_MODULES[p].label} — ${planPrice(p).toLocaleString('es-MX')}/mes
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Plan válido hasta</label>
            <input style={inputStyle} type="date"
              value={toInputDate(draft.plan_valid_until)}
              onChange={e => set('plan_valid_until', e.target.value ? e.target.value + 'T00:00:00Z' : null as unknown as string)} />
          </div>

          <div>
            <label style={labelStyle}>Trial termina</label>
            <input style={{ ...inputStyle, opacity: 0.5 }} type="date"
              value={toInputDate(tenant.trial_ends_at)} disabled />
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Solo lectura — se asigna al crear el tenant
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Máx. sucursales</label>
              <input style={inputStyle} type="number" min={1}
                value={draft.max_branches ?? 1}
                onChange={e => set('max_branches', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label style={labelStyle}>Máx. usuarios</label>
              <input style={inputStyle} type="number" min={1}
                value={draft.max_users ?? 5}
                onChange={e => set('max_users', parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={draft.is_active ?? true}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4" />
            <span className="text-sm" style={{ color: '#f1f5f9' }}>Tenant activo</span>
          </label>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            backgroundColor: saved ? 'rgba(52,211,153,0.2)' : '#f59e0b',
            color: saved ? '#34d399' : '#1B3A6B',
            opacity: saving ? 0.7 : 1,
            cursor: saving ? 'wait' : 'pointer',
            border: saved ? '1px solid rgba(52,211,153,0.4)' : 'none',
          }}>
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Última actualización: {new Date(tenant.updated_at).toLocaleString('es-MX')}
        </p>
      </div>

      {/* Meta info */}
      <div className="rounded-xl p-4 text-xs space-y-1"
        style={{ backgroundColor: '#0d1720', border: '1px solid #1e2d3d' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Slug:</span> {tenant.slug}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Registrado:</span>{' '}
          {new Date(tenant.created_at).toLocaleString('es-MX')}
        </p>
        {tenant.lat && (
          <p style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Coordenadas:</span>{' '}
            {tenant.lat.toFixed(5)}, {tenant.lng?.toFixed(5)}
          </p>
        )}
      </div>
    </div>
  );
}
