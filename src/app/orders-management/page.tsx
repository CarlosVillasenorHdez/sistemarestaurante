import React from 'react';
import AppLayout from '@/components/AppLayout';
import OrdersTable from './components/OrdersTable';

export default function OrdersManagementPage() {
  return (
    <AppLayout title="Gestión de Órdenes" subtitle="Historial y estado de todas las órdenes">
      <OrdersTable />
    </AppLayout>
  );
}