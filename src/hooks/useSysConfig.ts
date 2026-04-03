'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// Module-level cache so all components share one DB fetch per session
let _cache: Record<string, string> | null = null;
let _loading = false;
const _listeners: Array<(cfg: Record<string, string>) => void> = [];

function notifyListeners(cfg: Record<string, string>) {
  _listeners.forEach((fn) => fn(cfg));
}

async function loadConfig() {
  if (_cache) return _cache;
  if (_loading) return null;
  _loading = true;
  const supabase = createClient();
  const { data } = await supabase
    .from('system_config')
    .select('config_key, config_value');
  const map: Record<string, string> = {};
  (data || []).forEach((r: { config_key: string; config_value: string }) => {
    map[r.config_key] = r.config_value;
  });
  _cache = map;
  _loading = false;
  notifyListeners(map);
  return map;
}

export function invalidateSysConfigCache() {
  _cache = null;
}

/**
 * Hook: reads system_config from DB with module-level cache.
 * Returns typed accessors for the most common config values.
 */
export function useSysConfig() {
  const [config, setConfig] = useState<Record<string, string>>(_cache ?? {});

  useEffect(() => {
    if (_cache) {
      setConfig(_cache);
      return;
    }
    const listener = (cfg: Record<string, string>) => setConfig(cfg);
    _listeners.push(listener);
    loadConfig();
    return () => {
      const idx = _listeners.indexOf(listener);
      if (idx >= 0) _listeners.splice(idx, 1);
    };
  }, []);

  // Typed accessors
  const ivaPercent = parseFloat(config['iva_percent'] ?? '16');
  const currencySymbol = config['currency_symbol'] ?? '$';
  const currencyLocale = config['currency_locale'] ?? 'es-MX';
  const currencyCode = config['currency_code'] ?? 'MXN';
  const restaurantName = config['restaurant_name'] ?? 'Aldente';

  return { config, ivaPercent, currencySymbol, currencyLocale, currencyCode, restaurantName };
}
