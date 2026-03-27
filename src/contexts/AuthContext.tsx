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

  const supabase = createClient();

  // Guard: prevents the SIGNED_OUT listener from re-entering clearAuthState
  // when WE triggered the sign-out.
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

  // Clears React state and storage without calling supabase.auth.signOut(),
  // which would fire SIGNED_OUT and cause an infinite loop.
  const clearAuthState = useCallback(() => {
    if (clearingRef.current) return;
    clearingRef.current = true;
    try {
      wipeAuthStorage();
      // Do NOT reset the singleton here — the active useEffect still holds
      // a reference to this client and its subscription. Resetting it would
      // create a new client on the next render while the old subscription
      // is still alive, causing duplicate listeners and repeated token errors.
      setUser(null);
      setSession(null);
      setAppUser(null);
    } finally {
      clearingRef.current = false;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        // Invalid / expired refresh token — wipe silently, show login
        clearAuthState();
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
      if (clearingRef.current) return; // we triggered this — ignore

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setAppUser(null);
        setLoading(false);
        return;
      }

      // Background auto-refresh failed (stale/missing refresh token)
      if (event === 'TOKEN_REFRESHED' && !newSession) {
        clearAuthState();
        setLoading(false);
        return;
      }

      // Initial session event with no session — user is logged out
      if (event === 'INITIAL_SESSION' && !newSession) {
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
  }, [supabase, fetchAppUser, clearAuthState]);

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
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    clearingRef.current = true;
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