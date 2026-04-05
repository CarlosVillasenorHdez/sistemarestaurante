import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events and updates tenant subscription status.
 *
 * Events handled:
 *   invoice.payment_succeeded  → extends plan_valid_until by 30 days
 *   invoice.payment_failed     → no-op (tenant stays active until expiry)
 *   customer.subscription.deleted → sets is_active = false
 *
 * Tenant is identified by metadata.tenant_id attached at checkout creation.
 *
 * Set STRIPE_WEBHOOK_SECRET to the signing secret from your Stripe webhook endpoint.
 * Test locally: stripe listen --forward-to localhost:3000/api/stripe/webhook
 */

// Supabase admin client (bypasses RLS)
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook signature failed';
    console.error('[stripe/webhook] signature failed:', msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = getAdminClient();

  try {
    switch (event.type) {

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as { subscription?: string | { metadata?: { tenant_id?: string }; id?: string } | null; metadata?: { tenant_id?: string } };
        // tenant_id is in subscription metadata
        let tenantId: string | undefined;

        if (typeof invoice.subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          tenantId = sub.metadata?.tenant_id;
        } else {
          tenantId = (invoice.metadata as Record<string, string> | undefined)?.tenant_id;
        }

        if (!tenantId) {
          console.warn('[stripe/webhook] payment_succeeded: no tenant_id in metadata');
          break;
        }

        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);

        await supabase
          .from('tenants')
          .update({ plan_valid_until: validUntil.toISOString(), is_active: true, updated_at: new Date().toISOString() })
          .eq('id', tenantId);

        console.log(`[stripe/webhook] tenant ${tenantId} extended until ${validUntil.toISOString()}`);
        break;
      }

      case 'invoice.payment_failed': {
        // No action — tenant stays active until plan_valid_until passes naturally.
        // SubscriptionWall handles showing the expired state.
        console.log('[stripe/webhook] payment_failed — no action, will expire naturally');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as { metadata?: { tenant_id?: string } };
        const tenantId = subscription.metadata?.tenant_id;

        if (!tenantId) {
          console.warn('[stripe/webhook] subscription.deleted: no tenant_id');
          break;
        }

        await supabase
          .from('tenants')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', tenantId);

        console.log(`[stripe/webhook] tenant ${tenantId} deactivated`);
        break;
      }

      default:
        // Unhandled event — log and acknowledge
        console.log(`[stripe/webhook] unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('[stripe/webhook] handler error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
