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

// ─── Storage wipe ─────────────────────────────────────────────────────────────

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

// ─── Token validation ─────────────────────────────────────────────────────────
// Check if the stored access token is expired WITHOUT making a network request.
// If it's expired, wipe storage immediately before the GoTrueClient even starts,
// preventing it from attempting a refresh that would hit the rate limit.

function isStoredTokenExpired(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // The access token is a JWT — check its exp claim
    const items = canUseCookies() ? fromCookies() : fromStorage();
    const tokenItem = items.find((c) => c.name.includes('auth-token'));
    if (!tokenItem?.value) return false;

    let parsed: any;
    try { parsed = JSON.parse(tokenItem.value); } catch { return false; }

    const accessToken = parsed?.access_token;
    if (!accessToken) return false;

    // Decode JWT payload (base64url middle segment)
    const parts = accessToken.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // exp is in seconds; add 30s buffer
    const expiredAt = (payload.exp ?? 0) * 1000;
    return Date.now() > expiredAt - 30000;
  } catch {
    return false;
  }
}

// ─── fetch patch ──────────────────────────────────────────────────────────────

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

// ─── Client factory ───────────────────────────────────────────────────────────

function createNewClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // autoRefreshToken DISABLED — prevents the GoTrueClient from making
        // hundreds of /token requests when the refresh_token was deleted from
        // Supabase (DB reset, project switch, etc.).
        // Tokens refresh on demand when making authenticated requests.
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
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
// Before creating it, check if the stored token is already expired.
// If it is, wipe storage so the client starts clean (no refresh attempt).
let _client: ReturnType<typeof createNewClient> | null = null;

export function createClient() {
  if (!_client) {
    // Pre-flight: if the stored token is expired, clear storage NOW
    // before the GoTrueClient initializes and tries to refresh it.
    if (isStoredTokenExpired()) {
      wipeAuthStorage();
    }
    _client = createNewClient();
  }
  return _client;
}