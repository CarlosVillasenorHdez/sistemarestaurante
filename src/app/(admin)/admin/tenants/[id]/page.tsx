/**
 * /admin/tenants/[id]  →  Detalle de un tenant
 * Shows tenant details and allows plan/status changes.
 */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
  trial_ends_at: string | null;
  plan_valid_until: string | null;
  max_branches: number;
  max_users: number;
}

const PLANS = ['starter', 'profesional', 'enterprise'];

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<Partial<TenantDetail>>({});

  useEffect(() => {
    supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setTenant(data as TenantDetail);
          setDraft(data as TenantDetail);
        }
        setLoading(false);
      });
  }, [id, supabase]);

  async function handleSave() {
    if (!tenant) return;
    setSaving(true);
    await supabase
      .from('tenants')
      .update({
        plan: draft.plan,
        is_active: draft.is_active,
        plan_valid_until: draft.plan_valid_until || null,
      })
      .eq('id', id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.4)' }}>Cargando...</p>;
  if (!tenant) return <p style={{ color: '#f87171' }}>Tenant no encontrado.</p>;

  const field = (label: string, value: string | null) => (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#f1f5f9', fontFamily: value ? 'inherit' : 'monospace' }}>
        {value || '—'}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <Link href="/admin/tenants" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
          ← Tenants
        </Link>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{tenant.name}</h1>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{tenant.slug}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Info */}
        <div style={{ backgroundColor: '#1a2535', borderRadius: '12px', padding: '20px', border: '1px solid #1e2d3d' }}>
          <h3 style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 600, margin: '0 0 16px' }}>INFORMACIÓN</h3>
          {field('ID', tenant.id)}
          {field('Email del dueño', tenant.owner_email)}
          {field('País', tenant.country)}
          {field('Ciudad', tenant.city)}
          {field('Dirección', tenant.address)}
          {field('Registrado', tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('es-MX') : null)}
          {tenant.lat && field('Coordenadas', `${tenant.lat.toFixed(4)}, ${tenant.lng?.toFixed(4)}`)}
        </div>

        {/* Editable controls */}
        <div style={{ backgroundColor: '#1a2535', borderRadius: '12px', padding: '20px', border: '1px solid #1e2d3d' }}>
          <h3 style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 600, margin: '0 0 16px' }}>SUSCRIPCIÓN</h3>

          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Plan</label>
          <select
            value={draft.plan ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, plan: e.target.value }))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #2a3f5f', backgroundColor: '#0f1923', color: '#f1f5f9', fontSize: '14px', marginBottom: '14px' }}
          >
            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Plan válido hasta</label>
          <input
            type="date"
            value={draft.plan_valid_until ? draft.plan_valid_until.split('T')[0] : ''}
            onChange={(e) => setDraft((d) => ({ ...d, plan_valid_until: e.target.value || null }))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #2a3f5f', backgroundColor: '#0f1923', color: '#f1f5f9', fontSize: '14px', marginBottom: '14px', boxSizing: 'border-box' }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '20px' }}>
            <input
              type="checkbox"
              checked={draft.is_active ?? true}
              onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
            />
            <span style={{ fontSize: '14px', color: '#f1f5f9' }}>Tenant activo</span>
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
              backgroundColor: saved ? 'rgba(52,211,153,0.2)' : '#f59e0b',
              color: saved ? '#34d399' : '#1B3A6B',
              fontWeight: 700, fontSize: '14px', cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
        ID: {tenant.id}
      </div>
    </div>
  );
}
