'use client';
import AppLayout from '@/components/AppLayout';
import OnboardingFlow from './components/OnboardingFlow';

export default function OnboardingPage() {
  return (
    <AppLayout title="Configuración Inicial" subtitle="Configura tu restaurante en 10 minutos">
      <OnboardingFlow />
    </AppLayout>
  );
}
