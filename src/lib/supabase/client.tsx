import { createBrowserClient } from '@supabase/ssr';

// ─── Wipe storage helper (kept for backwards compatibility) ───────────────────
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
// KEY CHANGE: persistSession: false
//
// The session lives in memory only — never written to localStorage or cookies.
// This eliminates ALL stale-token errors:
//   - No tokens survive closing the tab → no stale refresh tokens on next open
//   - No "Invalid Refresh Token" loops → nothing to refresh on startup
//   - autoRefreshToken: true → token refreshes normally while the tab is open
//
// Trade-off: users log in again when they open a new tab or refresh the page.
// For a restaurant POS used during shifts, this is perfectly acceptable.

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

// Singleton on window — survives HMR module reloads in development.
declare global { interface Window { __sr_supabase?: ReturnType<typeof createNewClient>; } }

export function createClient() {
  if (typeof window !== 'undefined') {
    if (!window.__sr_supabase) {
      window.__sr_supabase = createNewClient();
    }
    return window.__sr_supabase;
  }
  return createNewClient(); // SSR fallback
}