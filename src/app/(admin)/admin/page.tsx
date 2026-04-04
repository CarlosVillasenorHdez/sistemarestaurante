/**
 * /admin  →  Superadmin dashboard
 * Shows KPIs across all tenants. Real data comes in Week 2 (useTenant hook).
 */
import React from 'react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
          Panel de Superadmin
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
          Visibilidad global de todos los restaurantes registrados en Aldente.
        </p>
      </div>

      {/* Placeholder KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Tenants activos', value: '—', icon: '🏪' },
          { label: 'En período de prueba', value: '—', icon: '⏳' },
          { label: 'Suscripciones pagadas', value: '—', icon: '💳' },
          { label: 'MRR', value: '—', icon: '💰' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              backgroundColor: '#1a2535',
              border: '1px solid #1e2d3d',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{kpi.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <Link
          href="/admin/tenants"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            backgroundColor: '#f59e0b',
            color: '#1B3A6B',
            fontWeight: 600,
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          🏪 Ver todos los restaurantes
        </Link>
      </div>
    </div>
  );
}
