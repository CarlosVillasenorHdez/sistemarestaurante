-- ─── Restaurant Layout Config ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.restaurant_layout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Planta Principal',
  width integer NOT NULL DEFAULT 12,
  height integer NOT NULL DEFAULT 8,
  tables_layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_layout ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_layout' AND policyname = 'restaurant_layout_all') THEN
    CREATE POLICY "restaurant_layout_all" ON public.restaurant_layout FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Insert default layout if empty
INSERT INTO public.restaurant_layout (name, width, height, tables_layout)
SELECT 'Planta Principal', 12, 8, '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.restaurant_layout LIMIT 1);

-- ─── Kitchen Orders (view over orders + order_items) ─────────────────────────
-- We use the existing orders table; just ensure status values include cocina states
-- Add a kitchen_status column to orders if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'kitchen_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN kitchen_status text NOT NULL DEFAULT 'pendiente';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'kitchen_notes'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN kitchen_notes text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'kitchen_started_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN kitchen_started_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'kitchen_completed_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN kitchen_completed_at timestamptz;
  END IF;
END $$;

-- ─── Create cocinero1 auth user ───────────────────────────────────────────────
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'cocinero1@sistemarest.local';
BEGIN
  -- Check if auth user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt('12345', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Carlos Cocinero"}'::jsonb,
      false,
      '', '', '', ''
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- Insert into app_users if not exists
  IF v_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.app_users WHERE username = 'cocinero1'
  ) THEN
    INSERT INTO public.app_users (auth_user_id, username, full_name, app_role, is_active)
    VALUES (v_user_id, 'cocinero1', 'Carlos Cocinero', 'cocinero', true);
  END IF;
END $$;

-- ─── Update role_permissions for cocinero to include cocina ──────────────────
INSERT INTO public.role_permissions (role, page_key, can_access)
VALUES
  ('cocinero', 'cocina', true),
  ('cocinero', 'orders', true),
  ('ayudante_cocina', 'cocina', true),
  ('ayudante_cocina', 'orders', true),
  ('mesero', 'pos', true),
  ('mesero', 'orders', true),
  ('mesero', 'cocina', false)
ON CONFLICT (role, page_key) DO UPDATE SET can_access = EXCLUDED.can_access;
