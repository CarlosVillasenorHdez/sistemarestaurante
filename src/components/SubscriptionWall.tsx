'use client';

/**
 * SubscriptionWall — shown when a tenant's subscription is inactive or expired.
 * Replaces the full ERP content. No Sidebar, no Topbar.
 */
import React from 'react';
import { getPlan } from '@/lib/plans';

interface SubscriptionWallProps {
  reason: 'inactive' | 'expired' | 'trial_ended';
  plan?: string;
}

const MESSAGES = {
  inactive: {
    icon: '🔒',
    title: 'Cuenta suspendida',
    body: 'Tu cuenta ha sido desactivada. Por favor contacta a soporte para reactivarla.',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.25)',
  },
  expired: {
    icon: '⏰',
    title: 'Tu suscripción ha vencido',
    body: 'El período de pago de tu plan ha expirado. Renueva para seguir usando Aldente.',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.08)',
    border: 'rgba(251,146,60,0.25)',
  },
  trial_ended: {
    icon: '🎯',
    title: 'Tu período de prueba ha terminado',
    body: 'Gracias por probar Aldente. Elige un plan para continuar operando tu restaurante.',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.25)',
  },
};

export default function SubscriptionWall({ reason, plan = 'basico' }: SubscriptionWallProps) {
  const msg = MESSAGES[reason];
  const planInfo = getPlan(plan);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f1923',
      fontFamily: 'DM Sans, system-ui, sans-serif',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>{msg.icon}</div>

        {/* Title */}
        <h1 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: '0 0 12px' }}>
          {msg.title}
        </h1>

        {/* Body */}
        <div style={{ padding: '16px 20px', borderRadius: '12px', backgroundColor: msg.bg, border: `1px solid ${msg.border}`, marginBottom: '24px' }}>
          <p style={{ color: msg.color, fontSize: '14px', margin: '0 0 8px', fontWeight: 600 }}>
            {msg.body}
          </p>
          {reason !== 'inactive' && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
              Plan actual: <strong style={{ color: '#f59e0b' }}>{planInfo.label}</strong> — ${planInfo.price.toLocaleString('es-MX')}/mes
            </p>
          )}
        </div>

        {/* Plans (only for expired/trial) */}
        {reason !== 'inactive' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
            {(['basico', 'estandar', 'premium'] as const).map(key => {
              const p = getPlan(key);
              return (
                <div key={key} style={{ padding: '14px 10px', borderRadius: '10px', backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                  <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '13px', marginBottom: '4px' }}>{p.label}</div>
                  <div style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: 700, fontFamily: 'monospace' }}>
                    ${p.price.toLocaleString('es-MX')}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>/mes</div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <a
          href="mailto:soporte@aldente.mx?subject=Renovación%20de%20suscripción"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            borderRadius: '12px',
            backgroundColor: '#f59e0b',
            color: '#1B3A6B',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          Contactar soporte
        </a>

        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '16px' }}>
          soporte@aldente.mx
        </p>
      </div>
    </div>
  );
}
