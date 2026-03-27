import { createBrowserClient } from '@supabase/ssr';

// ─── Auth Storage Wipe ────────────────────────────────────────────────────────

/**
 * Wipe ALL Supabase auth tokens from localStorage and cookies.
 */
export function wipeAuthStorage() {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove = Object.keys(localStorage).filter((k) => {
      const lower = k.toLowerCase();
      return (
        lower.startsWith('sb-') ||
        lower.startsWith('sb_') ||
        lower.startsWith('supabase') ||
        lower.includes('auth-token') ||
        lower.includes('auth_token')
      );
    });
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* SSR / private browsing */ }

  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.trim().split('=')[0].trim();
      if (
        name.startsWith('sb-') ||
        name.startsWith('sb_') ||
        name.toLowerCase().startsWith('supabase')
      ) {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=None; Secure`;
        document.cookie = `${name}=; Path=/; Max-Age=0`;
      }
    });
  } catch { /* SSR */ }
}

// ─── Singleton Client ─────────────────────────────────────────────────────────

let _client: ReturnType<typeof createBrowserClient> | null = null;

function buildClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
}

export function createClient() {
  if (!_client) _client = buildClient();
  return _client;
}

export function getSupabaseClient() {
  return createClient();
}

// Reset singleton — call during sign-out or after invalid token wipe.
export function resetSupabaseClient() {
  _client = null;
}