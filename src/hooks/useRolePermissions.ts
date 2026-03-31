'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Cache permissions per role so all components share one DB fetch
const _cache: Record<string, Record<string, boolean>> = {};

export function useRolePermissions() {
  const { appUser } = useAuth();
  const role = appUser?.appRole ?? null;

  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    role && _cache[role] ? _cache[role] : {}
  );
  const [loading, setLoading] = useState(!role || !_cache[role]);

  useEffect(() => {
    if (!role) { setLoading(false); return; }
    if (_cache[role]) { setPermissions(_cache[role]); setLoading(false); return; }

    // admin always has all permissions — no DB query needed
    if (role === 'admin') {
      _cache[role] = {};  // empty = no restrictions
      setPermissions({});
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from('role_permissions')
      .select('page_key, can_access')
      .eq('role', role)
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        (data || []).forEach((row: { page_key: string; can_access: boolean }) => {
          map[row.page_key] = row.can_access;
        });
        _cache[role] = map;
        setPermissions(map);
        setLoading(false);
      });
  }, [role]);

  // Returns true if the user can access a page
  // Admin always can. If no record exists for the page, default to true.
  function canAccess(pageKey: string): boolean {
    if (!role) return false;
    if (role === 'admin') return true;
    if (pageKey in permissions) return permissions[pageKey];
    return true; // default allow if not configured
  }

  // Call this after saving permissions to force a fresh fetch
  function invalidate() {
    if (role) delete _cache[role];
  }

  return { canAccess, loading, invalidate };
}
