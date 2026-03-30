'use client';

import AppLayout from '@/components/AppLayout';
import ReportesManagement from './components/ReportesManagement';
import ReportesMejorados from './components/ReportesMejorados';
import ReportesConsolidado from './components/ReportesConsolidado';
import { useState } from 'react';

type View = 'avanzado' | 'completo' | 'consolidado';

export default function ReportesPage() {
  const [activeView, setActiveView] = useState<View>('consolidado');

  const tabs: { id: View; label: string }[] = [
    { id: 'consolidado', label: '🏢 Consolidado Multi-Sucursal' },
    { id: 'avanzado', label: '📊 Reportes en Tiempo Real' },
    { id: 'completo', label: '📈 Análisis Completo' },
  ];

  return (
    <AppLayout title="Reportes" subtitle="Análisis de ventas y rendimiento">
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-gray-200 pb-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeView === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeView === 'consolidado' && <ReportesConsolidado />}
        {activeView === 'avanzado' && <ReportesMejorados />}
        {activeView === 'completo' && <ReportesManagement />}
      </div>
    </AppLayout>
  );
}
