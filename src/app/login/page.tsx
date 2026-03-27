'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';
import { createClient } from '@/lib/supabase/client';

interface WorkerOption {
  username: string;
  full_name: string;
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  useEffect(() => {
    supabase
      .from('app_users')
      .select('username, full_name')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data, error: err }) => {
        if (!err && data) {
          setWorkers(data as WorkerOption[]);
          if (data.length > 0) setSelectedUsername(data[0].username);
        }
        setLoadingWorkers(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedUsername) { setError('Por favor selecciona un usuario.'); return; }
    setLoading(true);
    try {
      await signIn(`${selectedUsername}@sistemarest.local`, password);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Credenciales incorrectas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#0f1e38' }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <AppLogo className="h-14 w-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">SistemaRest</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Gestión Integral para Restaurantes
          </p>
        </div>

        <div className="rounded-2xl p-8 shadow-2xl"
          style={{ backgroundColor: '#162d52', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5"
                style={{ color: 'rgba(255,255,255,0.7)' }}>Usuario</label>
              {loadingWorkers ? (
                <div className="w-full rounded-lg px-4 py-2.5 text-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}>
                  Cargando usuarios...
                </div>
              ) : (
                <select value={selectedUsername} onChange={(e) => setSelectedUsername(e.target.value)}
                  required className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none appearance-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                  {workers.map((w) => (
                    <option key={w.username} value={w.username}
                      style={{ backgroundColor: '#162d52', color: 'white' }}>
                      {w.full_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5"
                style={{ color: 'rgba(255,255,255,0.7)' }}>Contraseña</label>
              <input type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                required autoComplete="current-password" placeholder="••••••••"
                className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)' }} />
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5',
                  border: '1px solid rgba(239,68,68,0.3)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || loadingWorkers}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#f59e0b' }}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.25)' }}>
          © {new Date().getFullYear()} SistemaRest — Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}