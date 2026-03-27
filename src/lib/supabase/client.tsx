import { createBrowserClient } from '@supabase/ssr';

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const PFX = 'sb_';

const canUseCookies = (() => {
  let cache: boolean | null = null;
  return () => {
    if (typeof document === 'undefined') return false;
    if (cache !== null) return cache;
    const k = '__sb_test__';
    document.cookie = `${k}=1; Path=/; SameSite=None; Secure; Partitioned`;
    cache = document.cookie.includes(k);
    document.cookie = `${k}=; Path=/; Max-Age=0; SameSite=None; Secure`;
    return cache;
  };
})();

const fromCookies = () =>
  typeof document === 'undefined' ? [] :
  document.cookie.split(';').filter(Boolean).map((c) => {
    const [name, ...rest] = c.trim().split('=');
    return { name: name.trim(), value: decodeURIComponent(rest.join('=')) };
  }).filter((c) => c.name);

const fromStorage = () => {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PFX))
      .map((k) => ({ name: k.slice(PFX.length), value: localStorage.getItem(k) || '' }));
  } catch { return []; }
};

const setCookie = (name: string, value: string, options?: any) => {
  let s = `${name}=${encodeURIComponent(value)}; Path=${options?.path || '/'}; SameSite=None; Secure; Partitioned`;
  if (options?.maxAge) s += `; Max-Age=${options.maxAge}`;
  if (options?.domain) s += `; Domain=${options.domain}`;
  if (options?.expires) s += `; Expires=${new Date(options.expires).toUTCString()}`;
  document.cookie = s;
};

// ─── Auth Storage Wipe ────────────────────────────────────────────────────────

/**
 * Wipe ALL Supabase auth tokens from localStorage and cookies.
 * Called before sign-in and when an invalid refresh token error is detected.
 */
export function wipeAuthStorage() {
  if (typeof window === 'undefined') return;

  // Wipe localStorage — match any key that looks like a Supabase auth key
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

  // Wipe cookies
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

/**
 * Check if any stored Supabase session token is stale/expired/missing refresh_token.
 * If so, wipe everything. This prevents the GoTrue auto-refresh timer from
 * firing on bad tokens and logging AuthApiError to the console.
 *
 * Strategy: parse the session JSON and check expires_at + refresh_token.
 * If parsing fails or token is bad → wipe. If no session keys exist → skip.
 */
function wipeStaleTokensIfNeeded() {
  if (typeof window === 'undefined') return;

  try {
    const allKeys = Object.keys(localStorage);

    // Find any key that could hold a Supabase session
    const sessionKeys = allKeys.filter((k) => {
      const lower = k.toLowerCase();
      return (
        lower.startsWith('sb-') ||
        lower.startsWith('sb_') ||
        lower.startsWith('supabase') ||
        lower.includes('auth-token') ||
        lower.includes('auth_token')
      );
    });

    if (sessionKeys.length === 0) return; // No stored session — nothing to wipe

    const nowSec = Math.floor(Date.now() / 1000);
    let shouldWipe = false;

    for (const key of sessionKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        // @supabase/ssr stores: { access_token, refresh_token, expires_at, ... }
        // or nested under currentSession
        const session = parsed?.currentSession ?? parsed;

        const hasRefreshToken = !!(session?.refresh_token);
        const expiresAt: number | undefined = session?.expires_at;

        if (!hasRefreshToken) {
          shouldWipe = true;
          break;
        }

        // Expired more than 60 seconds ago → stale
        if (expiresAt !== undefined && expiresAt < nowSec - 60) {
          shouldWipe = true;
          break;
        }
      } catch {
        // Malformed JSON — wipe it
        shouldWipe = true;
        break;
      }
    }

    if (shouldWipe) {
      wipeAuthStorage();
    }
  } catch { /* ignore */ }
}

// ─── Singleton Client ─────────────────────────────────────────────────────────

function createNewClient() {
  // Always wipe stale tokens before creating the client so the
  // GoTrue auto-refresh timer never fires on invalid tokens.
  wipeStaleTokensIfNeeded();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      cookies: {
        getAll: () => canUseCookies() ? fromCookies() : fromStorage(),
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return;
          if (canUseCookies()) {
            cookiesToSet.forEach(({ name, value, options }) =>
              value
                ? setCookie(name, value, options)
                : (document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=None; Secure`)
            );
          } else {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                value
                  ? localStorage.setItem(`${PFX}${name}`, value)
                  : localStorage.removeItem(`${PFX}${name}`);
              } catch {}
              if (value) setCookie(name, value, options);
            });
          }
        },
      },
    }
  );
}

// One GoTrueClient for the entire app lifetime.
// Multiple instances each try to refresh tokens independently → rate limit exhaustion.
let _client: ReturnType<typeof createNewClient> | null = null;

export function createClient() {
  if (!_client) _client = createNewClient();
  return _client;
}

export function getSupabaseClient() {
  return createClient();
}

// Reset singleton — call only during explicit sign-out.
export function resetSupabaseClient() {
  _client = null;
}