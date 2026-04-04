'use client';
import AppLayout from '@/components/AppLayout';
import ReservacionesManagement from './components/ReservacionesManagement';

export default function ReservacionesPage() {
  return (
    <AppLayout title="Reservaciones" subtitle="Calendario de reservas y lista de espera">
      <ReservacionesManagement />
    </AppLayout>
  );
}
