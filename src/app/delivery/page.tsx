'use client';
import AppLayout from '@/components/AppLayout';
import DeliveryManagement from './components/DeliveryManagement';

export default function DeliveryPage() {
  return (
    <AppLayout title="Delivery" subtitle="Pedidos externos de plataformas de entrega">
      <DeliveryManagement />
    </AppLayout>
  );
}
