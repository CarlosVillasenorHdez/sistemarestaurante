'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient, wipeAuthStorage } from '../lib/supabase/client';

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

  // Store the client in a ref so it NEVER changes between renders.
  // If we stored it as a plain variable or used createClient() in the body,
  // React re-renders would cause supabase to appear as a "new" dep in useEffect,
  // triggering getSession() again → infinite loop.
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Prevents the SIGNED_OUT event (fired by our own signOut call)
  // from re-entering clearAuthState and causing a loop.
  const clearingRef = useRef(false);

  const fetchAppUser = useCallback(async (authUid: string) => {
    const { data, error } = await supabase
      .from('app_users').select('*').eq('auth_user_id', authUid).single();
    if (!error && data) {
      setAppUser({
        id: data.id, authUserId: data.auth_user_id, username: data.username,
        fullName: data.full_name, appRole: data.app_role as AppRole,
        employeeId: data.employee_id, isActive: data.is_active,
      });
    } else {
      setAppUser(null);
    }
  }, [supabase]);

  // Clears React state and wipes stored tokens.
  // Does NOT reset the singleton client — that would cause a new GoTrueClient
  // to be created on the next render, which would detect the (now-wiped) storage
  // and start a fresh refresh loop.
  const clearAuthState = useCallback(() => {
    if (clearingRef.current) return;
    clearingRef.current = true;
    try {
      wipeAuthStorage();
      setUser(null);
      setSession(null);
      setAppUser(null);
    } finally {
      clearingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // One-time session check on mount.
    // If the token is invalid, wipe it and show the login page.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        wipeAuthStorage();
        setLoading(false);
        return;
      }
      if (!data.session) {
        setLoading(false);
        return;
      }
      setSession(data.session);
      setUser(data.session.user);
      fetchAppUser(data.session.user.id).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (clearingRef.current) return;

      if (event === 'SIGNED_OUT') {
        clearAuthState();
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && !newSession) {
        clearAuthState();
        setLoading(false);
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        fetchAppUser(newSession.user.id).finally(() => setLoading(false));
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps: run once on mount only. supabase is stable via useRef.

  const BRAND_CACHE_KEY = 'sistemarest_brand_config';
  useEffect(() => {
    const cached = sessionStorage.getItem(BRAND_CACHE_KEY);
    if (cached) {
      try { setBrandConfig(JSON.parse(cached)); return; }
      catch { sessionStorage.removeItem(BRAND_CACHE_KEY); }
    }
    supabase.from('system_config')
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount.

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Re-enable auto-refresh after a successful login.
    // We start with autoRefreshToken:false to prevent stale-token storms on boot,
    // but once the user has a fresh valid session we want normal refresh behaviour.
    try { (supabase.auth as any).startAutoRefresh(); } catch { /* not available in all versions */ }
    return data;
  };

  const signOut = async () => {
    clearingRef.current = true;
    try {
      await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
      wipeAuthStorage();
      setUser(null);
      setSession(null);
      setAppUser(null);
    } finally {
      clearingRef.current = false;
    }
  };

  const createUser = async (username: string, password: string, fullName: string, role: AppRole, employeeId?: string) => {
    const { data, error } = await supabase.functions.invoke('create-app-user', {
      body: { username: username.trim().toLowerCase(), password, fullName, role, employeeId: employeeId || null },
    });
    if (error) throw new Error(error.message || 'Error al crear usuario');
    if (data?.error) throw new Error(data.error);
  };

  const updateUserPassword = async (authUserId: string, newPassword: string) => {
    const { error } = await supabase.functions.invoke('update-user-password', {
      body: { auth_user_id: authUserId, new_password: newPassword },
    });
    if (error) throw error;
  };

  const listUsers = async (): Promise<AppUser[]> => {
    const { data, error } = await supabase.from('app_users').select('*').order('full_name');
    if (error) throw error;
    return (data || []).map((u: any) => ({
      id: u.id, authUserId: u.auth_user_id, username: u.username,
      fullName: u.full_name, appRole: u.app_role as AppRole,
      employeeId: u.employee_id, isActive: u.is_active,
    }));
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    const { error } = await supabase.from('app_users').update({ is_active: isActive }).eq('id', userId);
    if (error) throw error;
  };

  const updateUserRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from('app_users').update({ app_role: role }).eq('id', userId);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user, session, appUser, loading, brandConfig,
      signIn, signOut,
      createUser, updateUserPassword, listUsers, toggleUserActive, updateUserRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;