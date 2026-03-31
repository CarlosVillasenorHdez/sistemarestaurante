import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ─── Wipe storage helper ───────────────────────────────────────────────────────
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

// ─── Client factory ───────────────────────────────────────────────────────────
// persistSession: true  → token saved in localStorage so auth.uid() works for RLS
// autoRefreshToken: false → CRITICAL: prevents the "Invalid Refresh Token" loop
//                           that broke the app before. Token is valid for 1 hour.
//                           User re-logs in if session expires naturally.
function createNewClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: false,   // ← key: no refresh loop possible
        detectSessionInUrl: false,
        storageKey: 'aldente_auth',
      },
    }
  );
}

type SupabaseClient = ReturnType<typeof createNewClient>;
declare global { interface Window { __aldente_supabase?: SupabaseClient; } }

export function createClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    if (!window.__aldente_supabase) {
      window.__aldente_supabase = createNewClient();
    }
    return window.__aldente_supabase;
  }
  return createNewClient(); // SSR fallback
}