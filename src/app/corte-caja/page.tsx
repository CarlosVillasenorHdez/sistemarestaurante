'use client';

import AppLayout from '@/components/AppLayout';
import CorteCaja from './components/CorteCaja';

export default function CorteCajaPage() {
  return (
    <AppLayout title="Corte de Caja" subtitle="Apertura, cierre y cuadre de turno">
      <CorteCaja />
    </AppLayout>
  );
}
