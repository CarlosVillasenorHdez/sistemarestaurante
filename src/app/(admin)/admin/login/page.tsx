'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Ingresa tu correo'); return; }
    if (!password) { setError('Ingresa tu contraseña'); return; }
    setSubmitting(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (authError || !data.user) {
      setError('Credenciales incorrectas');
      setPassword('');
      setSubmitting(false);
      return;
    }
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('app_role')
      .eq('supabase_uid', data.user.id)
      .single();
    if (!adminRow || adminRow.app_role !== 'superadmin') {
      await supabase.auth.signOut();
      setError('Acceso denegado.');
      setPassword('');
      setSubmitting(false);
      return;
    }
    router.replace('/admin');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#060d18', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#1e2d3d', marginBottom: '16px' }}>
            <ShieldCheck size={26} style={{ color: '#60a5fa' }} />
          </div>
          <h1 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: 0 }}>Admin</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Panel de Superadministrador</p>
        </div>
        <div style={{ backgroundColor: '#0d1b2a', border: '1px solid #1e2d3d', borderRadius: '16px', padding: '28px' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 600, marginBottom: '20px', marginTop: 0 }}>Iniciar sesión</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Correo</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="admin@ejemplo.mx"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#0a0f1a', border: `1px solid ${error ? '#ef4444' : '#1e2d3d'}`, color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '10px', backgroundColor: '#0a0f1a', border: `1px solid ${error ? '#ef4444' : '#1e2d3d'}`, color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>⚠️ {error}</p>}
            <button
              type="submit"
              disabled={submitting || !email || !password}
              style={{ width: '100%', padding: '11px', borderRadius: '10px', backgroundColor: submitting || !email || !password ? '#1e2d3d' : '#2563eb', color: submitting || !email || !password ? '#475569' : '#fff', fontSize: '14px', fontWeight: 600, border: 'none', cursor: submitting || !email || !password ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' }}
            >
              {submitting ? 'Verificando...' : 'Entrar al panel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
