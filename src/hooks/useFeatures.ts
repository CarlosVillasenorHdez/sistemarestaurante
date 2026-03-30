'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Features {
  lealtad: boolean;
  reservaciones: boolean;
  delivery: boolean;
  meseroMovil: boolean;
  inventario: boolean;
  recursosHumanos: boolean;
  gastos: boolean;
  reportes: boolean;
  alarmas: boolean;
  multiSucursal: boolean;
}

export const DEFAULT_FEATURES: Features = {
  lealtad: true,
  reservaciones: true,
  delivery: true,
  meseroMovil: true,
  inventario: true,
  recursosHumanos: true,
  gastos: true,
  reportes: true,
  alarmas: true,
  multiSucursal: false,
};

export const FEATURE_KEYS: Record<keyof Features, string> = {
  lealtad:         'feature_lealtad',
  reservaciones:   'feature_reservaciones',
  delivery:        'feature_delivery',
  meseroMovil:     'feature_mesero_movil',
  inventario:      'feature_inventario',
  recursosHumanos: 'feature_recursos_humanos',
  gastos:          'feature_gastos',
  reportes:        'feature_reportes',
  alarmas:         'feature_alarmas',
  multiSucursal:   'feature_multi_sucursal',
};

let _cache: Features | null = null;
let _listeners: Array<(f: Features) => void> = [];

export function invalidateFeaturesCache() { _cache = null; }

async function fetchFeatures(): Promise<Features> {
  if (_cache) return _cache;
  const supabase = createClient();
  const { data } = await supabase
    .from('system_config')
    .select('config_key, config_value')
    .like('config_key', 'feature_%');

  const result: Features = { ...DEFAULT_FEATURES };
  (data || []).forEach((row: any) => {
    const feat = Object.entries(FEATURE_KEYS).find(([, k]) => k === row.config_key)?.[0] as keyof Features | undefined;
    if (feat) result[feat] = row.config_value === 'true';
  });
  _cache = result;
  _listeners.forEach(fn => fn(result));
  return result;
}

export function useFeatures() {
  const [features, setFeatures] = useState<Features>(_cache ?? DEFAULT_FEATURES);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    _listeners.push(setFeatures);
    if (!_cache) {
      fetchFeatures().then(f => { setFeatures(f); setLoading(false); });
    } else {
      setLoading(false);
    }
    return () => { _listeners = _listeners.filter(fn => fn !== setFeatures); };
  }, []);

  return { features, loading };
}
