'use client';
import AppLayout from '@/components/AppLayout';
import MeseroMobileView from './components/MeseroMobileView';

export default function MeseroPage() {
  return (
    <AppLayout title="Toma de Pedidos" subtitle="Vista optimizada para tablet y móvil">
      <MeseroMobileView />
    </AppLayout>
  );
}
