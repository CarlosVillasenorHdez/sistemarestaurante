'use client';

/**
 * (admin)/layout.tsx
 *
 * Superadmin layout — auth via Supabase Auth (email/password), completely
 * independent from the ERP PIN flow and AuthContext.
 *
 * Guard: checks supabase.auth.getSession() + app_role = 'superadmin' in app_users.
 * No Sidebar, no Topbar, no AuthContext from the ERP.
 */
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface AdminUser {
  authId: string;
  fullName: string;
}

const NAV = [
  { href: '/admin',         label: 'Dashboard', icon: '📊' },
  { href: '/admin/tenants', label: 'Tenants',   icon: '🏪' },
  // { href: '/admin/pagos', label: 'Pagos',    icon: '💳' }, // Semana 4
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase    = createClient();
  const router      = useRouter();
  const pathname    = usePathname();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Skip auth check on /admin/login itself
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) { setLoading(false); return; }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/admin/login');
        return;
      }
      const { data } = await supabase
        .from('app_users')
        .select('app_role, full_name')
        .eq('auth_user_id', session.user.id)
        .single();

      if (!data || (data as any).app_role !== 'superadmin') {
        await supabase.auth.signOut();
        router.replace('/admin/login');
        return;
      }
      setAdminUser({ authId: session.user.id, fullName: (data as any).full_name ?? 'Superadmin' });
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  // Let the login page render without the shell
  if (isLoginPage) return <>{children}</>;

  // Spinner while verifying
  if (loading || !adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0f1a' }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0a0f1a', color: '#f1f5f9' }}>
      {/* ── Sidebar ── */}
      <aside className="flex-shrink-0 flex flex-col"
        style={{ width: sidebarOpen ? '200px' : '56px', backgroundColor: '#0d1720', borderRight: '1px solid #1e2d3d', transition: 'width 200ms ease', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 py-4" style={{ borderBottom: '1px solid #1e2d3d', minHeight: '56px' }}>
          <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.2)' }}>🛡</div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: '#f59e0b' }}>Aldente Admin</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>Panel interno</p>
            </div>
          )}
        </div>
        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg text-sm transition-all"
                style={{ backgroundColor: active ? 'rgba(245,158,11,0.15)' : 'transparent', color: active ? '#f59e0b' : 'rgba(255,255,255,0.55)', fontWeight: active ? 600 : 400, borderLeft: active ? '2px solid #f59e0b' : '2px solid transparent', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span className="text-base flex-shrink-0">{icon}</span>
                {sidebarOpen && label}
              </Link>
            );
          })}
        </nav>
        {/* Bottom */}
        <div className="p-2 space-y-1" style={{ borderTop: '1px solid #1e2d3d' }}>
          {sidebarOpen && (
            <div className="px-2 py-1.5">
              <p className="text-xs font-semibold truncate" style={{ color: '#f1f5f9' }}>{adminUser.fullName}</p>
              <button onClick={handleSignOut} className="text-xs mt-0.5 hover:underline" style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Cerrar sesión
              </button>
            </div>
          )}
          <button onClick={() => setSidebarOpen(v => !v)}
            className="w-full flex items-center justify-center py-1.5 rounded-lg text-xs transition-all"
            style={{ color: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer' }}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex-shrink-0 flex items-center justify-between px-6"
          style={{ height: '56px', backgroundColor: '#0d1720', borderBottom: '1px solid #1e2d3d', position: 'sticky', top: 0, zIndex: 40 }}>
          <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
            {NAV.find(n => n.href === pathname || (pathname.startsWith(n.href) && n.href !== '/admin'))?.label ?? 'Dashboard'}
          </span>
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>Aldente v1.1</span>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
