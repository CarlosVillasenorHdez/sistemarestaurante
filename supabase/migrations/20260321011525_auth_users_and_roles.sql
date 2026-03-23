-- ─── App Users Table ─────────────────────────────────────────────────────────
-- Stores application user profiles linked to Supabase auth.auth.users
-- Roles mirror the existing app_role enum from employees table.

CREATE TABLE IF NOT EXISTS public.app_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username      text UNIQUE NOT NULL,
  full_name     text NOT NULL DEFAULT '',
  app_role      app_role NOT NULL DEFAULT 'mesero',
  employee_id   uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at    timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- ─── Function: get current user role (SECURITY DEFINER avoids RLS recursion) ──
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_role FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- ─── RLS Policies (use function to avoid recursion) ──────────────────────────

-- Anyone authenticated can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.app_users FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Admins can read all users (uses function, not subquery on same table)
CREATE POLICY "Admins can read all users"
  ON public.app_users FOR SELECT
  USING (public.get_current_user_role() = 'admin');

-- Admins can insert users
CREATE POLICY "Admins can insert users"
  ON public.app_users FOR INSERT
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Admins can update users
CREATE POLICY "Admins can update users"
  ON public.app_users FOR UPDATE
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Admins can delete users
CREATE POLICY "Admins can delete users"
  ON public.app_users FOR DELETE
  USING (public.get_current_user_role() = 'admin');

-- ─── Seed: Create default admin user in auth ─────────────────────────────────
-- Default password for ALL users is "12345"
-- The admin username is "admin", email is admin@sistemarest.local

DO $$
DECLARE
  v_admin_auth_id uuid;
BEGIN
  -- Check if admin already exists in auth.users
  SELECT id INTO v_admin_auth_id
  FROM auth.users
  WHERE email = 'admin@sistemarest.local'
  LIMIT 1;

  IF v_admin_auth_id IS NULL THEN
    -- Insert admin into auth.users with bcrypt hash of "12345"
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'admin@sistemarest.local',
      crypt('12345', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Administrador"}',
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_admin_auth_id;
  END IF;

  -- Insert into app_users if not already there
  INSERT INTO public.app_users (auth_user_id, username, full_name, app_role)
  VALUES (v_admin_auth_id, 'admin', 'Administrador', 'admin')
  ON CONFLICT (auth_user_id) DO NOTHING;

END $$;
