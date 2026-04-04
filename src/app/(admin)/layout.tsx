/**
 * (admin)/layout.tsx
 *
 * Superadmin panel layout — completely separate from the ERP.
 * No Sidebar, no Topbar, no AuthContext from the ERP flow.
 * Auth for admin routes will be handled independently.
 */
import React from 'react';

export const metadata = {
  title: 'Aldente Admin',
  robots: 'noindex, nofollow', // never index the admin panel
};

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0f1a',
        color: '#f1f5f9',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}
    >
      {/* Admin nav — minimal, intentionally sparse for now */}
      <header
        style={{
          borderBottom: '1px solid #1e2d3d',
          padding: '0 24px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0d1720',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245,158,11,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            🛡
          </div>
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#f59e0b' }}>
            Aldente Admin
          </span>
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.3)',
              marginLeft: '4px',
            }}
          >
            Panel de Administración
          </span>
        </div>
        <span
          style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}
        >
          superadmin
        </span>
      </header>

      {/* Page content */}
      <main style={{ padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
