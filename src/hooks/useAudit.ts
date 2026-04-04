'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AuditAction =
  | 'orden_cancelada'
  | 'orden_cerrada'
  | 'precio_cambiado'
  | 'disponibilidad_cambiada'
  | 'platillo_eliminado'
  | 'receta_modificada'
  | 'corte_cerrado'
  | 'usuario_creado'
  | 'usuario_desactivado'
  | 'permisos_guardados'
  | 'ingrediente_ajustado'
  | 'layout_guardado'
  | 'merma_registrada';

interface LogPayload {
  action: AuditAction;
  entity: string;
  entityId: string;
  entityName?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  details?: string;
}

/**
 * Hook: writes immutable audit records to audit_log.
 * Fire-and-forget — never blocks the user action.
 * Silent on error (audit failure must not break the app).
 */
export function useAudit() {
  const { appUser } = useAuth();
  const supabase = createClient();

  const log = useCallback(
    async (payload: LogPayload): Promise<void> => {
      if (!appUser) return; // no session = no audit

      try {
        await supabase.from('audit_log').insert({
          tenant_id:   appUser.tenantId,
          user_id:     appUser.id,
          user_name:   appUser.fullName,
          user_role:   appUser.appRole,
          action:      payload.action,
          entity:      payload.entity,
          entity_id:   payload.entityId,
          entity_name: payload.entityName ?? null,
          old_value:   payload.oldValue ?? null,
          new_value:   payload.newValue ?? null,
          details:     payload.details ?? null,
        });
      } catch {
        // Silent — audit failure must never break the user workflow
        console.warn('[audit] log failed silently');
      }
    },
    [appUser, supabase]
  );

  return { log };
}
