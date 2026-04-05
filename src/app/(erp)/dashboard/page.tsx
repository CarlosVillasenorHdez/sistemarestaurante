import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardKPIs from './components/DashboardKPIs';
import SalesChart from './components/SalesChart';
import RecentOrders from './components/RecentOrders';
import DashboardQuickActions from './components/DashboardQuickActions';
import AlertsPanel from './components/AlertsPanel';
import LiveOperations from './components/LiveOperations';
import RecentActivity from './components/RecentActivity';

export default function DashboardPage() {
  return (
    <AppLayout
      title="Dashboard"
      subtitle="Resumen operativo del día"
    >
      <div className="flex flex-col gap-6">
        {/* Quick actions */}
        <DashboardQuickActions />

        {/* Live operations */}
        <LiveOperations />

        {/* KPI Bento Grid */}
        <DashboardKPIs />

        {/* Charts + Alerts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SalesChart />
          </div>
          <div className="xl:col-span-1 flex flex-col gap-6">
            <AlertsPanel />
            <RecentActivity />
          </div>
        </div>

        {/* Recent orders */}
        <RecentOrders />
      </div>
    </AppLayout>
  );
}