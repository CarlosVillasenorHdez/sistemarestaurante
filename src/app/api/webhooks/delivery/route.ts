import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const platform = req.nextUrl.searchParams.get('platform') || 'manual';

    // Normalize payload from different platforms
    let orderData: any = {
      platform,
      external_id: '',
      customer_name: 'Cliente Delivery',
      customer_address: '',
      customer_phone: '',
      items: [],
      subtotal: 0,
      delivery_fee: 0,
      total: 0,
      notes: '',
      status: 'recibido',
      received_at: new Date().toISOString(),
    };

    if (platform === 'uber_eats') {
      orderData.external_id = body.id || body.order_id || '';
      orderData.customer_name = body.eater?.first_name
        ? `${body.eater.first_name} ${body.eater.last_name || ''}`.trim()
        : 'Cliente Uber Eats';
      orderData.customer_address = body.delivery?.location?.address || '';
      orderData.customer_phone = body.eater?.phone_number || '';
      orderData.items = (body.cart?.items || []).map((item: any) => ({
        name: item.title || item.name,
        qty: item.quantity || 1,
        price: (item.price?.unit_price?.amount || 0) / 100,
      }));
      orderData.subtotal = (body.payment?.subtotal?.amount || 0) / 100;
      orderData.delivery_fee = (body.payment?.delivery_fee?.amount || 0) / 100;
      orderData.total = (body.payment?.total?.amount || 0) / 100;
      orderData.notes = body.special_instructions || '';
    } else if (platform === 'rappi') {
      orderData.external_id = body.id || body.order?.id || '';
      orderData.customer_name = body.user?.name || body.order?.user?.name || 'Cliente Rappi';
      orderData.customer_address = body.order?.address?.address || '';
      orderData.customer_phone = body.user?.phone || '';
      orderData.items = (body.order?.products || body.products || []).map((item: any) => ({
        name: item.name,
        qty: item.units || item.quantity || 1,
        price: Number(item.price) || 0,
      }));
      orderData.subtotal = Number(body.order?.total_products || body.total_products || 0);
      orderData.delivery_fee = Number(body.order?.delivery_cost || 0);
      orderData.total = Number(body.order?.total || body.total || 0);
      orderData.notes = body.order?.comments || '';
    }

    if (orderData.subtotal === 0 && orderData.items.length > 0) {
      orderData.subtotal = orderData.items.reduce((s: number, i: any) => s + i.qty * i.price, 0);
    }
    if (orderData.total === 0) {
      orderData.total = orderData.subtotal + orderData.delivery_fee;
    }

    const { error } = await supabase.from('delivery_orders').insert(orderData);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Pedido recibido' }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook delivery error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint activo', platforms: ['uber_eats', 'rappi', 'didi_food'] });
}
