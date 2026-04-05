import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { restaurantName, slug, adminName, phone, pinHash } = await req.json();

    if (!restaurantName || !slug || !adminName || !pinHash) {
      return new Response(JSON.stringify({ error: 'Campos requeridos faltantes' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 1: Create tenant ─────────────────────────────────────────────────
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: restaurantName,
        slug,
        plan: 'basico',
        is_active: true,
        trial_ends_at: trialEnd.toISOString(),
      })
      .select('id')
      .single();

    if (tenantError || !tenant) {
      const isDuplicate = tenantError?.message?.includes('unique');
      return new Response(JSON.stringify({
        error: isDuplicate
          ? 'Ya existe un restaurante con ese nombre. Elige otro.'
          : 'Error al crear el restaurante: ' + tenantError?.message,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const tenantId = tenant.id;

    // ── Step 2: Create app_user (admin) ──────────────────────────────────────
    const username = slug + '-admin';

    const { error: userError } = await supabaseAdmin
      .from('app_users')
      .insert({
        username,
        full_name: adminName,
        app_role: 'admin',
        pin: pinHash,
        tenant_id: tenantId,
        is_active: true,
        ...(phone ? { phone } : {}),
      });

    if (userError) {
      // Rollback: delete tenant
      await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
      return new Response(JSON.stringify({ error: 'Error al crear usuario: ' + userError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 3: Seed system_config with basico features ───────────────────────
    const basicoFeatures = [
      { config_key: 'feature_mesero_movil',   config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_lealtad',        config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_reservaciones',  config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_delivery',       config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_inventario',     config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_gastos',         config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_recursos_humanos', config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_reportes',       config_value: 'false', tenant_id: tenantId },
      { config_key: 'feature_alarmas',        config_value: 'false', tenant_id: tenantId },
      { config_key: 'iva_percent',            config_value: '16', tenant_id: tenantId },
      { config_key: 'currency_symbol',        config_value: '$', tenant_id: tenantId },
      { config_key: 'currency_code',          config_value: 'MXN', tenant_id: tenantId },
      { config_key: 'currency_locale',        config_value: 'es-MX', tenant_id: tenantId },
    ];

    // Insert system_config — ignore errors (non-critical)
    await supabaseAdmin.from('system_config').insert(basicoFeatures);

    return new Response(JSON.stringify({ ok: true, tenantId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
