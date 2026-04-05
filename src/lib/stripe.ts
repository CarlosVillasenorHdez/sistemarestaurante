/**
 * src/lib/stripe.ts — precios y tipos de planes Stripe
 * El cliente de Stripe se inicializa lazy dentro de cada route handler,
 * no aquí, para evitar errores de build cuando STRIPE_SECRET_KEY no está disponible.
 */
export const STRIPE_PRICES = {
  basico:   { amount: 80000,  currency: 'mxn', interval: 'month' as const },
  estandar: { amount: 150000, currency: 'mxn', interval: 'month' as const },
  premium:  { amount: 250000, currency: 'mxn', interval: 'month' as const },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PRICES;
