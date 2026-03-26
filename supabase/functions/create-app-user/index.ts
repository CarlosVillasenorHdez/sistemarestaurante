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
    // Use Service Role Key to create users with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the caller is an authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check caller is admin or gerente
    const { data: callerAppUser } = await supabaseAdmin
      .from('app_users')
      .select('app_role')
      .eq('auth_user_id', callerUser.id)
      .single();

    if (!callerAppUser || !['admin', 'gerente'].includes(callerAppUser.app_role)) {
      return new Response(JSON.stringify({ error: 'Sin permisos para crear usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { username, password, fullName, role, employeeId } = await req.json();

    if (!username || !password || !fullName || !role) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = `${username.trim().toLowerCase()}@sistemarest.local`;

    // Create auth user with admin API (Service Role Key)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!newUser.user) {
      return new Response(JSON.stringify({ error: 'No se pudo crear el usuario' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert into app_users table
    const { error: insertError } = await supabaseAdmin.from('app_users').insert({
      auth_user_id: newUser.user.id,
      username: username.trim().toLowerCase(),
      full_name: fullName,
      app_role: role,
      employee_id: employeeId || null,
    });

    if (insertError) {
      // Rollback: delete the auth user if app_users insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
