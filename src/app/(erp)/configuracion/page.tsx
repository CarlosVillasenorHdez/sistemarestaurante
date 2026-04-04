'use client';

import AppLayout from '@/components/AppLayout';
import ConfiguracionManagement from './components/ConfiguracionManagement';

export default function ConfiguracionPage() {
  return (
    <AppLayout title="Configuración" subtitle="Ajustes del restaurante">
      <ConfiguracionManagement />
    </AppLayout>
  );
}