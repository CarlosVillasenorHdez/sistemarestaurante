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
// Inspect stored session WITHOUT making any network request.
// Returns true if the token should be wiped before creating the client.
// We wipe if:
//   1. The access token is expired (exp < now), OR
//   2. The refresh_token field is empty/missing (token was deleted from DB via SQL)
//      — in this case the GoTrueClient would immediately try to refresh and fail.

function shouldWipeTokens(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const items = canUseCookies() ? fromCookies() : fromStorage();
    const tokenItem = items.find((c) => c.name.includes('auth-token'));
    if (!tokenItem?.value) return false; // no tokens — nothing to wipe

    let parsed: any;
    try { parsed = JSON.parse(tokenItem.value); } catch { return true; } // corrupt — wipe

    // If refresh_token is missing or empty, the token is unusable.
    // The GoTrueClient will try to call /token?grant_type=refresh_token and get 400.
    if (!parsed?.refresh_token) return true;

    // If access token is expired, wipe (GoTrueClient would try to refresh it).
    const accessToken = parsed?.access_token;
    if (accessToken) {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (Date.now() > (payload.exp ?? 0) * 1000) return true;
        } catch { return true; }
      }
    }

    return false;
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
        autoRefreshToken: false,   // disabled at boot; re-enabled after successful login
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
// Pre-flight check: if tokens are stale/broken, wipe storage BEFORE creating
// the client so it starts clean and makes zero network requests on boot.
let _client: ReturnType<typeof createNewClient> | null = null;

export function createClient() {
  if (!_client) {
    if (shouldWipeTokens()) {
      wipeAuthStorage();
    }
    _client = createNewClient();
  }
  return _client;
}