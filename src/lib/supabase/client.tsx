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

// ─── No-op storage adapter ────────────────────────────────────────────────────
// Supabase will never read from or write to localStorage/cookies.
// This completely prevents "Invalid Refresh Token" errors on startup.
const noopStorage = {
  getItem: (_key: string): string | null => null,
  setItem: (_key: string, _value: string): void => {},
  removeItem: (_key: string): void => {},
};

// ─── Client factory ───────────────────────────────────────────────────────────
function createNewClient() {
  return createBrowserClient(
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