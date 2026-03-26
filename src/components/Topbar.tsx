'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Search, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const QUICK_LINKS = [
  { label: 'Punto de Venta', href: '/pos-punto-de-venta', icon: '🖥️' },
  { label: 'Cocina', href: '/cocina', icon: '🍳' },
  { label: 'Inventario', href: '/inventario', icon: '📦' },
  { label: 'Reservaciones', href: '/reservaciones', icon: '📅' },
  { label: 'Reportes', href: '/reportes', icon: '📊' },
  { label: 'Personal', href: '/personal', icon: '👥' },
  { label: 'Gastos', href: '/gastos', icon: '💰' },
  { label: 'Delivery', href: '/delivery', icon: '🛵' },
  { label: 'Configuración', href: '/configuracion', icon: '⚙️' },
];

interface Alert {
  id: string;
  icon: string;
  text: string;
  time: string;
}

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuToggle?: () => void;
}

export default function Topbar({ title, subtitle, onMenuToggle }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Auto "Actualizado" — tracks minutes since mount
  const mountTime = useRef(Date.now());
  const [minutesSinceMounted, setMinutesSinceMounted] = useState(0);

  // Search modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Bell dropdown
  const [bellOpen, setBellOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto "Actualizado" counter — updates every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const mins = Math.floor((Date.now() - mountTime.current) / 60000);
      setMinutesSinceMounted(mins);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setBellOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [searchOpen]);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    if (bellOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  // Load alerts from Supabase
  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const newAlerts: Alert[] = [];

      // Stock bajo mínimo
      const { data: stockAlertas } = await supabase
        .from('ingredients')
        .select('name, stock, min_stock')
        .filter('min_stock', 'gt', 0);
      const bajoMinimo = (stockAlertas || []).filter(
        (i: any) => Number(i.stock) <= Number(i.min_stock)
      );
      bajoMinimo.forEach((i: any) => {
        newAlerts.push({
          id: `stock-${i.name}`,
          icon: '📦',
          text: `${i.name}: stock bajo (${i.stock} ≤ ${i.min_stock})`,
          time: 'Ahora',
        });
      });

      // Órdenes abiertas hace más de 45 minutos
      const hace45 = new Date(Date.now() - 45 * 60000).toISOString();
      const { data: ordenesDemo } = await supabase
        .from('orders')
        .select('id, mesa, created_at')
        .eq('status', 'abierta')
        .lt('created_at', hace45);
      (ordenesDemo || []).forEach((o: any) => {
        const mins = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
        newAlerts.push({
          id: `order-${o.id}`,
          icon: '⏱️',
          text: `Mesa ${o.mesa || o.id.slice(0, 6)}: abierta hace ${mins} min`,
          time: `${mins} min`,
        });
      });

      setAlerts(newAlerts);
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [supabase]);

  const handleBellClick = () => {
    const next = !bellOpen;
    setBellOpen(next);
    if (next) loadAlerts();
  };

  const filteredLinks = QUICK_LINKS.filter((l) =>
    l.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNavigate = (href: string) => {
    router.push(href);
    setSearchOpen(false);
  };

  const updatedLabel =
    minutesSinceMounted === 0
      ? 'Actualizado ahora'
      : `Actualizado hace ${minutesSinceMounted} min`;

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 bg-white"
        style={{ borderBottom: '1px solid hsl(214 32% 91%)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-lg font-700 text-gray-900" style={{ fontWeight: 700 }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-500 capitalize">{subtitle || dateStr}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto "Actualizado" indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 mr-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span>{updatedLabel}</span>
          </div>

          {/* Search bar */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Search size={14} />
            <span>Buscar...</span>
            <kbd className="text-xs bg-gray-200 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>

          {/* Bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={handleBellClick}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
            >
              <Bell size={18} className="text-gray-600" />
              {alerts.length > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full text-white text-[10px] font-700 px-0.5"
                  style={{ backgroundColor: '#ef4444', fontWeight: 700 }}
                >
                  {alerts.length}
                </span>
              )}
              {alerts.length === 0 && !bellOpen && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#ef4444' }}
                />
              )}
            </button>

            {/* Bell dropdown */}
            {bellOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl border border-gray-200 bg-white z-50 overflow-hidden"
                style={{ maxHeight: '400px' }}
              >
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-600 text-gray-800" style={{ fontWeight: 600 }}>
                    Alertas del sistema
                  </span>
                  {alerts.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-600">
                      {alerts.length}
                    </span>
                  )}
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
                  {alertsLoading ? (
                    <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                      Cargando alertas...
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-sm text-gray-400 gap-2">
                      <span className="text-2xl">🎉</span>
                      <span>Sin alertas activas</span>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-lg flex-shrink-0">{alert.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 leading-snug">{alert.text}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{alert.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-gray-100">
                  <button
                    onClick={() => { router.push('/alarmas'); setBellOpen(false); }}
                    className="w-full text-xs text-center font-500 transition-colors hover:underline"
                    style={{ color: '#1B3A6B' }}
                  >
                    Ver todas las alarmas →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 pl-2 border-l border-gray-200 ml-1">
            <span className="font-mono font-600">{timeStr}</span>
            <span className="text-gray-300">|</span>
            <span className="capitalize hidden lg:block">{dateStr}</span>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar módulo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
              />
              <button onClick={() => setSearchOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="py-2" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {filteredLinks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin resultados</p>
              ) : (
                filteredLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => handleNavigate(link.href)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-xl w-7 text-center flex-shrink-0">{link.icon}</span>
                    <span className="text-sm text-gray-700">{link.label}</span>
                  </button>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-400">
              <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">↵</kbd> Navegar</span>
              <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">Esc</kbd> Cerrar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}