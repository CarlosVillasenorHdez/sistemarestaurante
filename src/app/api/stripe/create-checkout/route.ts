import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICES, type StripePlanKey } from '@/lib/stripe';

/**
 * POST /api/stripe/create-checkout
 *
 * Creates a Stripe Checkout Session for a tenant subscription upgrade.
 *
 * Body: { tenantId: string, plan: 'basico' | 'estandar' | 'premium' }
 * Returns: { url: string } — redirect the user to this URL
 *
 * The tenant_id is stored in Stripe subscription metadata so the webhook
 * can identify which tenant to update on payment events.
 *
 * Usage from the ERP (when you add an upgrade button):
 *   const { url } = await fetch('/api/stripe/create-checkout', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ tenantId, plan }),
 *   }).then(r => r.json());
 *   window.location.href = url;
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, plan } = body as { tenantId: string; plan: string };

    if (!tenantId || !plan) {
      return NextResponse.json({ error: 'tenantId y plan son requeridos' }, { status: 400 });
    }

    const priceConfig = STRIPE_PRICES[plan as StripePlanKey];
    if (!priceConfig) {
      return NextResponse.json({ error: `Plan inválido: ${plan}` }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: priceConfig.currency,
            product_data: {
              name: `Aldente Plan — ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
              description: `Suscripción mensual al plan ${plan} de Aldente`,
            },
            recurring: { interval: priceConfig.interval },
            unit_amount: priceConfig.amount,
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          tenant_id: tenantId,
          plan,
        },
      },
      success_url: `${baseUrl}/dashboard?checkout=success&plan=${plan}`,
      cancel_url:  `${baseUrl}/dashboard?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'No se pudo crear la sesión de pago' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno de Stripe';
    console.error('[stripe/create-checkout]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
