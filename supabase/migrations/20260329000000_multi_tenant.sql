-- =============================================================================
-- MULTI-TENANT ARCHITECTURE MIGRATION
-- Order: CREATE TABLE → INSERT → ALTER → UPDATE → CONSTRAINTS → FUNCTIONS →
--        TRIGGERS → POLICIES → INDEXES → VIEW → VERIFICATION
-- =============================================================================

-- =============================================================================
-- STEP 1: CREATE TENANTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'starter',
    is_active BOOLEAN NOT NULL DEFAULT true,
    owner_email TEXT,
    max_branches INTEGER NOT NULL DEFAULT 1,
    max_users INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_access_tenants" ON public.tenants;
CREATE POLICY "open_access_tenants"
    ON public.tenants
    FOR ALL
    USING (true);

-- =============================================================================
-- STEP 2: INSERT DEFAULT TENANT
-- =============================================================================
INSERT INTO public.tenants (id, name, slug, plan)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Restaurante Principal',
    'restaurante-principal',
    'starter'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 3: ALTER TABLE — ADD tenant_id TO ALL TABLES
-- =============================================================================

-- app_users
ALTER TABLE public.app_users
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- dishes
ALTER TABLE public.dishes
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- ingredients
ALTER TABLE public.ingredients
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- employees
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- restaurant_tables
ALTER TABLE public.restaurant_tables
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- orders
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- order_items
ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- stock_movements
ALTER TABLE public.stock_movements
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- dish_recipes
ALTER TABLE public.dish_recipes
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- gastos_recurrentes
ALTER TABLE public.gastos_recurrentes
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- gastos_pagos
ALTER TABLE public.gastos_pagos
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- depreciaciones
ALTER TABLE public.depreciaciones
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- loyalty_customers
ALTER TABLE public.loyalty_customers
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- loyalty_transactions
ALTER TABLE public.loyalty_transactions
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- reservations
ALTER TABLE public.reservations
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- delivery_orders
ALTER TABLE public.delivery_orders
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- branches
ALTER TABLE public.branches
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- system_config
ALTER TABLE public.system_config
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- rh_vacaciones
ALTER TABLE public.rh_vacaciones
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- rh_permisos
ALTER TABLE public.rh_permisos
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- rh_tiempos_extras
ALTER TABLE public.rh_tiempos_extras
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- employee_shifts
ALTER TABLE public.employee_shifts
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- restaurant_layout
ALTER TABLE public.restaurant_layout
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- unit_equivalences
ALTER TABLE public.unit_equivalences
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- =============================================================================
-- STEP 4: ADD branch_id TO SELECTED TABLES
-- =============================================================================

ALTER TABLE public.app_users
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.dishes
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.ingredients
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.restaurant_tables
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- =============================================================================
-- STEP 5: UPDATE EXISTING ROWS — SET tenant_id = default tenant WHERE NULL
-- =============================================================================

UPDATE public.app_users
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.dishes
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.ingredients
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.employees
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.restaurant_tables
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.orders
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.order_items
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.stock_movements
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.dish_recipes
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.gastos_recurrentes
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.gastos_pagos
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.depreciaciones
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.loyalty_customers
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.loyalty_transactions
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.reservations
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.delivery_orders
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.branches
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.system_config
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.rh_vacaciones
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.rh_permisos
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.rh_tiempos_extras
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.employee_shifts
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.restaurant_layout
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

UPDATE public.unit_equivalences
    SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE tenant_id IS NULL;

-- =============================================================================
-- STEP 6: DROP OLD UNIQUE CONSTRAINT ON system_config AND ADD NEW ONE
-- =============================================================================

ALTER TABLE public.system_config
    DROP CONSTRAINT IF EXISTS system_config_config_key_key;

DROP INDEX IF EXISTS idx_system_config_tenant_config_key;
CREATE UNIQUE INDEX idx_system_config_tenant_config_key
    ON public.system_config (tenant_id, config_key);

-- =============================================================================
-- STEP 7: CREATE FUNCTIONS
-- =============================================================================

-- Function: auth_tenant_id()
CREATE OR REPLACE FUNCTION public.auth_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (SELECT tenant_id FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1),
        '00000000-0000-0000-0000-000000000001'::uuid
    );
$$;

-- Function: auth_branch_id()
CREATE OR REPLACE FUNCTION public.auth_branch_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT branch_id FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Trigger function: set_tenant_id_on_insert()
CREATE OR REPLACE FUNCTION public.set_tenant_id_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := public.auth_tenant_id();
    END IF;
    RETURN NEW;
END;
$$;

-- Function: create_tenant()
CREATE OR REPLACE FUNCTION public.create_tenant(
    p_name TEXT,
    p_slug TEXT,
    p_plan TEXT DEFAULT 'starter',
    p_owner_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_tenant_id UUID;
    v_branch_id UUID;
BEGIN
    -- Insert new tenant
    INSERT INTO public.tenants (name, slug, plan, owner_email)
    VALUES (p_name, p_slug, p_plan, p_owner_email)
    RETURNING id INTO v_tenant_id;

    -- Create default branch for the tenant
    INSERT INTO public.branches (name, tenant_id, is_active)
    VALUES (p_name || ' - Principal', v_tenant_id, true)
    RETURNING id INTO v_branch_id;

    -- Seed system_config rows for the new tenant
    INSERT INTO public.system_config (tenant_id, config_key, config_value)
    VALUES
        (v_tenant_id, 'restaurant_name', p_name),
        (v_tenant_id, 'table_count', '10'),
        (v_tenant_id, 'iva_percent', '16'),
        (v_tenant_id, 'brand_theme', 'default'),
        (v_tenant_id, 'initialized', 'false')
    ON CONFLICT (tenant_id, config_key) DO NOTHING;

    RETURN v_tenant_id;
END;
$func$;

-- =============================================================================
-- STEP 8: CREATE TRIGGERS — apply set_tenant_id_on_insert to all tables
-- =============================================================================

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'app_users', 'dishes', 'ingredients', 'employees', 'restaurant_tables',
        'orders', 'order_items', 'stock_movements', 'dish_recipes',
        'gastos_recurrentes', 'gastos_pagos', 'depreciaciones',
        'loyalty_customers', 'loyalty_transactions', 'reservations',
        'delivery_orders', 'branches', 'system_config',
        'rh_vacaciones', 'rh_permisos', 'rh_tiempos_extras',
        'employee_shifts', 'restaurant_layout', 'unit_equivalences'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_set_tenant_id_%1$s ON public.%1$I;
             CREATE TRIGGER trg_set_tenant_id_%1$s
                 BEFORE INSERT ON public.%1$I
                 FOR EACH ROW
                 EXECUTE FUNCTION public.set_tenant_id_on_insert();',
            tbl
        );
    END LOOP;
END $$;

-- =============================================================================
-- STEP 9: REPLACE RLS POLICIES WITH tenant_isolation_ POLICIES
-- =============================================================================

-- app_users
DROP POLICY IF EXISTS "open_access" ON public.app_users;
DROP POLICY IF EXISTS "authenticated_access" ON public.app_users;
DROP POLICY IF EXISTS "allow_public_read_app_users" ON public.app_users;
DROP POLICY IF EXISTS "tenant_isolation_app_users" ON public.app_users;
CREATE POLICY "tenant_isolation_app_users"
    ON public.app_users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- dishes
DROP POLICY IF EXISTS "open_access" ON public.dishes;
DROP POLICY IF EXISTS "authenticated_access" ON public.dishes;
DROP POLICY IF EXISTS "tenant_isolation_dishes" ON public.dishes;
CREATE POLICY "tenant_isolation_dishes"
    ON public.dishes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ingredients
DROP POLICY IF EXISTS "open_access" ON public.ingredients;
DROP POLICY IF EXISTS "authenticated_access" ON public.ingredients;
DROP POLICY IF EXISTS "tenant_isolation_ingredients" ON public.ingredients;
CREATE POLICY "tenant_isolation_ingredients"
    ON public.ingredients
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- employees
DROP POLICY IF EXISTS "open_access" ON public.employees;
DROP POLICY IF EXISTS "authenticated_access" ON public.employees;
DROP POLICY IF EXISTS "tenant_isolation_employees" ON public.employees;
CREATE POLICY "tenant_isolation_employees"
    ON public.employees
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- restaurant_tables
DROP POLICY IF EXISTS "open_access" ON public.restaurant_tables;
DROP POLICY IF EXISTS "authenticated_access" ON public.restaurant_tables;
DROP POLICY IF EXISTS "tenant_isolation_restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "tenant_isolation_restaurant_tables"
    ON public.restaurant_tables
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- orders
DROP POLICY IF EXISTS "open_access" ON public.orders;
DROP POLICY IF EXISTS "authenticated_access" ON public.orders;
DROP POLICY IF EXISTS "tenant_isolation_orders" ON public.orders;
CREATE POLICY "tenant_isolation_orders"
    ON public.orders
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- order_items
DROP POLICY IF EXISTS "open_access" ON public.order_items;
DROP POLICY IF EXISTS "authenticated_access" ON public.order_items;
DROP POLICY IF EXISTS "tenant_isolation_order_items" ON public.order_items;
CREATE POLICY "tenant_isolation_order_items"
    ON public.order_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- stock_movements
DROP POLICY IF EXISTS "open_access" ON public.stock_movements;
DROP POLICY IF EXISTS "authenticated_access" ON public.stock_movements;
DROP POLICY IF EXISTS "tenant_isolation_stock_movements" ON public.stock_movements;
CREATE POLICY "tenant_isolation_stock_movements"
    ON public.stock_movements
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- dish_recipes
DROP POLICY IF EXISTS "open_access" ON public.dish_recipes;
DROP POLICY IF EXISTS "authenticated_access" ON public.dish_recipes;
DROP POLICY IF EXISTS "tenant_isolation_dish_recipes" ON public.dish_recipes;
CREATE POLICY "tenant_isolation_dish_recipes"
    ON public.dish_recipes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- gastos_recurrentes
DROP POLICY IF EXISTS "open_access" ON public.gastos_recurrentes;
DROP POLICY IF EXISTS "authenticated_access" ON public.gastos_recurrentes;
DROP POLICY IF EXISTS "tenant_isolation_gastos_recurrentes" ON public.gastos_recurrentes;
CREATE POLICY "tenant_isolation_gastos_recurrentes"
    ON public.gastos_recurrentes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- gastos_pagos
DROP POLICY IF EXISTS "open_access" ON public.gastos_pagos;
DROP POLICY IF EXISTS "authenticated_access" ON public.gastos_pagos;
DROP POLICY IF EXISTS "tenant_isolation_gastos_pagos" ON public.gastos_pagos;
CREATE POLICY "tenant_isolation_gastos_pagos"
    ON public.gastos_pagos
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- depreciaciones
DROP POLICY IF EXISTS "open_access" ON public.depreciaciones;
DROP POLICY IF EXISTS "authenticated_access" ON public.depreciaciones;
DROP POLICY IF EXISTS "tenant_isolation_depreciaciones" ON public.depreciaciones;
CREATE POLICY "tenant_isolation_depreciaciones"
    ON public.depreciaciones
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- loyalty_customers
DROP POLICY IF EXISTS "open_access" ON public.loyalty_customers;
DROP POLICY IF EXISTS "authenticated_access" ON public.loyalty_customers;
DROP POLICY IF EXISTS "tenant_isolation_loyalty_customers" ON public.loyalty_customers;
CREATE POLICY "tenant_isolation_loyalty_customers"
    ON public.loyalty_customers
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- loyalty_transactions
DROP POLICY IF EXISTS "open_access" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "authenticated_access" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "tenant_isolation_loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "tenant_isolation_loyalty_transactions"
    ON public.loyalty_transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- reservations
DROP POLICY IF EXISTS "open_access" ON public.reservations;
DROP POLICY IF EXISTS "authenticated_access" ON public.reservations;
DROP POLICY IF EXISTS "tenant_isolation_reservations" ON public.reservations;
CREATE POLICY "tenant_isolation_reservations"
    ON public.reservations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- delivery_orders
DROP POLICY IF EXISTS "open_access" ON public.delivery_orders;
DROP POLICY IF EXISTS "authenticated_access" ON public.delivery_orders;
DROP POLICY IF EXISTS "tenant_isolation_delivery_orders" ON public.delivery_orders;
CREATE POLICY "tenant_isolation_delivery_orders"
    ON public.delivery_orders
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- branches
DROP POLICY IF EXISTS "open_access" ON public.branches;
DROP POLICY IF EXISTS "authenticated_access" ON public.branches;
DROP POLICY IF EXISTS "tenant_isolation_branches" ON public.branches;
CREATE POLICY "tenant_isolation_branches"
    ON public.branches
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- system_config
DROP POLICY IF EXISTS "open_access" ON public.system_config;
DROP POLICY IF EXISTS "authenticated_access" ON public.system_config;
DROP POLICY IF EXISTS "tenant_isolation_system_config" ON public.system_config;
CREATE POLICY "tenant_isolation_system_config"
    ON public.system_config
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- rh_vacaciones
DROP POLICY IF EXISTS "open_access" ON public.rh_vacaciones;
DROP POLICY IF EXISTS "authenticated_access" ON public.rh_vacaciones;
DROP POLICY IF EXISTS "tenant_isolation_rh_vacaciones" ON public.rh_vacaciones;
CREATE POLICY "tenant_isolation_rh_vacaciones"
    ON public.rh_vacaciones
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- rh_permisos
DROP POLICY IF EXISTS "open_access" ON public.rh_permisos;
DROP POLICY IF EXISTS "authenticated_access" ON public.rh_permisos;
DROP POLICY IF EXISTS "tenant_isolation_rh_permisos" ON public.rh_permisos;
CREATE POLICY "tenant_isolation_rh_permisos"
    ON public.rh_permisos
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- rh_tiempos_extras
DROP POLICY IF EXISTS "open_access" ON public.rh_tiempos_extras;
DROP POLICY IF EXISTS "authenticated_access" ON public.rh_tiempos_extras;
DROP POLICY IF EXISTS "tenant_isolation_rh_tiempos_extras" ON public.rh_tiempos_extras;
CREATE POLICY "tenant_isolation_rh_tiempos_extras"
    ON public.rh_tiempos_extras
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- employee_shifts
DROP POLICY IF EXISTS "open_access" ON public.employee_shifts;
DROP POLICY IF EXISTS "authenticated_access" ON public.employee_shifts;
DROP POLICY IF EXISTS "tenant_isolation_employee_shifts" ON public.employee_shifts;
CREATE POLICY "tenant_isolation_employee_shifts"
    ON public.employee_shifts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- restaurant_layout
DROP POLICY IF EXISTS "open_access" ON public.restaurant_layout;
DROP POLICY IF EXISTS "authenticated_access" ON public.restaurant_layout;
DROP POLICY IF EXISTS "tenant_isolation_restaurant_layout" ON public.restaurant_layout;
CREATE POLICY "tenant_isolation_restaurant_layout"
    ON public.restaurant_layout
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- unit_equivalences
DROP POLICY IF EXISTS "open_access" ON public.unit_equivalences;
DROP POLICY IF EXISTS "authenticated_access" ON public.unit_equivalences;
DROP POLICY IF EXISTS "tenant_isolation_unit_equivalences" ON public.unit_equivalences;
CREATE POLICY "tenant_isolation_unit_equivalences"
    ON public.unit_equivalences
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- STEP 10: CREATE INDEXES ON tenant_id FOR ALL TABLES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_app_users_tenant ON public.app_users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_dishes_tenant ON public.dishes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_tenant ON public.ingredients (tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees (tenant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_tenant ON public.restaurant_tables (tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON public.orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant ON public.order_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant ON public.stock_movements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_dish_recipes_tenant ON public.dish_recipes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_gastos_recurrentes_tenant ON public.gastos_recurrentes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_gastos_pagos_tenant ON public.gastos_pagos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_depreciaciones_tenant ON public.depreciaciones (tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_tenant ON public.loyalty_customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_tenant ON public.loyalty_transactions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON public.reservations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_tenant ON public.delivery_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON public.branches (tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_config_tenant ON public.system_config (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_vacaciones_tenant ON public.rh_vacaciones (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_permisos_tenant ON public.rh_permisos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_tiempos_extras_tenant ON public.rh_tiempos_extras (tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_tenant ON public.employee_shifts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_layout_tenant ON public.restaurant_layout (tenant_id);
CREATE INDEX IF NOT EXISTS idx_unit_equivalences_tenant ON public.unit_equivalences (tenant_id);

-- =============================================================================
-- STEP 11: CREATE VIEW v_orders_by_branch
-- =============================================================================

CREATE OR REPLACE VIEW public.v_orders_by_branch AS
SELECT
    o.id AS order_id,
    o.tenant_id,
    b.id AS branch_id,
    b.name AS branch_name,
    o.status,
    o.total,
    o.created_at,
    o.updated_at
FROM public.orders o
LEFT JOIN public.branches b
    ON b.name = o.branch
    AND b.tenant_id = o.tenant_id;

-- =============================================================================
-- STEP 12: VERIFICATION SELECT
-- =============================================================================

SELECT
    (SELECT COUNT(*) FROM public.tenants)                                           AS tenant_count,
    (SELECT COUNT(*) FROM public.dishes WHERE tenant_id IS NOT NULL)                AS dishes_with_tenant_id,
    (SELECT COUNT(*) FROM public.orders WHERE tenant_id IS NOT NULL)                AS orders_with_tenant_id,
    (SELECT COUNT(*) FROM information_schema.triggers
     WHERE trigger_schema = 'public'
       AND trigger_name LIKE 'trg_set_tenant_id_%')                                 AS triggers_created;
