'use client';

import AppLayout from '@/components/AppLayout';
import ReportesManagement from './components/ReportesManagement';
import ReportesMejorados from './components/ReportesMejorados';
import { useState } from 'react';

export default function ReportesPage() {
  const [activeView, setActiveView] = useState<'avanzado' | 'completo'>('avanzado');

  return (
    <AppLayout title="Reportes" subtitle="Análisis de ventas y rendimiento">
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-gray-200 pb-0">
          <button
            onClick={() => setActiveView('avanzado')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === 'avanzado' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            📊 Reportes en Tiempo Real
          </button>
          <button
            onClick={() => setActiveView('completo')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === 'completo' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            📈 Análisis Completo
          </button>
        </div>
        {activeView === 'avanzado' ? <ReportesMejorados /> : <ReportesManagement />}
      </div>
    </AppLayout>
  );
}
