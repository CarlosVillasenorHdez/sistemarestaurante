'use client';

import React, { useState } from 'react';
import { Store, Hash, LayoutGrid, Clock, Printer, Zap, Star, Settings2, Users, Shield } from 'lucide-react';
import ConfigRestaurante  from './sections/ConfigRestaurante';
import ConfigLayout       from './sections/ConfigLayout';
import ConfigOperaciones  from './sections/ConfigOperaciones';
import ConfigSistema      from './sections/ConfigSistema';
import AuditLog          from './sections/AuditLog';
import Icon from '@/components/ui/AppIcon';


const SECTIONS = [
  { id: 'restaurante',   label: 'Restaurante',        icon: Store,      group: 'Configuración' },
  { id: 'operacion',     label: 'Operación',           icon: Hash,       group: 'Configuración' },
  { id: 'layout',        label: 'Layout Mesas',        icon: LayoutGrid, group: 'Configuración' },
  { id: 'horarios',      label: 'Horarios',            icon: Clock,      group: 'Operación' },
  { id: 'impresora',     label: 'Impresora',           icon: Printer,    group: 'Operación' },
  { id: 'funcionalidades', label: 'Funcionalidades',  icon: Zap,        group: 'Sistema' },
  { id: 'lealtad_config',label: 'Programa de Lealtad', icon: Star,      group: 'Sistema' },
  { id: 'sistema',       label: 'Sistema',             icon: Settings2,  group: 'Sistema' },
  { id: 'usuarios',      label: 'Usuarios & Roles',    icon: Users,      group: 'Sistema' },
  { id: 'auditoria',     label: 'Auditoría',            icon: Shield,     group: 'Sistema' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

// Maps each section to which sub-component to render
// ConfigRestaurante handles: restaurante + operacion
// ConfigLayout handles: layout
// ConfigOperaciones handles: horarios + impresora
// ConfigSistema handles: funcionalidades + lealtad + sistema + usuarios
function resolveComponent(section: SectionId) {
  if (section === 'restaurante' || section === 'operacion') return 'restaurante';
  if (section === 'layout') return 'layout';
  if (section === 'horarios' || section === 'impresora') return 'operaciones';
  if (section === 'auditoria') return 'auditoria';
  return 'sistema';
}

export default function ConfiguracionManagement() {
  const [activeSection, setActiveSection] = useState<SectionId>('restaurante');

  const activeComponent = resolveComponent(activeSection);

  const groups = [...new Set(SECTIONS.map(s => s.group))];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1923', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b" style={{ borderColor: '#1e2d3d' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
            <Settings2 size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Configuración</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Administración del sistema — Solo Administradores
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <div className="w-52 flex-shrink-0 border-r py-4 px-3 overflow-y-auto"
          style={{ borderColor: '#1e2d3d', backgroundColor: '#0d1720' }}>
          {groups.map(group => (
            <div key={group} className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-1"
                style={{ color: 'rgba(255,255,255,0.25)' }}>{group}</p>
              {SECTIONS.filter(s => s.group === group).map(sec => {
                const Icon = sec.icon;
                const active = activeSection === sec.id;
                return (
                  <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all duration-150"
                    style={{
                      backgroundColor: active ? 'rgba(245,158,11,0.15)' : 'transparent',
                      color: active ? '#f59e0b' : 'rgba(255,255,255,0.55)',
                      fontWeight: active ? 600 : 400,
                      borderLeft: active ? '3px solid #f59e0b' : '3px solid transparent',
                    }}>
                    <Icon size={16} />
                    {sec.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Content — mount once, let each sub-component manage its own scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeComponent === 'restaurante' && <ConfigRestaurante activeSection={activeSection} />}
          {activeComponent === 'layout'      && <ConfigLayout />}
          {activeComponent === 'operaciones' && <ConfigOperaciones activeSection={activeSection} />}
          {activeComponent === 'sistema'     && <ConfigSistema activeSection={activeSection} />}
          {activeComponent === 'auditoria'    && <AuditLog />}
        </div>
      </div>
    </div>
  );
}