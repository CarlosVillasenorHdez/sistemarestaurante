'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient, wipeAuthStorage, resetSupabaseClient } from '../lib/supabase/client';

export type AppRole = 'admin' | 'gerente' | 'cajero' | 'mesero' | 'cocinero' | 'ayudante_cocina' | 'repartidor';

interface AppUser {
  id: string;
  authUserId: string;
  username: string;
  fullName: string;
  appRole: AppRole;
  employeeId: string | null;
  isActive: boolean;
}

interface BrandConfig {
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  restaurantName: string;
  theme: 'dark' | 'light';
}

interface AuthContextValue {
  user: any;
  session: any;
  appUser: AppUser | null;
  loading: boolean;
  brandConfig: BrandConfig;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  createUser: (username: string, password: string, fullName: string, role: AppRole, employeeId?: string) => Promise<void>;
  updateUserPassword: (authUserId: string, newPassword: string) => Promise<void>;
  listUsers: () => Promise<AppUser[]>;
  toggleUserActive: (userId: string, isActive: boolean) => Promise<void>;
  updateUserRole: (userId: string, role: AppRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const isAuthError = (error: any): boolean => {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('refresh token') ||
    msg.includes('invalid token') ||
    msg.includes('jwt expired') ||
    msg.includes('token not found') ||
    msg.includes('not found') ||
    msg.includes('invalid refresh') ||
    msg.includes('session_not_found') ||
    msg.includes('user not found') ||
    error.status === 401 ||
    error.__isAuthError === true
  );
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser]       = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    primaryColor: '#1B3A6B', accentColor: '#f59e0b',
    logoUrl: '', restaurantName: 'SistemaRest', theme: 'dark',
  });

  const clearingRef = useRef(false);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setAppUser(null);
    setLoading(false);
  }, []);

  const wipeAndReset = useCallback(async () => {
    try {
      // Silently sign out locally to clear GoTrue internal state
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } catch { /* ignore */ }
    wipeAuthStorage();
    resetSupabaseClient();
  }, []);

  const fetchAppUser = useCallback(async (authUid: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('app_users').select('*').eq('auth_user_id', authUid).single();
    if (!error && data) {
      setAppUser({
        id: data.id,
        authUserId: data.auth_user_id,
        username: data.username,
        fullName: data.full_name,
        appRole: data.app_role as AppRole,
        employeeId: data.employee_id,
        isActive: data.is_active,
      });
    } else {
      setAppUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (cancelled) return;

      // getSession() itself errored
      if (sessionError) {
        await wipeAndReset();
        clearAuthState();
        return;
      }

      // No stored session — user is logged out
      if (!sessionData.session) {
        setLoading(false);
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (cancelled || clearingRef.current) return;
            if (newSession) {
              setSession(newSession);
              setUser(newSession.user);
              await fetchAppUser(newSession.user.id);
            } else {
              clearAuthState();
            }
            if (!cancelled) setLoading(false);
          }
        );
        subscription = sub;
        return;
      }

      // Validate the stored session server-side via getUser()
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !userData?.user) {
        // Server says the token is invalid — wipe everything silently
        await wipeAndReset();
        clearAuthState();
        return;
      }

      // Session is valid — set state
      setSession(sessionData.session);
      setUser(sessionData.session.user);
      if (!cancelled) await fetchAppUser(sessionData.session.user.id);
      if (cancelled) return;
      setLoading(false);

      // Attach listener after confirming valid session
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (cancelled || clearingRef.current) return;

          if (event === 'SIGNED_OUT') {
            await wipeAndReset();
            clearAuthState();
            return;
          }

          if (event === 'TOKEN_REFRESHED' && !newSession) {
            await wipeAndReset();
            clearAuthState();
            return;
          }

          if (event === 'INITIAL_SESSION' && !newSession) {
            setLoading(false);
            return;
          }

          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            await fetchAppUser(newSession.user.id);
          } else {
            clearAuthState();
          }

          if (!cancelled) setLoading(false);
        }
      );

      subscription = sub;
    };

    init();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [fetchAppUser, clearAuthState, wipeAndReset]);

  // ─── Brand Config ───────────────────────────────────────────────────────────
  const BRAND_CACHE_KEY = 'sistemarest_brand_config';
  useEffect(() => {
    const supabase = createClient();
    const cached = sessionStorage.getItem(BRAND_CACHE_KEY);
    if (cached) {
      try { setBrandConfig(JSON.parse(cached)); return; }
      catch { sessionStorage.removeItem(BRAND_CACHE_KEY); }
    }
    supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['brand_primary_color', 'brand_accent_color', 'brand_logo_url', 'restaurant_name', 'brand_theme'])
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        data.forEach((r: any) => { map[r.config_key] = r.config_value; });
        const config: BrandConfig = {
          primaryColor:   map.brand_primary_color || '#1B3A6B',
          accentColor:    map.brand_accent_color  || '#f59e0b',
          logoUrl:        map.brand_logo_url      || '',
          restaurantName: map.restaurant_name     || 'SistemaRest',
          theme:          (map.brand_theme as 'dark' | 'light') || 'dark',
        };
        setBrandConfig(config);
        sessionStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(config));
      });
  }, []);

  // ─── Auth Actions ───────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string) => {
    // Always wipe stale tokens before signing in
    wipeAuthStorage();
    resetSupabaseClient();
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    clearingRef.current = true;
    const supabase = createClient();
    try {
      await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
      wipeAuthStorage();
      resetSupabaseClient();
      setUser(null);
      setSession(null);
      setAppUser(null);
    } finally {
      clearingRef.current = false;
    }
  };

  const createUser = async (username: string, password: string, fullName: string, role: AppRole, employeeId?: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('create-app-user', {
      body: { username: username.trim().toLowerCase(), password, fullName, role, employeeId: employeeId || null },
    });
    if (error) throw new Error(error.message || 'Error al crear usuario');
    if (data?.error) throw new Error(data.error);
  };

  const updateUserPassword = async (authUserId: string, newPassword: string) => {
    const supabase = createClient();
    const { error } = await supabase.functions.invoke('update-user-password', {
      body: { auth_user_id: authUserId, new_password: newPassword },
    });
    if (error) throw error;
  };

  const listUsers = async (): Promise<AppUser[]> => {
    const supabase = createClient();
    const { data, error } = await supabase.from('app_users').select('*').order('full_name');
    if (error) throw error;
    return (data || []).map((u: any) => ({
      id: u.id,
      authUserId: u.auth_user_id,
      username: u.username,
      fullName: u.full_name,
      appRole: u.app_role as AppRole,
      employeeId: u.employee_id,
      isActive: u.is_active,
    }));
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('app_users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
  };

  const updateUserRole = async (userId: string, role: AppRole) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('app_users')
      .update({ app_role: role, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user, session, appUser, loading, brandConfig,
      signIn, signOut, createUser, updateUserPassword,
      listUsers, toggleUserActive, updateUserRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;