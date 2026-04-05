/**
 * /admin/tenants  →  Lista de todos los tenants
 * Reads from v_tenant_map view (created in migration 20260402000000).
 * Heatmap integration planned for Week 2.
 */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  country: string;
  city: string;
  active_users: number;
  active_branches: number;
  created_at: string;
  trial_ends_at: string | null;
  plan_valid_until: string | null;
}

const PLAN_COLORS: Record<string, { color: string; bg: string }> = {
  starter:     { color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
  profesional: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  enterprise:  { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
};

export default function TenantsPage() {
  const supabase = createClient();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('v_tenant_map')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTenants((data as TenantRow[]) ?? []);
        setLoading(false);
      });
  }, [supabase]);

  const filtered = search
    ? tenants.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.slug.toLowerCase().includes(search.toLowerCase()) ||
          (t.city ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : tenants;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            Restaurantes registrados
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Link href="/admin" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
          ← Volver al dashboard
        </Link>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar por nombre, slug o ciudad..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid #1e2d3d',
          backgroundColor: '#1a2535',
          color: '#f1f5f9',
          fontSize: '14px',
          marginBottom: '16px',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Table */}
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e2d3d' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0d1720' }}>
              {['Restaurante', 'Plan', 'País / Ciudad', 'Usuarios', 'Estado', 'Registrado', ''].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.4)',
                    borderBottom: '1px solid #1e2d3d',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
                  Cargando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
                  {search ? 'Sin resultados' : 'Sin tenants registrados'}
                </td>
              </tr>
            ) : (
              filtered.map((t, i) => {
                const planMeta = PLAN_COLORS[t.plan] ?? PLAN_COLORS.starter;
                return (
                  <tr
                    key={t.id}
                    style={{ backgroundColor: i % 2 === 0 ? '#0f1923' : 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{t.name}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{t.slug}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: planMeta.color, backgroundColor: planMeta.bg }}>
                        {t.plan}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.6)' }}>
                      {t.country || '—'}{t.city ? ` · ${t.city}` : ''}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                      {t.active_users ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        color: t.is_active ? '#34d399' : '#f87171',
                        backgroundColor: t.is_active ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }}>
                        {t.is_active ? 'activo' : 'inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                      {t.created_at ? new Date(t.created_at).toLocaleDateString('es-MX') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/admin/tenants/${t.id}`}
                        style={{ fontSize: '13px', color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
