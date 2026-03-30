'use client';

import AppLayout from '@/components/AppLayout';
import InventarioManagement from './components/InventarioManagement';

export default function InventarioPage() {
  return (
    <AppLayout title="Inventario" subtitle="Control de ingredientes y stock">
      <InventarioManagement />
    </AppLayout>
  );
}