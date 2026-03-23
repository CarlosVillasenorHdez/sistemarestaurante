import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardKPIs from './components/DashboardKPIs';
import SalesChart from './components/SalesChart';
import RecentOrders from './components/RecentOrders';
import DashboardQuickActions from './components/DashboardQuickActions';
import AlertsPanel from './components/AlertsPanel';

export default function DashboardPage() {
  return (
    <AppLayout
      title="Dashboard"
      subtitle="Resumen operativo del día"
      lastUpdated="hace 2 min"
    >
      <div className="flex flex-col gap-6">
        {/* Quick actions */}
        <DashboardQuickActions />

        {/* KPI Bento Grid */}
        <DashboardKPIs />

        {/* Charts + Alerts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SalesChart />
          </div>
          <div className="xl:col-span-1">
            <AlertsPanel />
          </div>
        </div>

        {/* Recent orders */}
        <RecentOrders />
      </div>
    </AppLayout>
  );
}