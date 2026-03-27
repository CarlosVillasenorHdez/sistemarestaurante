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
  const initializedRef = useRef(false);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setAppUser(null);
    setLoading(false);
  }, []);

  const wipeAndReset = useCallback(async () => {
    try {
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
    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;

    const supabase = createClient();

    // Subscribe to auth state changes — this is the single source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (cancelled || clearingRef.current) return;

        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !newSession) {
          clearAuthState();
          return;
        }

        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          await fetchAppUser(newSession.user.id);
          setLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          // No session on initial load — user is logged out
          setLoading(false);
        } else if (!newSession) {
          clearAuthState();
        }
      }
    );

    // getSession() triggers INITIAL_SESSION event above — no extra server call needed
    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data.session) {
        // If there's a stored but invalid session, wipe it silently
        if (error) {
          wipeAndReset().then(() => clearAuthState());
        }
        // If no session, INITIAL_SESSION event already handled loading=false
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
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
    // Wipe stale tokens and reset singleton before each login attempt
    await wipeAndReset();
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    clearingRef.current = true;
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
      wipeAuthStorage();
      resetSupabaseClient();
      setUser(null);
      setSession(null);
      setAppUser(null);
    } finally {
      clearingRef.current = false;
      setLoading(false);
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