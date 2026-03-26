-- ============================================================
-- NEW MODULES MIGRATION
-- branches, reservations, delivery_orders, loyalty_program
-- ============================================================

-- ─── BRANCHES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  manager_name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'branches_auth') THEN
    CREATE POLICY branches_auth ON public.branches FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Insert default branch if none exists
INSERT INTO public.branches (name, address, phone, email, manager_name)
SELECT 'Sucursal Centro', 'Calle Principal #1', '555-0001', 'centro@restaurante.com', 'Administrador'
WHERE NOT EXISTS (SELECT 1 FROM public.branches LIMIT 1);

-- ─── RESERVATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name text NOT NULL,
  guest_phone text NOT NULL DEFAULT '',
  guest_email text NOT NULL DEFAULT '',
  party_size integer NOT NULL DEFAULT 2,
  reservation_date date NOT NULL,
  reservation_time text NOT NULL,
  table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada', 'pendiente', 'cancelada', 'completada', 'lista_espera')),
  notes text DEFAULT '',
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  confirmation_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservations' AND policyname = 'reservations_auth') THEN
    CREATE POLICY reservations_auth ON public.reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── DELIVERY ORDERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT 'uber_eats' CHECK (platform IN ('uber_eats', 'rappi', 'didi_food', 'manual')),
  customer_name text NOT NULL DEFAULT '',
  customer_address text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'recibido' CHECK (status IN ('recibido', 'preparacion', 'listo', 'en_camino', 'entregado', 'cancelado')),
  notes text DEFAULT '',
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_orders' AND policyname = 'delivery_orders_auth') THEN
    CREATE POLICY delivery_orders_auth ON public.delivery_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── LOYALTY PROGRAM ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  points integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  total_visits integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.loyalty_customers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_customers' AND policyname = 'loyalty_customers_auth') THEN
    CREATE POLICY loyalty_customers_auth ON public.loyalty_customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.loyalty_customers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'acumulacion' CHECK (type IN ('acumulacion', 'canje')),
  points integer NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  order_id text DEFAULT '',
  notes text DEFAULT '',
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_transactions' AND policyname = 'loyalty_transactions_auth') THEN
    CREATE POLICY loyalty_transactions_auth ON public.loyalty_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── DEMO REQUESTS (Landing Page) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  plan text NOT NULL DEFAULT 'profesional',
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'contactado', 'demo_agendada', 'cerrado')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'demo_requests' AND policyname = 'demo_requests_public_insert') THEN
    CREATE POLICY demo_requests_public_insert ON public.demo_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'demo_requests' AND policyname = 'demo_requests_auth_select') THEN
    CREATE POLICY demo_requests_auth_select ON public.demo_requests FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ─── ONBOARDING PROGRESS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_steps jsonb NOT NULL DEFAULT '[]',
  current_step integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'onboarding_progress' AND policyname = 'onboarding_progress_auth') THEN
    CREATE POLICY onboarding_progress_auth ON public.onboarding_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
