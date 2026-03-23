'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, ShoppingCart, UtensilsCrossed, ClipboardList, Package, Users, BarChart3, Settings, ChevronLeft, ChevronRight, LogOut, Bell, GitBranch, Shield, Receipt, ChefHat, Calendar, Truck, Star, Building2, Smartphone, UserCog, BellRing,  } from 'lucide-react';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  pageKey: string;
}

// ─── All nav items with pageKey ───────────────────────────────────────────────

const navGroups: { group: string; items: NavItem[] }[] = [
  {
    group: 'OPERACIONES',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', pageKey: 'dashboard' },
      { label: 'Punto de Venta', icon: ShoppingCart, href: '/pos-punto-de-venta', pageKey: 'pos' },
      { label: 'Mesero Móvil', icon: Smartphone, href: '/mesero', pageKey: 'mesero' },
      { label: 'Órdenes', icon: ClipboardList, href: '/orders-management', badge: 3, pageKey: 'orders' },
      { label: 'Cocina', icon: ChefHat, href: '/cocina', pageKey: 'cocina' },
      { label: 'Delivery', icon: Truck, href: '/delivery', pageKey: 'delivery' },
    ],
  },
  {
    group: 'GESTIÓN',
    items: [
      { label: 'Menú', icon: UtensilsCrossed, href: '/menu', pageKey: 'menu' },
      { label: 'Inventario', icon: Package, href: '/inventario', badge: 2, pageKey: 'inventario' },
      { label: 'Reservaciones', icon: Calendar, href: '/reservaciones', pageKey: 'reservaciones' },
      { label: 'Lealtad', icon: Star, href: '/lealtad', pageKey: 'lealtad' },
    ],
  },
  {
    group: 'PERSONAS',
    items: [
      { label: 'Personal', icon: Users, href: '/personal', pageKey: 'personal' },
      { label: 'Recursos Humanos', icon: UserCog, href: '/recursos-humanos', pageKey: 'recursos_humanos' },
      { label: 'Gastos', icon: Receipt, href: '/gastos', pageKey: 'gastos' },
      { label: 'Multi-Sucursal', icon: Building2, href: '/sucursales', pageKey: 'sucursales' },
    ],
  },
  {
    group: 'ANÁLISIS',
    items: [
      { label: 'Reportes', icon: BarChart3, href: '/reportes', pageKey: 'reportes' },
    ],
  },
  {
    group: 'SISTEMA',
    items: [
      { label: 'Alarmas', icon: BellRing, href: '/alarmas', pageKey: 'alarmas' },
      { label: 'Configuración', icon: Settings, href: '/configuracion', pageKey: 'configuracion' },
    ],
  },
];

// ─── Role display config ──────────────────────────────────────────────────────

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  cajero: 'Cajero',
  mesero: 'Mesero',
  cocinero: 'Cocinero',
  ayudante_cocina: 'Ayudante de Cocina',
  repartidor: 'Repartidor',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: '#f59e0b',
  gerente: '#3b82f6',
  cajero: '#8b5cf6',
  mesero: '#10b981',
  cocinero: '#ef4444',
  ayudante_cocina: '#f97316',
  repartidor: '#14b8a6',
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser, signOut, brandConfig } = useAuth();
  const supabase = createClient();

  const currentRole: AppRole = appUser?.appRole ?? 'mesero';
  const currentUser = {
    name: appUser?.fullName ?? 'Usuario',
    initials: (appUser?.fullName ?? 'U').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase(),
  };

  // Permissions from DB
  const [allowedPages, setAllowedPages] = useState<Set<string> | null>(null);
  const [branchName, setBranchName] = useState<string>('Sucursal Centro');

  // Dynamic sidebar colors from brandConfig
  const sidebarBg = brandConfig.theme === 'light' ? '#f8fafc' : (brandConfig.primaryColor || '#1B3A6B');
  const sidebarBorder = brandConfig.theme === 'light' ? '#e2e8f0' : '#243f72';
  const textColor = brandConfig.theme === 'light' ? '#1e293b' : 'rgba(255,255,255,0.85)';

  const loadPermissions = useCallback(async (role: AppRole) => {
    if (role === 'admin') {
      setAllowedPages(null); // null = all allowed
      return;
    }
    try {
      const { data } = await supabase
        .from('role_permissions')
        .select('page_key, can_access')
        .eq('role', role);
      if (data) {
        const allowed = new Set<string>(
          data.filter((r: any) => r.can_access).map((r: any) => r.page_key)
        );
        setAllowedPages(allowed);
      }
    } catch {
      setAllowedPages(null);
    }
  }, [supabase]);

  useEffect(() => {
    if (appUser?.appRole) {
      loadPermissions(appUser.appRole);
    }
  }, [appUser?.appRole, loadPermissions]);

  // Load branch name from system_config
  useEffect(() => {
    supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'branch_name')
      .single()
      .then(({ data }) => {
        if (data?.config_value) setBranchName(data.config_value);
      });
  }, [supabase]);

  function canAccess(pageKey: string): boolean {
    if (currentRole === 'admin') return true;
    if (allowedPages === null) return true;
    return allowedPages.has(pageKey);
  }

  const filteredGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => canAccess(item.pageKey)),
    }))
    .filter((g) => g.items.length > 0);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out flex-shrink-0"
      style={{ width: collapsed ? '64px' : '240px', backgroundColor: sidebarBg, borderRight: `1px solid ${sidebarBorder}` }}
    >
      {/* Logo + Branch */}
      <div className="flex items-center h-16 px-3 flex-shrink-0 border-b" style={{ borderColor: sidebarBorder }}>
        <div className="flex items-center gap-2 overflow-hidden">
          {brandConfig.logoUrl ? (
            <img src={brandConfig.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <AppLogo size={45} className="flex-shrink-0" />
          )}
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-700 truncate" style={{ color: brandConfig.accentColor || '#f59e0b', fontWeight: 700 }}>
                {brandConfig.restaurantName}
              </span>
              <span className="text-xs truncate" style={{ color: brandConfig.theme === 'light' ? '#64748b' : 'rgba(255,255,255,0.5)' }}>{branchName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Branch selector pill */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-150" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
            <GitBranch size={13} />
            <span className="truncate flex-1 text-left">{branchName}</span>
            <ChevronRight size={12} />
          </button>
        </div>
      )}

      {/* Role badge */}
      {!collapsed && (
        <div className="px-3 pt-2">
          <div
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${ROLE_COLORS[currentRole]}30` }}
          >
            <Shield size={12} style={{ color: ROLE_COLORS[currentRole] }} />
            <span className="flex-1 text-left truncate" style={{ color: ROLE_COLORS[currentRole] }}>
              {ROLE_LABELS[currentRole]}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
        {filteredGroups.map((group) => (
          <div key={group.group} className="mb-4">
            {!collapsed && (
              <p className="text-xs px-3 mb-1.5 tracking-widest" style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                {group.group}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`sidebar-nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '10px' }}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="flex-shrink-0 border-t p-2" style={{ borderColor: '#243f72' }}>
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-700 flex-shrink-0" style={{ backgroundColor: ROLE_COLORS[currentRole], color: '#1B3A6B' }}>
              {currentUser.initials}
            </div>
            <div className="flex flex-col overflow-hidden flex-1">
              <span className="text-xs font-600 truncate" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{currentUser.name}</span>
              <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{ROLE_LABELS[currentRole]}</span>
            </div>
            <Bell size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-150 hover:bg-red-500/15"
          style={{ color: 'rgba(255,255,255,0.5)', justifyContent: collapsed ? 'center' : 'flex-start' }}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={15} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-150 hover:bg-white/10 mt-1"
          style={{ color: 'rgba(255,255,255,0.4)', justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /><span>Colapsar</span></>}
        </button>
      </div>
    </aside>
  );
}