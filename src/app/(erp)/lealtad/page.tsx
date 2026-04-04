'use client';
import AppLayout from '@/components/AppLayout';
import LoyaltyManagement from './components/LoyaltyManagement';

export default function LoyaltyPage() {
  return (
    <AppLayout title="Programa de Lealtad" subtitle="Acumulación y canje de puntos">
      <LoyaltyManagement />
    </AppLayout>
  );
}
