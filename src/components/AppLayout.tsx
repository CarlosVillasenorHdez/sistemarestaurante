'use client';

import React, { useState, useEffect } from 'react';
import { useDevice } from '@/hooks/useDevice';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const device = useDevice();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar on tablet/mobile
  useEffect(() => {
    if (device.isTablet || device.isMobile) {
      setSidebarCollapsed(true);
    }
  }, [device.type]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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