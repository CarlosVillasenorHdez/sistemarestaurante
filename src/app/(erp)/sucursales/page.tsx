'use client';
import AppLayout from '@/components/AppLayout';
import SucursalesManagement from './components/SucursalesManagement';

export default function SucursalesPage() {
  return (
    <AppLayout title="Multi-Sucursal" subtitle="Gestión centralizada de todas las sucursales">
      <SucursalesManagement />
    </AppLayout>
  );
}
