import React from 'react';
import AppLayout from '@/components/AppLayout';
import MenuManagement from './components/MenuManagement';

export default function MenuPage() {
  return (
    <AppLayout title="Gestión de Menú" subtitle="Administra platillos, categorías y disponibilidad">
      <MenuManagement />
    </AppLayout>
  );
}
