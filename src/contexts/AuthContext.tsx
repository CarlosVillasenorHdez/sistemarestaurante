'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '../lib/supabase/client';

export type AppRole = 'admin' | 'gerente' | 'cajero' | 'mesero' | 'cocinero' | 'ayudante_cocina' | 'repartidor';

interface AppUser {
  id: string;
  authUserId: string;
  username: string;
  fullName: string;
  appRole: AppRole;
  employeeId: string | null;
  isActive: boolean;
  tenantId: string | null;
  branchId: string | null;
  branchName: string | null;
}

interface BrandConfig {
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  restaurantName: string;
  theme: 'dark' | 'light';
}

interface AuthContextValue {
  appUser: AppUser | null;
  loading: boolean;
  brandConfig: BrandConfig;
  tenantId: string | null;
  branchId: string | null;
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

// Default admin user — no login required
// Uses the default tenant from the migration
const DEFAULT_ADMIN: AppUser = {
  id: 'admin',
  authUserId: 'admin',
  username: 'admin',
  fullName: 'Administrador',
  appRole: 'admin',
  employeeId: null,
  isActive: true,
  tenantId: '00000000-0000-0000-0000-000000000001',
  branchId: null,
  branchName: null,
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    primaryColor: '#1B3A6B', accentColor: '#f59e0b',
    logoUrl: '', restaurantName: 'SistemaRest', theme: 'dark',
  });

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

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
  }, []);

  const signOut = async () => {
    // No-op — no auth to sign out from in this mode
  };

  const createUser = async (username: string, password: string, fullName: string, role: AppRole, employeeId?: string) => {
    const { data, error } = await supabase.functions.invoke('create-app-user', {
      body: {
        username: username.trim().toLowerCase(), password, fullName, role,
        employeeId: employeeId || null,
        tenantId: DEFAULT_ADMIN.tenantId,
      },
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
      tenantId: u.tenant_id, branchId: u.branch_id, branchName: null,
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
      appUser: DEFAULT_ADMIN,
      loading,
      brandConfig,
      tenantId: DEFAULT_ADMIN.tenantId,
      branchId: DEFAULT_ADMIN.branchId,
      signOut,
      createUser, updateUserPassword, listUsers, toggleUserActive, updateUserRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;