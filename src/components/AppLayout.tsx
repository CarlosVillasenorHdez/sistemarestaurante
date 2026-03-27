'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  lastUpdated?: string;
}

export default function AppLayout({ children, title, subtitle, lastUpdated }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { loading, appUser } = useAuth();
  const router = useRouter();

  // Auth check — redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !appUser) {
      router.replace('/login');
    }
  }, [loading, appUser, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1e38' }}>
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none" style={{ color: '#f59e0b' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Cargando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:relative z-50 lg:z-auto h-full
          transition-transform duration-300 ease-in-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar
          title={title}
          subtitle={subtitle}
          onMenuToggle={() => setMobileSidebarOpen(true)}
          lastUpdated={lastUpdated}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}