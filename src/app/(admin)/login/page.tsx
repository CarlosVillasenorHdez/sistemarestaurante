'use client';

/**
 * /admin/login — Superadmin login page
 * Uses Supabase Auth (email + password), completely separate from the ERP PIN flow.
 * After successful auth, verifies app_role = 'superadmin' in app_users.
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [checking, setChecking] = useState(true);

  // If already logged in as superadmin, skip to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setChecking(false); return; }
      const { data } = await supabase
        .from('app_users')
        .select('app_role')
        .eq('auth_user_id', session.user.id)
        .single();
      if ((data as any)?.app_role === 'superadmin') {
        router.replace('/admin');
      } else {
        setChecking(false);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.session) {
      setError('Email o contraseña incorrectos.');
      setLoading(false);
      return;
    }

    const { data: userRow } = await supabase
      .from('app_users')
      .select('app_role, full_name')
      .eq('auth_user_id', authData.session.user.id)
      .single();

    if (!(userRow as any) || (userRow as any).app_role !== 'superadmin') {
      await supabase.auth.signOut();
      setError('Acceso no autorizado. Esta área es solo para superadmins.');
      setLoading(false);
      return;
    }

    router.replace('/admin');
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0f1a' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #f59e0b', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0f1a', fontFamily: 'DM Sans, system-ui, sans-serif', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 16px' }}>🛡</div>
          <h1 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>Aldente Admin</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Acceso restringido — solo superadmins</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@aldente.mx" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #2a3f5f', backgroundColor: '#0f1923', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Contraseña</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #2a3f5f', backgroundColor: '#0f1923', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }} />
          </div>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '13px' }}>{error}</div>
          )}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', backgroundColor: loading ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '14px', cursor: loading ? 'wait' : 'pointer', marginTop: '4px' }}>
            {loading ? 'Verificando...' : 'Entrar al panel'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Esta área no está disponible para usuarios del restaurante.</p>
      </div>
    </div>
  );
}
