'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface AdminKPIs {
  total: number;
  active: number;
  trial: number;
  paid: number;
  mrr: number;
}

interface TenantDot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  plan: string;
  is_active: boolean;
}

const PLAN_MXN: Record<string, number> = { basico: 800, estandar: 1500, premium: 2500 };
const PLAN_COLOR: Record<string, string> = { basico: '#6b7280', estandar: '#f59e0b', premium: '#a78bfa' };

function worldToSVG(lat: number, lng: number, w = 640, h = 320): [number, number] {
  const x = ((lng + 180) / 360) * w;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = (h / 2) - (w * mercN) / (2 * Math.PI);
  return [x, Math.max(0, Math.min(h, y))];
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [dots, setDots] = useState<TenantDot[]>([]);
  const [tooltip, setTooltip] = useState<{ name: string; plan: string; x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('v_tenant_map')
      .select('id, name, plan, is_active, trial_ends_at, plan_valid_until, lat, lng')
      .then(({ data }) => {
        const rows = (data ?? []) as Array<{
          id: string; name: string; plan: string; is_active: boolean;
          trial_ends_at: string | null; plan_valid_until: string | null;
          lat: number | null; lng: number | null;
        }>;
        const now = new Date();
        let active = 0, trial = 0, paid = 0, mrr = 0;
        rows.forEach(r => {
          if (!r.is_active) return;
          active++;
          if (!r.plan_valid_until && r.trial_ends_at && new Date(r.trial_ends_at) > now) trial++;
          if (r.plan_valid_until && new Date(r.plan_valid_until) > now) { paid++; mrr += PLAN_MXN[r.plan] ?? 0; }
        });
        setKpis({ total: rows.length, active, trial, paid, mrr });
        setDots(rows.filter(r => r.lat && r.lng).map(r => ({ id: r.id, name: r.name, plan: r.plan, is_active: r.is_active, lat: r.lat!, lng: r.lng! })));
        setLoading(false);
      });
  }, []);

  const kpiCards = [
    { label: 'Tenants totales',       value: kpis?.total ?? '—', icon: '🏪' },
    { label: 'Activos',               value: kpis?.active ?? '—', icon: '✅' },
    { label: 'En período de prueba',  value: kpis?.trial ?? '—', icon: '⏳' },
    { label: 'Suscripciones pagadas', value: kpis?.paid ?? '—', icon: '💳' },
    { label: 'MRR', value: kpis ? `$${kpis.mrr.toLocaleString('es-MX')}` : '—', icon: '💰' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Panel de Superadmin</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
          Visibilidad global de todos los restaurantes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {kpiCards.map(k => (
          <div key={k.label} style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{k.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>{loading ? '…' : k.value}</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '14px' }}>Distribución geográfica</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            {Object.entries(PLAN_COLOR).map(([plan, color]) => (
              <span key={plan} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
                {plan}
              </span>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 640 320" width="100%" style={{ borderRadius: '8px', backgroundColor: '#0d1720' }}>
          {[0, 80, 160, 240, 320].map(y => <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="#1e2d3d" strokeWidth="0.5" />)}
          {[0, 128, 256, 384, 512, 640].map(x => <line key={x} x1={x} y1="0" x2={x} y2="320" stroke="#1e2d3d" strokeWidth="0.5" />)}
          {dots.map(d => {
            const [x, y] = worldToSVG(d.lat, d.lng);
            const color = PLAN_COLOR[d.plan] ?? '#6b7280';
            return (
              <g key={d.id} style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTooltip({ name: d.name, plan: d.plan, x, y })}
                onMouseLeave={() => setTooltip(null)}>
                <circle cx={x} cy={y} r="6" fill={color} fillOpacity={d.is_active ? 0.9 : 0.3} stroke="#0d1720" strokeWidth="1" />
                <circle cx={x} cy={y} r="10" fill={color} fillOpacity={0.15} />
              </g>
            );
          })}
          {tooltip && (() => {
            const tx = Math.min(tooltip.x + 12, 540);
            const ty = Math.max(tooltip.y - 32, 8);
            return (
              <g>
                <rect x={tx} y={ty} width="120" height="36" rx="6" fill="#1a2535" stroke="#2a3f5f" strokeWidth="0.5" />
                <text x={tx + 8} y={ty + 14} fontSize="11" fill="#f1f5f9" fontWeight="500">{tooltip.name.slice(0, 16)}</text>
                <text x={tx + 8} y={ty + 28} fontSize="10" fill={PLAN_COLOR[tooltip.plan] ?? '#6b7280'}>{tooltip.plan}</text>
              </g>
            );
          })()}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <Link href="/admin/tenants" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', backgroundColor: '#f59e0b', color: '#1B3A6B', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
          🏪 Ver todos los restaurantes
        </Link>
      </div>
    </div>
  );
}
