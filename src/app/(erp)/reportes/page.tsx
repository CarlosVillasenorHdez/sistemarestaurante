'use client';

import AppLayout from '@/components/AppLayout';
import ReportesManagement from './components/ReportesManagement';
import ReportesMejorados from './components/ReportesMejorados';
import ReportesConsolidado from './components/ReportesConsolidado';
import { useState, useEffect } from 'react';
import { useFeatures } from '@/hooks/useFeatures';

type View = 'avanzado' | 'completo' | 'consolidado';

export default function ReportesPage() {
  const { features } = useFeatures();
  const [activeView, setActiveView] = useState<View>('avanzado');

  // Set default tab: consolidado only if multiSucursal is enabled
  useEffect(() => {
    setActiveView(features.multiSucursal ? 'consolidado' : 'avanzado');
  }, [features.multiSucursal]);

  const tabs: { id: View; label: string; show: boolean }[] = [
    { id: 'consolidado', label: '🏢 Consolidado Multi-Sucursal', show: features.multiSucursal },
    { id: 'avanzado',    label: '📊 Reportes en Tiempo Real',    show: true },
    { id: 'completo',    label: '📈 Análisis Completo',          show: true },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  return (
    <AppLayout title="Reportes" subtitle="Análisis de ventas y rendimiento">
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-gray-200 pb-0 overflow-x-auto">
          {visibleTabs.map(tab => (
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
        {activeView === 'consolidado' && features.multiSucursal && <ReportesConsolidado />}
        {activeView === 'avanzado'    && <ReportesMejorados />}
        {activeView === 'completo'    && <ReportesManagement />}
      </div>
    </AppLayout>
  );
}