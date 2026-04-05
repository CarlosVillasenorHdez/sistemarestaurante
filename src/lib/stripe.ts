/**
 * src/lib/stripe.ts
 *
 * Stripe initialization — keys from environment variables.
 * Set these in .env.local (development) and in your deployment platform (production).
 *
 * STRIPE_SECRET_KEY              → get from dashboard.stripe.com/apikeys
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → get from dashboard.stripe.com/apikeys
 * STRIPE_WEBHOOK_SECRET          → get from dashboard.stripe.com/webhooks after creating endpoint
 */
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Precios en centavos MXN (Stripe usa la unidad mínima de la moneda)
// $800 MXN = 80000 centavos
export const STRIPE_PRICES = {
  basico:   { amount: 80000,  currency: 'mxn', interval: 'month' as const },
  estandar: { amount: 150000, currency: 'mxn', interval: 'month' as const },
  premium:  { amount: 250000, currency: 'mxn', interval: 'month' as const },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PRICES;
