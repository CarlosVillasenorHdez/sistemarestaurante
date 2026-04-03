'use client';

import { useSysConfig } from './useSysConfig';

/**
 * Hook: returns a formatter function for monetary values
 * that uses the tenant's configured currency symbol and locale.
 *
 * Usage:
 *   const { fmt, symbol } = useCurrency();
 *   fmt(1234.5)  →  "$1,234.50"  (MXN) or "€1.234,50" (EUR)
 */
export function useCurrency() {
  const { currencySymbol, currencyLocale, currencyCode } = useSysConfig();

  function fmt(value: number, opts?: { decimals?: number; showSymbol?: boolean }): string {
    const decimals = opts?.decimals ?? 2;
    const showSym = opts?.showSymbol ?? true;
    try {
      const formatted = new Intl.NumberFormat(currencyLocale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
      return showSym ? `${currencySymbol}${formatted}` : formatted;
    } catch {
      // Fallback if locale is invalid
      const f = value.toFixed(decimals);
      return showSym ? `${currencySymbol}${f}` : f;
    }
  }

  return {
    fmt,
    symbol: currencySymbol,
    locale: currencyLocale,
    code: currencyCode,
  };
}
