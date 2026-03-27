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

  // Track whether stale tokens were already wiped so we only do it once
  const tokenWipedRef = useRef(false);
  const clearingRef = useRef(false);

  const getSupabase = useCallback(() => createClient(), []);

  const fetchAppUser = useCallback(async (authUid: string) => {
    const supabase = getSupabase();
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
  }, [getSupabase]);

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
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      // If we already wiped tokens in a previous cycle, skip getSession
      // and go straight to setting up a fresh listener.
      const supabase = getSupabase();

      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error) {
        // Stale/invalid refresh token — wipe everything and reset the singleton.
        // Do NOT set up onAuthStateChange on this broken client.
        // Setting tokenWipedRef prevents an infinite wipe loop.
        if (!tokenWipedRef.current) {
          tokenWipedRef.current = true;
          wipeAuthStorage();
          resetSupabaseClient();
        }
        setUser(null);
        setSession(null);
        setAppUser(null);
        setLoading(false);
        return;
      }

      // Reset the wipe guard once we have a clean session cycle
      tokenWipedRef.current = false;

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        await fetchAppUser(data.session.user.id);
      }

      if (cancelled) return;
      setLoading(false);

      // Set up the auth state listener only after a successful getSession
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (cancelled || clearingRef.current) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setAppUser(null);
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED' && !newSession) {
          clearAuthState();
          setLoading(false);
          return;
        }

        if (event === 'INITIAL_SESSION' && !newSession) {
          setLoading(false);
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          fetchAppUser(newSession.user.id).finally(() => {
            if (!cancelled) setLoading(false);
          });
        } else {
          setAppUser(null);
          setLoading(false);
        }
      });

      subscription = sub;
    };

    init();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [getSupabase, fetchAppUser, clearAuthState]);

  const BRAND_CACHE_KEY = 'sistemarest_brand_config';
  useEffect(() => {
    const supabase = getSupabase();
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
  }, [getSupabase]);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    clearingRef.current = true;
    const supabase = getSupabase();
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
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke('create-app-user', {
      body: { username: username.trim().toLowerCase(), password, fullName, role, employeeId: employeeId || null },
    });
    if (error) throw new Error(error.message || 'Error al crear usuario');
    if (data?.error) throw new Error(data.error);
  };

  const updateUserPassword = async (authUserId: string, newPassword: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.functions.invoke('update-user-password', {
      body: { auth_user_id: authUserId, new_password: newPassword },
    });
    if (error) throw error;
  };

  const listUsers = async (): Promise<AppUser[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('app_users').select('*').order('full_name');
    if (error) throw error;
    return (data || []).map((u: any) => ({
      id: u.id, authUserId: u.auth_user_id, username: u.username,
      fullName: u.full_name, appRole: u.app_role as AppRole,
      employeeId: u.employee_id, isActive: u.is_active,
    }));
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('app_users').update({ is_active: isActive }).eq('id', userId);
    if (error) throw error;
  };

  const updateUserRole = async (userId: string, role: AppRole) => {
    const supabase = getSupabase();
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