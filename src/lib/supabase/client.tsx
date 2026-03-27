import { createBrowserClient } from '@supabase/ssr';

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

const getToken = () =>
  (canUseCookies() ? fromCookies() : fromStorage())
    .find((c) => c.name.includes('auth-token'))?.value ?? null;

if (typeof window !== 'undefined' && !(window as any).__sb_patched__) {
  (window as any).__sb_patched__ = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const token = getToken();
    const url = typeof input === 'string' ? input
      : input instanceof URL ? input.href
      : (input as Request).url;
    if (token && (url.startsWith('/') || url.startsWith(window.location.origin))) {
      init = { ...(init || {}), headers: { ...(init?.headers || {}), 'x-sb-token': token } };
    }
    return orig(input, init);
  };
}

// Wipe all auth tokens from storage — called before creating a fresh client
// so stale tokens don't trigger refresh attempts.
export function wipeAuthStorage() {
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

/**
 * Proactively check stored session tokens for expiry or missing refresh token.
 * If the stored session has no refresh_token or is clearly expired, wipe it
 * before the Supabase client initializes — preventing the auto-refresh timer
 * from firing on bad tokens and logging AuthApiError to the console.
 */
function wipeStaleTokensIfNeeded() {
  if (typeof window === 'undefined') return;
  try {
    // Cast a wide net: any localStorage key that might hold a Supabase session
    const sessionKeys = Object.keys(localStorage).filter((k) => {
      const lower = k.toLowerCase();
      return (
        lower.includes('auth-token') ||
        lower.includes('auth_token') ||
        lower.includes('supabase') ||
        (lower.startsWith('sb-') && lower.includes('token')) ||
        (lower.startsWith('sb_') && lower.includes('token'))
      );
    });

    if (sessionKeys.length === 0) return; // nothing stored — no stale tokens

    let shouldWipe = false;
    for (const key of sessionKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const session = parsed?.currentSession ?? parsed;
        const hasRefreshToken = !!session?.refresh_token;
        const expiresAt: number | undefined = session?.expires_at;
        const nowSec = Math.floor(Date.now() / 1000);
        // Wipe if no refresh token or token expired more than 60s ago
        if (!hasRefreshToken || (expiresAt !== undefined && expiresAt < nowSec - 60)) {
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

function createNewClient() {
  // Wipe stale/invalid tokens before initializing so the auto-refresh
  // timer never attempts to refresh a token that doesn't exist.
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
              value ? setCookie(name, value, options)
                    : (document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=None; Secure`)
            );
          } else {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                value ? localStorage.setItem(`${PFX}${name}`, value)
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

// Singleton — one GoTrueClient for the entire app.
// Multiple instances each try to refresh tokens independently, exhausting the rate limit.
let _client: ReturnType<typeof createNewClient> | null = null;

export function createClient() {
  if (!_client) _client = createNewClient();
  return _client;
}

export function getSupabaseClient() {
  return createClient();
}

// Reset singleton after sign-out so the next sign-in starts fresh.
export function resetSupabaseClient() {
  _client = null;
}