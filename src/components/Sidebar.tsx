'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, ShoppingCart, UtensilsCrossed, ClipboardList, Package, Users, BarChart3, Settings, ChevronLeft, ChevronRight, Bell, GitBranch, Receipt, ChefHat, Calendar, Truck, Star, Building2, Smartphone, UserCog, BellRing, Scissors, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useFeatures, type Features } from '@/hooks/useFeatures';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import Icon from '@/components/ui/AppIcon';





// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  pageKey: string;
  feature?: keyof Features;
}

// ─── All nav items ────────────────────────────────────────────────────────────

const navGroups: { group: string; items: NavItem[] }[] = [
  {
    group: 'OPERACIONES',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', pageKey: 'dashboard' },
      { label: 'Punto de Venta', icon: ShoppingCart, href: '/pos-punto-de-venta', pageKey: 'pos' },
      { label: 'Mesero Móvil', icon: Smartphone, href: '/mesero', pageKey: 'mesero', feature: 'meseroMovil' as keyof Features },
      { label: 'Órdenes', icon: ClipboardList, href: '/orders-management', pageKey: 'orders' },
      { label: 'Corte de Caja', icon: Scissors, href: '/corte-caja', pageKey: 'corte_caja' },
      { label: 'Cocina', icon: ChefHat, href: '/cocina', pageKey: 'cocina' },
      { label: 'Delivery', icon: Truck, href: '/delivery', pageKey: 'delivery', feature: 'delivery' as keyof Features },
    ],
  },
  {
    group: 'GESTIÓN',
    items: [
      { label: 'Menú', icon: UtensilsCrossed, href: '/menu', pageKey: 'menu' },
      { label: 'Inventario', icon: Package, href: '/inventario', pageKey: 'inventario', feature: 'inventario' as keyof Features },
      { label: 'Reservaciones', icon: Calendar, href: '/reservaciones', pageKey: 'reservaciones', feature: 'reservaciones' as keyof Features },
      { label: 'Lealtad', icon: Star, href: '/lealtad', pageKey: 'lealtad', feature: 'lealtad' as keyof Features },
    ],
  },
  {
    group: 'PERSONAS',
    items: [
      { label: 'Personal', icon: Users, href: '/personal', pageKey: 'personal' },
      { label: 'Recursos Humanos', icon: UserCog, href: '/recursos-humanos', pageKey: 'recursos_humanos', feature: 'recursosHumanos' as keyof Features },
      { label: 'Gastos', icon: Receipt, href: '/gastos', pageKey: 'gastos', feature: 'gastos' as keyof Features },
      { label: 'Multi-Sucursal', icon: Building2, href: '/sucursales', pageKey: 'sucursales', feature: 'multiSucursal' as keyof Features },
    ],
  },
  {
    group: 'ANÁLISIS',
    items: [
      { label: 'Reportes', icon: BarChart3, href: '/reportes', pageKey: 'reportes', feature: 'reportes' as keyof Features },
    ],
  },
  {
    group: 'SISTEMA',
    items: [
      { label: 'Alarmas', icon: BellRing, href: '/alarmas', pageKey: 'alarmas', feature: 'alarmas' as keyof Features },
      { label: 'Configuración', icon: Settings, href: '/configuracion', pageKey: 'configuracion' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { brandConfig } = useAuth();
  const supabase = createClient();
  const { features } = useFeatures();
  const { canAccess } = useRolePermissions();
  const { appUser, signOut } = useAuth();
  const router = useRouter();

  const [branchName, setBranchName] = useState<string>('Sucursal Centro');
  const [branches, setBranches] = useState<{id: string; name: string}[]>([]);
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [openOrdersCount, setOpenOrdersCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  // Dynamic sidebar colors from brandConfig
  const sidebarBg = brandConfig.theme === 'light' ? '#f8fafc' : (brandConfig.primaryColor || '#1B3A6B');
  const sidebarBorder = brandConfig.theme === 'light' ? '#e2e8f0' : '#243f72';

  // Load branch name from system_config and available branches
  useEffect(() => {
    supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'branch_name')
      .single()
      .then(({ data }) => {
        if (data?.config_value) setBranchName(data.config_value);
      });
    // Load available branches
    supabase.from('branches').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => { if (data?.length) setBranches(data); });
  }, [supabase]);

  // Load real open orders count and refresh every 60s
  useEffect(() => {
    const fetchOpenOrders = async () => {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'abierta');
      setOpenOrdersCount(count ?? 0);
    };
    fetchOpenOrders();
    const interval = setInterval(fetchOpenOrders, 60000);
    return () => clearInterval(interval);
  }, [supabase]);

  // Load low-stock ingredient count and refresh every 5 minutes
  useEffect(() => {
    const fetchLowStock = async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('stock, min_stock')
        .filter('min_stock', 'gt', 0);
      const count = (data || []).filter(
        (i: any) => Number(i.stock) <= Number(i.min_stock)
      ).length;
      setLowStockCount(count);
    };
    fetchLowStock();
    const interval = setInterval(fetchLowStock, 300000);
    return () => clearInterval(interval);
  }, [supabase]);

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
        <div className="px-3 pt-3 relative">
          <button
            onClick={() => setShowBranchSelector(p => !p)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-150 hover:bg-white/10"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
          >
            <GitBranch size={13} />
            <span className="truncate flex-1 text-left">{branchName}</span>
            <ChevronRight size={12} className={`transition-transform duration-200 ${showBranchSelector ? 'rotate-90' : ''}`} />
          </button>
          {showBranchSelector && branches.length > 1 && (
            <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden"
              style={{ backgroundColor: '#162d52', border: '1px solid rgba(255,255,255,0.15)' }}>
              {branches.map(b => (
                <button key={b.id} onClick={() => {
                  setBranchName(b.name);
                  setShowBranchSelector(false);
                  try { localStorage.setItem('sr_active_branch', JSON.stringify({ id: b.id, name: b.name })); } catch {}
                  window.dispatchEvent(new CustomEvent('branch-changed', { detail: { id: b.id, name: b.name } }));
                }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-white/10"
                  style={{ color: b.name === branchName ? '#f59e0b' : 'rgba(255,255,255,0.7)' }}>
                  <GitBranch size={12} />
                  <span className="truncate">{b.name}</span>
                  {b.name === branchName && <span className="ml-auto" style={{ color: '#f59e0b' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
        {navGroups.map((group) => (
          <div key={group.group} className="mb-4">
            {!collapsed && (
              <p className="text-xs px-3 mb-1.5 tracking-widest" style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                {group.group}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              if ((item as any).feature && !features[(item as any).feature as keyof Features]) return null;
              if (!canAccess(item.pageKey)) return null;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const badge = item.pageKey === 'orders'
                ? (openOrdersCount > 0 ? openOrdersCount : undefined)
                : item.pageKey === 'inventario'
                ? (lowStockCount > 0 ? lowStockCount : undefined)
                : item.badge;
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
                        {badge !== undefined && (
                          <span className="text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '10px' }}>
                            {badge}
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

      {/* User info + collapse toggle */}
      <div className="flex-shrink-0 border-t p-2" style={{ borderColor: '#243f72' }}>
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-700 flex-shrink-0" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
              AD
            </div>
            <div className="flex flex-col overflow-hidden flex-1">
              <span className="text-xs font-600 truncate" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Administrador</span>
              <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>Admin</span>
            </div>
            <Bell size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        )}
        {/* User info + logout */}
        {appUser && (
          <div className="px-2 mb-1">
            {!collapsed && (
              <div className="px-2 py-1.5 mb-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs font-semibold text-white truncate">{appUser.fullName}</p>
                <p className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{appUser.appRole.replace('_', ' ')}</p>
              </div>
            )}
            <button
              onClick={async () => { await signOut(); router.replace('/login'); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-150 hover:bg-red-500/10"
              style={{ color: 'rgba(239,68,68,0.7)', justifyContent: collapsed ? 'center' : 'flex-start' }}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
              {!collapsed && <span>Cerrar sesión</span>}
            </button>
          </div>
        )}
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