'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChefHat, Eye, EyeOff } from 'lucide-react';

interface LoginUser {
  id: string;
  fullName: string;
  appRole: string;
  employeeRoleLabel: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  cajero: 'Cajero',
  mesero: 'Mesero',
  cocinero: 'Cocinero',
  ayudante_cocina: 'Ayudante de Cocina',
  repartidor: 'Repartidor',
};

export default function LoginPage() {
  const { signIn, appUser, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [users, setUsers] = useState<LoginUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && appUser) {
      router.replace('/dashboard');
    }
  }, [appUser, loading, router]);

  // Load active users for the dropdown
  useEffect(() => {
    supabase
      .from('app_users')
      .select('id, full_name, app_role, is_active')
      .eq('is_active', true)
      .order('app_role')
      .order('full_name')
      .then(({ data }) => {
        setUsers(
          (data || []).map((u: Record<string, string>) => ({
            id: u.id,
            fullName: u.full_name,
            appRole: u.app_role,
            employeeRoleLabel: ROLE_LABELS[u.app_role] ?? u.app_role,
          }))
        );
        setUsersLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedUserId) { setError('Selecciona un usuario'); return; }
    if (!pin) { setError('Ingresa tu PIN'); return; }

    setSubmitting(true);
    const result = await signIn(selectedUserId, pin);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      setPin('');
    } else {
      router.replace('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1923' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(245,158,11,0.3)', borderTopColor: '#f59e0b' }} />
      </div>
    );
  }

  // Group users by role for the dropdown
  const grouped = users.reduce<Record<string, LoginUser[]>>((acc, u) => {
    const label = ROLE_LABELS[u.appRole] ?? u.appRole;
    if (!acc[label]) acc[label] = [];
    acc[label].push(u);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f1923' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <ChefHat size={32} style={{ color: '#f59e0b' }} />
          </div>
          <h1 className="text-2xl font-bold text-white">Aldente</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Sistema de Gestión para Restaurantes
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
          <h2 className="text-base font-semibold text-white mb-5">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* User selector */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                ¿Quién eres?
              </label>
              <select
                value={selectedUserId}
                onChange={e => { setSelectedUserId(e.target.value); setError(''); }}
                disabled={usersLoading}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none"
                style={{
                  backgroundColor: '#0f1923',
                  border: '1px solid #2a3f5f',
                  color: selectedUserId ? '#f1f5f9' : 'rgba(255,255,255,0.35)',
                }}
              >
                <option value="" disabled>
                  {usersLoading ? 'Cargando...' : 'Selecciona tu nombre'}
                </option>
                {Object.entries(grouped).map(([roleLabel, roleUsers]) => (
                  <optgroup key={roleLabel} label={`── ${roleLabel}`} style={{ color: '#f59e0b', backgroundColor: '#0f1923' }}>
                    {roleUsers.map(u => (
                      <option key={u.id} value={u.id} style={{ color: '#f1f5f9', backgroundColor: '#1a2535' }}>
                        {u.fullName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* PIN input */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                PIN
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => { setPin(e.target.value); setError(''); }}
                  maxLength={8}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="••••••"
                  autoComplete="off"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none tracking-widest"
                  style={{
                    backgroundColor: '#0f1923',
                    border: `1px solid ${error ? '#ef4444' : '#2a3f5f'}`,
                    color: '#f1f5f9',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                >
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs font-semibold" style={{ color: '#f87171' }}>
                ⚠️ {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || usersLoading || !selectedUserId || !pin}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 mt-2"
              style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}
            >
              {submitting ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
          PIN por defecto: 12345
        </p>
      </div>
    </div>
  );
}