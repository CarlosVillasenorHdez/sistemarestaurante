'use client';

import AppLayout from '@/components/AppLayout';
import PersonalManagement from './components/PersonalManagement';

export default function PersonalPage() {
  return (
    <AppLayout title="Personal" subtitle="Empleados y turnos">
      <PersonalManagement />
    </AppLayout>
  );
}