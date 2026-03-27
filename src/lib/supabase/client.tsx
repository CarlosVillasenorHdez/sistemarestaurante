import { createBrowserClient } from '@supabase/ssr';

// ─── Wipe storage helper ──────────────────────────────────────────────────────
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
// persistSession: false — session lives in memory only, never written to
// localStorage or cookies. Eliminates ALL stale-token / invalid-refresh-token
// errors on startup. autoRefreshToken keeps the token alive while the tab is open.

function createNewClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }
  );
}

declare global { interface Window { __sr_supabase?: ReturnType<typeof createNewClient>; } }

export function createClient() {
  if (typeof window !== 'undefined') {
    if (!window.__sr_supabase) {
      // Wipe any stale tokens BEFORE creating the client so Supabase never
      // reads an invalid refresh token from storage during initialization.
      wipeAuthStorage();
      window.__sr_supabase = createNewClient();
    }
    return window.__sr_supabase;
  }
  return createNewClient(); // SSR fallback
}