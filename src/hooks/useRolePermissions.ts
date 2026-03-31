'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Module-level cache — shared across all components in the same session
const _cache: Record<string, Record<string, boolean> | null> = {};

export function invalidatePermissionsCache(role?: string) {
  if (role) {
    delete _cache[role];
  } else {
    Object.keys(_cache).forEach((k) => delete _cache[k]);
  }
}

export function useRolePermissions() {
  const { appUser } = useAuth();
  const role = appUser?.appRole ?? null;

  const [permissions, setPermissions] = useState<Record<string, boolean> | null>(
    role ? (_cache[role] ?? null) : null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!role) {
      setLoading(false);
      return;
    }

    // Admin always has full access — skip DB query
    if (role === 'admin') {
      _cache[role] = {};
      setPermissions({});
      setLoading(false);
      return;
    }

    // Use cache if available
    if (_cache[role] !== undefined) {
      setPermissions(_cache[role]);
      setLoading(false);
      return;
    }

    // Fetch from DB
    const supabase = createClient();
    supabase
      .from('role_permissions')
      .select('page_key, can_access')
      .eq('role', role)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          // No permissions configured: default to DENY all for non-admin
          // (safer than allowing everything)
          // Exception: mesero and cocinero get pos + orders by default
          const safeDefaults: Record<string, boolean> = {
            pos: role === 'mesero' || role === 'cajero',
            orders: true,
            cocina: role === 'cocinero' || role === 'ayudante_cocina',
          };
          _cache[role] = safeDefaults;
          setPermissions(safeDefaults);
        } else {
          const map: Record<string, boolean> = {};
          data.forEach((row) => {
            map[row.page_key] = row.can_access;
          });
          _cache[role] = map;
          setPermissions(map);
        }
        setLoading(false);
      });
  }, [role]);

  function canAccess(pageKey: string): boolean {
    if (!role) return false;
    if (role === 'admin') return true;
    if (!permissions) return false; // still loading — deny until loaded
    if (pageKey in permissions) return permissions[pageKey];
    // Key not in DB: default deny for security
    return false;
  }

  return { canAccess, loading };
}