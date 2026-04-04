'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { planPrice } from '@/lib/plans';

interface TenantRow {
  id: string;
  name: string;
  plan: string;
  is_active: boolean;
  trial_ends_at: string | null;
  plan_valid_until: string | null;
  created_at: string;
}

type TenantStatus = 'activo' | 'trial' | 'vencido' | 'inactivo';

function getTenantStatus(t: TenantRow): TenantStatus {
  if (!t.is_active) return 'inactivo';
  const now = new Date();
  if (t.trial_ends_at && new Date(t.trial_ends_at) > now && !t.plan_valid_until) return 'trial';
  if (t.plan_valid_until && new Date(t.plan_valid_until) < now) return 'vencido';
  return 'activo';
}

const STATUS_META: Record<TenantStatus, { label: string; color: string; bg: string }> = {
  activo:   { label: 'Activo',    color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  trial:    { label: 'Trial',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  vencido:  { label: 'Vencido',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  inactivo: { label: 'Inactivo',  color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
};

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tenants')
      .select('id,name,plan,is_active,trial_ends_at,plan_valid_until,created_at')
      .order('created_at', { ascending: false });
    setTenants((data as TenantRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const statuses = tenants.map(getTenantStatus);
  const kpis = {
    activos:  statuses.filter(s => s === 'activo').length,
    trial:    statuses.filter(s => s === 'trial').length,
    vencidos: statuses.filter(s => s === 'vencido').length,
    mrr:      tenants
      .filter((_, i) => statuses[i] === 'activo')
      .reduce((sum, t) => sum + planPrice(t.plan), 0),
  };

  const KPI_CARDS = [
    { label: 'Tenants activos',    value: loading ? '—' : String(kpis.activos),  icon: '🏪', color: '#34d399' },
    { label: 'En período de trial',value: loading ? '—' : String(kpis.trial),   icon: '⏳', color: '#60a5fa' },
    { label: 'Vencidos',           value: loading ? '—' : String(kpis.vencidos),icon: '⚠️',  color: '#f87171' },
    {
      label: 'MRR estimado',
      value: loading ? '—' : `$${kpis.mrr.toLocaleString('es-MX')}`,
      icon: '💰',
      color: '#f59e0b',
    },
  ];

  const recent = tenants.slice(0, 5);

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Panel de Administración</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Visibilidad global de todos los restaurantes en Aldente
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPI_CARDS.map(kpi => (
          <div key={kpi.label} className="rounded-xl p-5"
            style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
            <div className="text-2xl mb-2">{kpi.icon}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: kpi.color }}>
              {kpi.value}
            </div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* MRR breakdown */}
      {!loading && (
        <div className="rounded-xl p-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            DESGLOSE MRR POR PLAN
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {(['basico', 'estandar', 'premium'] as const).map(plan => {
              const count = tenants.filter((t, i) => t.plan === plan && statuses[i] === 'activo').length;
              const mrr = count * planPrice(plan);
              return (
                <div key={plan} className="text-center">
                  <div className="text-lg font-bold font-mono" style={{ color: '#f59e0b' }}>
                    ${mrr.toLocaleString('es-MX')}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {plan} · {count} restaurante{count !== 1 ? 's' : ''} · ${planPrice(plan).toLocaleString('es-MX')}/mes
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent tenants */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
            ÚLTIMOS 5 REGISTROS
          </h2>
          <Link href="/admin/tenants"
            className="text-xs font-medium" style={{ color: '#f59e0b' }}>
            Ver todos →
          </Link>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2d3d' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#0d1720' }}>
                {['Restaurante', 'Plan', 'Estado', 'Registrado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                    style={{ color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid #1e2d3d' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>Cargando...</td></tr>
              ) : recent.map((t, i) => {
                const status = getTenantStatus(t);
                const meta = STATUS_META[status];
                return (
                  <tr key={t.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? '#0f1923' : 'rgba(255,255,255,0.015)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/tenants/${t.id}`}
                        className="font-medium hover:underline" style={{ color: '#f1f5f9' }}>
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)' }}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: meta.color, backgroundColor: meta.bg }}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {new Date(t.created_at).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
