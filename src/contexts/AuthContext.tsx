'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

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
  // Admin-only helpers
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
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    primaryColor: '#1B3A6B',
    accentColor: '#f59e0b',
    logoUrl: '',
    restaurantName: 'SistemaRest',
    theme: 'dark',
  });
  // Use singleton client to avoid creating a new GoTrueClient on every render,
  // which would trigger repeated getSession() calls and hit the rate limit.
  const supabase = getSupabaseClient();

  const fetchAppUser = useCallback(async (authUid: string) => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('auth_user_id', authUid)
      .single();
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
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // If the stored refresh token is invalid/expired, wipe it and treat as logged out
      if (error) {
        clearAuthState();
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAppUser(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // On any sign-out path (explicit, token expiry, remote revoke) wipe stale tokens
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        clearAuthState();
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAppUser(session.user.id).finally(() => setLoading(false));
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAppUser]);

  const BRAND_CACHE_KEY = 'sistemarest_brand_config';

  // Load brand config from system_config (with sessionStorage cache)
  useEffect(() => {
    const cached = sessionStorage.getItem(BRAND_CACHE_KEY);
    if (cached) {
      try {
        setBrandConfig(JSON.parse(cached));
        return;
      } catch {
        sessionStorage.removeItem(BRAND_CACHE_KEY);
      }
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
          primaryColor: map.brand_primary_color || '#1B3A6B',
          accentColor: map.brand_accent_color || '#f59e0b',
          logoUrl: map.brand_logo_url || '',
          restaurantName: map.restaurant_name || 'SistemaRest',
          theme: (map.brand_theme as 'dark' | 'light') || 'dark',
        };
        setBrandConfig(config);
        sessionStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(config));
      });
  }, []);

  // Wipe all Supabase auth keys from localStorage to prevent stale token loops.
  // Called on explicit signOut AND on SIGNED_OUT events (token expiry, remote revoke).
  const clearAuthState = () => {
    try {
      const keysToRemove = Object.keys(localStorage).filter(
        (k) => k.startsWith('sb-') || k.startsWith('supabase')
      );
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // localStorage may be unavailable in some environments — fail silently
    }
    setUser(null);
    setSession(null);
    setAppUser(null);
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // signOut can fail when the token is already invalid — clear locally anyway
    } finally {
      clearAuthState();
    }
  };

  // Admin: create a new system user via Edge Function (uses Service Role Key server-side)
  const createUser = async (username: string, password: string, fullName: string, role: AppRole, employeeId?: string) => {
    const { data, error } = await supabase.functions.invoke('create-app-user', {
      body: {
        username: username.trim().toLowerCase(),
        password,
        fullName,
        role,
        employeeId: employeeId || null,
      },
    });
    if (error) throw new Error(error.message || 'Error al crear usuario');
    if (data?.error) throw new Error(data.error);
  };

  // Admin: update password for a user (uses Supabase admin)
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