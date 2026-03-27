import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ─── Wipe storage helper (kept for backward compat) ───────────────────────────
export function wipeAuthStorage() {
  if (typeof window === 'undefined') return;
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb_') || k.startsWith('sb-') || k.toLowerCase().startsWith('supabase'))
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* SSR */ }
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.trim().split('=')[0].trim();
      if (name.startsWith('sb-') || name.startsWith('sb_') || name.toLowerCase().startsWith('supabase')) {
        document.cookie = name + '=; Path=/; Max-Age=0; SameSite=None; Secure';
        document.cookie = name + '=; Path=/; Max-Age=0';
      }
    });
  } catch { /* SSR */ }
}

export const clearSupabaseSession = wipeAuthStorage;

// ─── No-op storage adapter ────────────────────────────────────────────────────
const noopStorage = {
  getItem: (_key: string): string | null => null,
  setItem: (_key: string, _value: string): void => {},
  removeItem: (_key: string): void => {},
};

// ─── Client factory ───────────────────────────────────────────────────────────
// Uses @supabase/supabase-js directly (not @supabase/ssr) to avoid any
// automatic token refresh that triggers "Invalid Refresh Token" errors.
function createNewClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: noopStorage,
      },
    }
  );
}

type SupabaseClient = ReturnType<typeof createNewClient>;
declare global { interface Window { __sr_supabase?: SupabaseClient; } }

export function createClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    if (!window.__sr_supabase) {
      window.__sr_supabase = createNewClient();
    }
    return window.__sr_supabase;
  }
  return createNewClient(); // SSR fallback
}