'use client';

import AppLayout from '@/components/AppLayout';
import RHManagement from './components/RHManagement';

export default function RecursosHumanosPage() {
  return (
    <AppLayout title="Recursos Humanos" subtitle="Vacaciones y permisos">
      <RHManagement />
    </AppLayout>
  );
}