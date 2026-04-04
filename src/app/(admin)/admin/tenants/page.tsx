'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { planPrice, PLAN_MODULES, type PlanKey } from '@/lib/plans';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  trial_ends_at: string | null;
  plan_valid_until: string | null;
  created_at: string;
  owner_email: string | null;
}

type TenantStatus = 'activo' | 'trial' | 'vencido' | 'inactivo';

function getStatus(t: Tenant): TenantStatus {
  if (!t.is_active) return 'inactivo';
  const now = new Date();
  if (t.trial_ends_at && new Date(t.trial_ends_at) > now && !t.plan_valid_until) return 'trial';
  if (t.plan_valid_until && new Date(t.plan_valid_until) < now) return 'vencido';
  return 'activo';
}

const STATUS_META: Record<TenantStatus, { label: string; color: string; bg: string }> = {
  activo:   { label: 'Activo',   color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  trial:    { label: 'Trial',    color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  vencido:  { label: 'Vencido',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  inactivo: { label: 'Inactivo', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
};

const PLANS = Object.keys(PLAN_MODULES) as PlanKey[];

export default function TenantsPage() {
  const supabase = createClient();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tenants')
      .select('id,name,slug,plan,is_active,trial_ends_at,plan_valid_until,created_at,owner_email')
      .order('created_at', { ascending: false });
    setTenants((data as Tenant[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function changePlan(id: string, plan: string) {
    setUpdating(id + ':plan');
    await supabase.from('tenants').update({ plan, updated_at: new Date().toISOString() }).eq('id', id);
    setTenants(prev => prev.map(t => t.id === id ? { ...t, plan } : t));
    setUpdating(null);
  }

  async function toggleActive(id: string, current: boolean) {
    setUpdating(id + ':active');
    const is_active = !current;
    await supabase.from('tenants').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id);
    setTenants(prev => prev.map(t => t.id === id ? { ...t, is_active } : t));
    setUpdating(null);
  }

  const filtered = search
    ? tenants.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.slug.toLowerCase().includes(search.toLowerCase()) ||
        (t.owner_email ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : tenants;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Tenants</h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {tenants.length} restaurante{tenants.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar por nombre, slug o email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{
          backgroundColor: '#1a2535',
          border: '1px solid #1e2d3d',
          color: '#f1f5f9',
          maxWidth: '400px',
        }}
      />

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2d3d' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#0d1720' }}>
              {['Restaurante', 'Plan', 'Estado', 'Vencimiento', 'Activo', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                  style={{ color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid #1e2d3d' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10"
                style={{ color: 'rgba(255,255,255,0.3)' }}>Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10"
                style={{ color: 'rgba(255,255,255,0.3)' }}>Sin resultados</td></tr>
            ) : filtered.map((t, i) => {
              const status = getStatus(t);
              const meta = STATUS_META[status];
              const isUpdatingPlan = updating === t.id + ':plan';
              const isUpdatingActive = updating === t.id + ':active';
              return (
                <tr key={t.id}
                  style={{
                    backgroundColor: i % 2 === 0 ? '#0f1923' : 'rgba(255,255,255,0.015)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                  {/* Name */}
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: '#f1f5f9' }}>{t.name}</p>
                    <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.slug}</p>
                  </td>

                  {/* Plan dropdown */}
                  <td className="px-4 py-3">
                    <select
                      value={t.plan}
                      disabled={isUpdatingPlan}
                      onChange={e => changePlan(t.id, e.target.value)}
                      className="rounded-lg px-2 py-1 text-xs outline-none appearance-none"
                      style={{
                        backgroundColor: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        color: '#f59e0b',
                        cursor: 'pointer',
                        opacity: isUpdatingPlan ? 0.5 : 1,
                      }}>
                      {PLANS.map(p => (
                        <option key={p} value={p} style={{ backgroundColor: '#1a2535', color: '#f1f5f9' }}>
                          {PLAN_MODULES[p].label} · ${planPrice(p).toLocaleString('es-MX')}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ color: meta.color, backgroundColor: meta.bg }}>
                      {meta.label}
                    </span>
                  </td>

                  {/* Expiry */}
                  <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {t.plan_valid_until
                      ? new Date(t.plan_valid_until).toLocaleDateString('es-MX')
                      : t.trial_ends_at
                      ? `Trial hasta ${new Date(t.trial_ends_at).toLocaleDateString('es-MX')}`
                      : '—'}
                  </td>

                  {/* Toggle */}
                  <td className="px-4 py-3">
                    <button
                      disabled={isUpdatingActive}
                      onClick={() => toggleActive(t.id, t.is_active)}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                      style={{
                        backgroundColor: t.is_active ? '#34d399' : '#374151',
                        opacity: isUpdatingActive ? 0.5 : 1,
                        cursor: isUpdatingActive ? 'wait' : 'pointer',
                        border: 'none',
                      }}>
                      <span className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                        style={{ transform: t.is_active ? 'translateX(18px)' : 'translateX(2px)' }} />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <Link href={`/admin/tenants/${t.id}`}
                      className="text-xs font-medium" style={{ color: '#f59e0b' }}>
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
