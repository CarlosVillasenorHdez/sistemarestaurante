'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, ShoppingBag, DollarSign, Package, Users, AlertTriangle, Scissors, Settings, Star, Truck } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  entity_name: string | null;
  user_name: string;
  user_role: string;
  details: string | null;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  orden_cancelada:         { label: 'Orden cancelada',        icon: ShoppingBag,  color: '#ef4444' },
  orden_cerrada:           { label: 'Orden cerrada',          icon: ShoppingBag,  color: '#22c55e' },
  precio_cambiado:         { label: 'Precio modificado',      icon: DollarSign,   color: '#f59e0b' },
  disponibilidad_cambiada: { label: 'Disponibilidad cambiada',icon: Package,      color: '#8b5cf6' },
  platillo_eliminado:      { label: 'Platillo eliminado',     icon: Package,      color: '#ef4444' },
  receta_modificada:       { label: 'Receta modificada',      icon: Package,      color: '#3b82f6' },
  corte_cerrado:           { label: 'Corte de caja cerrado',  icon: Scissors,     color: '#f59e0b' },
  usuario_creado:          { label: 'Usuario creado',         icon: Users,        color: '#22c55e' },
  usuario_desactivado:     { label: 'Usuario desactivado',    icon: Users,        color: '#ef4444' },
  permisos_guardados:      { label: 'Permisos actualizados',  icon: Settings,     color: '#8b5cf6' },
  ingrediente_ajustado:    { label: 'Ingrediente ajustado',   icon: Package,      color: '#3b82f6' },
  layout_guardado:         { label: 'Layout de mesas guardado',icon: Settings,    color: '#06b6d4' },
  merma_registrada:        { label: 'Merma registrada',       icon: AlertTriangle,color: '#f59e0b' },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

export default function RecentActivity() {
  const { appUser } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser?.tenantId) { setLoading(false); return; }
    const supabase = createClient();

    // Fetch last 12 hours of audit entries for this tenant
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    supabase
      .from('audit_log')
      .select('id, action, entity_name, user_name, user_role, details, created_at')
      .eq('tenant_id', appUser.tenantId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(15)
      .then(({ data }) => {
        setEntries((data as AuditEntry[]) ?? []);
        setLoading(false);
      });
  }, [appUser]);

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '20px',
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Clock size={16} style={{ color: '#6b7280' }} />
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>Actividad del turno</span>
        </div>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: '52px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Clock size={16} style={{ color: '#6b7280' }} />
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>Actividad del turno</span>
        </div>
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: '13px' }}>
          Sin actividad registrada en las últimas 12 horas
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} style={{ color: '#6b7280' }} />
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>Actividad del turno</span>
        </div>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Últimas 12 h</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {entries.map((e) => {
          const meta = ACTION_META[e.action] ?? { label: e.action, icon: Clock, color: '#6b7280' };
          const IconComp = meta.icon;
          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px', borderRadius: '8px', transition: 'background .15s' }}
              onMouseEnter={ev => (ev.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                <IconComp size={13} style={{ color: meta.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{meta.label}</span>
                  {e.entity_name && (
                    <span style={{ fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                      — {e.entity_name}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>
                  {e.user_name} · {timeAgo(e.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
