'use client';

/**
 * /registro — Página pública de registro de nuevos restaurantes.
 * Llama a la Edge Function create-tenant para crear el tenant + usuario admin
 * de forma atómica.
 */
import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Step = 'form' | 'success';

interface FormData {
  restaurantName: string;
  adminName: string;
  phone: string;
  pin: string;
  pinConfirm: string;
}

const INITIAL: FormData = { restaurantName: '', adminName: '', phone: '', pin: '', pinConfirm: '' };

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
}

export default function RegistroPage() {
  const supabase = createClient();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{ pin: string; loginUrl: string } | null>(null);

  function setField(key: keyof FormData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function sha256(text: string): Promise<string> {
    const salt = 'aldente_salt_2024';
    const msgBuffer = new TextEncoder().encode(salt + text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.pin.length < 4 || !/^\d+$/.test(form.pin)) {
      setError('El PIN debe ser de 4 dígitos numéricos.');
      return;
    }
    if (form.pin !== form.pinConfirm) {
      setError('Los PINs no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const pinHash = await sha256(form.pin);
      const slug = slugify(form.restaurantName) || 'restaurante-' + Date.now();

      const { data, error: fnError } = await supabase.functions.invoke('create-tenant', {
        body: {
          restaurantName: form.restaurantName.trim(),
          slug,
          adminName: form.adminName.trim(),
          phone: form.phone.trim(),
          pinHash,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const loginUrl = typeof window !== 'undefined'
        ? window.location.origin + '/login'
        : '/login';

      setSuccessData({ pin: form.pin, loginUrl });
      setStep('success');
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear el restaurante. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid #2a3f5f', backgroundColor: '#0f1923',
    color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 600,
    color: 'rgba(255,255,255,0.45)', marginBottom: '6px',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  if (step === 'success' && successData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1923', fontFamily: 'DM Sans, system-ui, sans-serif', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '440px', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>¡Tu restaurante está listo!</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '0 0 28px' }}>Tienes <strong style={{ color: '#34d399' }}>14 días de prueba gratuita</strong> con todas las funciones del plan Básico.</p>

          <div style={{ padding: '20px', borderRadius: '14px', backgroundColor: '#1a2535', border: '1px solid #1e2d3d', marginBottom: '20px', textAlign: 'left' }}>
            <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const }}>Tu PIN de acceso (guárdalo ahora)</p>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '8px', color: '#f59e0b' }}>{successData.pin}</p>
          </div>

          <div style={{ padding: '14px 20px', borderRadius: '10px', backgroundColor: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', marginBottom: '24px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Entra al sistema en:</p>
            <p style={{ margin: 0, fontSize: '14px', color: '#34d399', fontFamily: 'monospace', wordBreak: 'break-all' as const }}>{successData.loginUrl}</p>
          </div>

          <Link href="/login" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: '12px', backgroundColor: '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
            Ir al sistema →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1923', fontFamily: 'DM Sans, system-ui, sans-serif', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🍽</div>
          <h1 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>Registra tu restaurante</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: 0 }}>14 días gratis, sin tarjeta de crédito.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Nombre del restaurante</label>
            <input type="text" required value={form.restaurantName} onChange={e => setField('restaurantName', e.target.value)} placeholder="Restaurante El Sabor" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tu nombre completo</label>
            <input type="text" required value={form.adminName} onChange={e => setField('adminName', e.target.value)} placeholder="María García López" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Teléfono (WhatsApp)</label>
            <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+52 55 1234 5678" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>PIN de acceso (4 dígitos)</label>
            <input type="password" required maxLength={6} value={form.pin} onChange={e => setField('pin', e.target.value.replace(/\D/g, ''))} placeholder="••••" style={{ ...inputStyle, letterSpacing: '8px', fontSize: '20px' }} />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Este PIN lo usarás para entrar al sistema cada día.</p>
          </div>
          <div>
            <label style={labelStyle}>Confirmar PIN</label>
            <input type="password" required maxLength={6} value={form.pinConfirm} onChange={e => setField('pinConfirm', e.target.value.replace(/\D/g, ''))} placeholder="••••" style={{ ...inputStyle, letterSpacing: '8px', fontSize: '20px' }} />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: loading ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '15px', cursor: loading ? 'wait' : 'pointer', marginTop: '4px' }}>
            {loading ? 'Creando tu restaurante...' : 'Comenzar prueba gratuita →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
          ¿Ya tienes cuenta? <Link href="/login" style={{ color: '#f59e0b', textDecoration: 'none' }}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
