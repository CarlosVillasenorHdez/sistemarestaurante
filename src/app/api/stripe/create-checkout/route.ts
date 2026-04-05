import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_PRICES, type StripePlanKey } from '@/lib/stripe';

/**
 * POST /api/stripe/create-checkout
 * Stripe initialized lazily inside handler — no build-time crash.
 */
export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
  });

  try {
    const { tenantId, plan } = await req.json() as { tenantId: string; plan: string };
    if (!tenantId || !plan) return NextResponse.json({ error: 'tenantId y plan requeridos' }, { status: 400 });

    const priceConfig = STRIPE_PRICES[plan as StripePlanKey];
    if (!priceConfig) return NextResponse.json({ error: `Plan inválido: ${plan}` }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: priceConfig.currency,
          product_data: { name: `Aldente Plan ${plan}` },
          recurring: { interval: priceConfig.interval },
          unit_amount: priceConfig.amount,
        },
        quantity: 1,
      }],
      subscription_data: { metadata: { tenant_id: tenantId, plan } },
      success_url: `${baseUrl}/dashboard?checkout=success&plan=${plan}`,
      cancel_url: `${baseUrl}/dashboard?checkout=cancelled`,
    });

    if (!session.url) return NextResponse.json({ error: 'No se pudo crear la sesión' }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
