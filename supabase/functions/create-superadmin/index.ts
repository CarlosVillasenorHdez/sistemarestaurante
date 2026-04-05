import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-superadmin-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Security: shared secret ───────────────────────────────────────────────
  const secret = req.headers.get('x-superadmin-secret');
  const expectedSecret = Deno.env.get('SUPERADMIN_SECRET');

  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email, password, nombre } = await req.json();

    if (!email || !password || !nombre) {
      return new Response(JSON.stringify({ error: 'email, password y nombre son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 1: Create in Supabase Auth ──────────────────────────────────────
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: authError?.message ?? 'Error al crear usuario de Auth' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 2: Insert in app_users with superadmin role ─────────────────────
    const { error: userError } = await supabaseAdmin.from('app_users').insert({
      auth_user_id: authData.user.id,
      username:     email.split('@')[0] + '-superadmin',
      full_name:    nombre,
      app_role:     'superadmin',
      tenant_id:    null,   // superadmin has no tenant
      is_active:    true,
      pin:          '',     // no PIN — uses Supabase Auth
    });

    if (userError) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: 'Error al crear perfil: ' + userError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      userId: authData.user.id,
      email,
      message: `Superadmin "${nombre}" creado exitosamente. Accede en /admin/login.`,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
