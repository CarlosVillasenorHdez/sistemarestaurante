'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, wipeAuthStorage } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';
import { Eye, EyeOff, LogIn, AlertCircle, ChevronDown, User } from 'lucide-react';

interface WorkerOption {
  username: string;
  fullName: string;
  appRole: string;
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
  const router = useRouter();
  const supabase = createClient();

  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load active workers for dropdown
  useEffect(() => {
    async function loadWorkers() {
      setLoadingWorkers(true);
      const { data } = await supabase
        .from('app_users')
        .select('username, full_name, app_role')
        .eq('is_active', true)
        .order('full_name');

      const adminFallback: WorkerOption = {
        username: 'admin',
        fullName: 'Administrador',
        appRole: 'admin',
      };

      if (data && data.length > 0) {
        const mapped: WorkerOption[] = data.map((u: any) => ({
          username: u.username,
          fullName: u.full_name,
          appRole: u.app_role,
        }));
        // Ensure admin is always present
        const hasAdmin = mapped.some((w) => w.username === 'admin');
        setWorkers(hasAdmin ? mapped : [adminFallback, ...mapped]);
      } else {
        // Fallback: always show Admin if DB returns nothing
        setWorkers([adminFallback]);
      }
      setLoadingWorkers(false);
    }
    loadWorkers();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorker) { setError('Selecciona un trabajador'); return; }
    setError('');
    setLoading(true);

    try {
      // Wipe any stale tokens before attempting sign-in.
      // If stale tokens exist, the client tries to refresh them first,
      // hits the rate limit, and then signIn fails even with correct credentials.
      wipeAuthStorage();

      const email = `${selectedWorker.username.trim().toLowerCase()}@sistemarest.local`;

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !signInData.user) {
        setError('Contraseña incorrecta.');
        setLoading(false);
        return;
      }

      // Fetch the app_user profile
      const { data: userRecord, error: lookupError } = await supabase
        .from('app_users')
        .select('app_role, is_active, full_name')
        .eq('auth_user_id', signInData.user.id)
        .single();

      if (lookupError || !userRecord) {
        await supabase.auth.signOut();
        setError('No se encontró el perfil de usuario. Contacta al administrador.');
        setLoading(false);
        return;
      }

      if (!userRecord.is_active) {
        await supabase.auth.signOut();
        setError('Tu cuenta está desactivada. Contacta al administrador.');
        setLoading(false);
        return;
      }

      // Redirect based on role
      const role = userRecord.app_role;
      if (role === 'admin' || role === 'gerente') {
        router.push('/dashboard');
      } else if (role === 'cajero' || role === 'mesero') {
        router.push('/pos-punto-de-venta');
      } else if (role === 'cocinero' || role === 'ayudante_cocina') {
        router.push('/cocina');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#0f1e38', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(27,58,107,0.6) 0%, transparent 70%)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-8 pt-10 pb-6 border-b" style={{ borderColor: '#243f72' }}>
          <AppLogo size={56} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">SistemaRestaurante</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Selecciona tu usuario para continuar</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="px-8 py-7 space-y-5">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Worker dropdown */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Trabajador
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${dropdownOpen ? '#f59e0b' : 'rgba(255,255,255,0.12)'}`,
                  color: selectedWorker ? 'white' : 'rgba(255,255,255,0.4)',
                }}
              >
                <User size={15} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                <span className="flex-1 truncate">
                  {loadingWorkers
                    ? 'Cargando trabajadores...'
                    : selectedWorker
                    ? selectedWorker.fullName
                    : 'Selecciona un trabajador...'}
                </span>
                {selectedWorker && (
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                    {ROLE_LABELS[selectedWorker.appRole] || selectedWorker.appRole}
                  </span>
                )}
                <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {/* Dropdown list */}
              {dropdownOpen && !loadingWorkers && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl"
                  style={{ backgroundColor: '#1a2d4f', border: '1px solid #243f72', maxHeight: '220px', overflowY: 'auto' }}
                >
                  {workers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      No hay trabajadores activos
                    </div>
                  ) : (
                    workers.map((worker) => (
                      <button
                        key={worker.username}
                        type="button"
                        onClick={() => {
                          setSelectedWorker(worker);
                          setDropdownOpen(false);
                          setError('');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:brightness-125"
                        style={{
                          backgroundColor: selectedWorker?.username === worker.username ? 'rgba(245,158,11,0.12)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}
                        >
                          {worker.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>{worker.fullName}</p>
                          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{ROLE_LABELS[worker.appRole] || worker.appRole}</p>
                        </div>
                        {selectedWorker?.username === worker.username && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f59e0b' }}>
                            <span className="text-white font-bold" style={{ fontSize: '9px' }}>✓</span>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'white',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#f59e0b')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !selectedWorker || !password}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <LogIn size={16} />
            )}
            {loading ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 pb-7 text-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            ¿Olvidaste tu contraseña? Contacta al administrador.
          </p>
        </div>
      </div>

      {/* Backdrop to close dropdown */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
      )}
    </div>
  );
}