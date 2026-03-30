import AppLayout from '@/components/AppLayout';
import GastosManagement from './components/GastosManagement';

export default function GastosPage() {
  return (
    <AppLayout title="Gastos" subtitle="Gastos recurrentes y depreciaciones">
      <GastosManagement />
    </AppLayout>
  );
}