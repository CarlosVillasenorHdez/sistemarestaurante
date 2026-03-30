'use client';

import AppLayout from '@/components/AppLayout';
import AlarmasManagement from './components/AlarmasManagement';

export default function AlarmasPage() {
  return (
    <AppLayout title="Alarmas" subtitle="Alertas del sistema">
      <AlarmasManagement />
    </AppLayout>
  );
}