-- ─── FEATURE 1: DISH RECIPES (ingredients + quantities per dish) ─────────────

CREATE TABLE IF NOT EXISTS public.dish_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL REFERENCES public.dishes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC(10,4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(dish_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_dish_recipes_dish_id ON public.dish_recipes(dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_recipes_ingredient_id ON public.dish_recipes(ingredient_id);

ALTER TABLE public.dish_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_dish_recipes" ON public.dish_recipes;
CREATE POLICY "open_access_dish_recipes" ON public.dish_recipes FOR ALL TO public USING (true) WITH CHECK (true);

-- ─── FEATURE 2: UNIT EQUIVALENCES TABLE ──────────────────────────────────────
-- Allows entering bulk units (e.g. "bolsa de pan = 8 pares de pan")

CREATE TABLE IF NOT EXISTS public.unit_equivalences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  bulk_unit TEXT NOT NULL DEFAULT '',
  bulk_description TEXT NOT NULL DEFAULT '',
  sub_unit TEXT NOT NULL DEFAULT '',
  sub_unit_description TEXT NOT NULL DEFAULT '',
  conversion_factor NUMERIC(10,4) NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unit_equivalences_ingredient_id ON public.unit_equivalences(ingredient_id);

ALTER TABLE public.unit_equivalences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_unit_equivalences" ON public.unit_equivalences;
CREATE POLICY "open_access_unit_equivalences" ON public.unit_equivalences FOR ALL TO public USING (true) WITH CHECK (true);

-- ─── FEATURE 3: ROLE-BASED ACCESS CONTROL ────────────────────────────────────

DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'cajero', 'mesero', 'cocinero', 'ayudante_cocina', 'repartidor');

-- Store app-level role per employee (separate from display role)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS app_role public.app_role NOT NULL DEFAULT 'mesero',
ADD COLUMN IF NOT EXISTS pin TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

-- ─── FEATURE 4: SALARY FIELDS ────────────────────────────────────────────────

DROP TYPE IF EXISTS public.salary_frequency CASCADE;
CREATE TYPE public.salary_frequency AS ENUM ('mensual', 'quincenal', 'semanal');

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS salary NUMERIC(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS salary_frequency public.salary_frequency NOT NULL DEFAULT 'mensual';

-- ─── SEED: Map existing employee roles to app_roles ──────────────────────────

DO $$
BEGIN
  UPDATE public.employees SET app_role = 'admin' WHERE role = 'Administrador';
  UPDATE public.employees SET app_role = 'gerente' WHERE role = 'Gerente';
  UPDATE public.employees SET app_role = 'cajero' WHERE role = 'Cajero';
  UPDATE public.employees SET app_role = 'mesero' WHERE role = 'Mesero';
  UPDATE public.employees SET app_role = 'cocinero' WHERE role = 'Cocinero';
  UPDATE public.employees SET app_role = 'ayudante_cocina' WHERE role = 'Ayudante de Cocina';
  UPDATE public.employees SET app_role = 'repartidor' WHERE role = 'Repartidor';

  -- Seed salaries for existing employees
  UPDATE public.employees SET salary = 18000, salary_frequency = 'mensual' WHERE role = 'Administrador';
  UPDATE public.employees SET salary = 14000, salary_frequency = 'mensual' WHERE role = 'Gerente';
  UPDATE public.employees SET salary = 9000, salary_frequency = 'mensual' WHERE role = 'Cajero';
  UPDATE public.employees SET salary = 7500, salary_frequency = 'mensual' WHERE role = 'Mesero';
  UPDATE public.employees SET salary = 11000, salary_frequency = 'mensual' WHERE role = 'Cocinero';
  UPDATE public.employees SET salary = 7000, salary_frequency = 'mensual' WHERE role = 'Ayudante de Cocina';
  UPDATE public.employees SET salary = 7000, salary_frequency = 'mensual' WHERE role = 'Repartidor';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed failed: %', SQLERRM;
END $$;

-- ─── SEED: Sample unit equivalences ──────────────────────────────────────────

DO $$
DECLARE
  ing_tor UUID;
  ing_agu UUID;
  ing_cer UUID;
  ing_ref UUID;
BEGIN
  SELECT id INTO ing_tor FROM public.ingredients WHERE name = 'Tortillas de Maíz' LIMIT 1;
  SELECT id INTO ing_agu FROM public.ingredients WHERE name = 'Agua Mineral 600ml' LIMIT 1;
  SELECT id INTO ing_cer FROM public.ingredients WHERE name = 'Cerveza Clara' LIMIT 1;
  SELECT id INTO ing_ref FROM public.ingredients WHERE name = 'Refresco 355ml' LIMIT 1;

  IF ing_tor IS NOT NULL THEN
    INSERT INTO public.unit_equivalences (ingredient_id, bulk_unit, bulk_description, sub_unit, sub_unit_description, conversion_factor, notes)
    VALUES (ing_tor, 'kg', 'Kilogramo de tortillas', 'pz', 'Tortilla individual', 20, 'Aprox. 20 tortillas por kg')
    ON CONFLICT DO NOTHING;
  END IF;

  IF ing_agu IS NOT NULL THEN
    INSERT INTO public.unit_equivalences (ingredient_id, bulk_unit, bulk_description, sub_unit, sub_unit_description, conversion_factor, notes)
    VALUES (ing_agu, 'caja', 'Caja de agua mineral', 'pz', 'Botella individual 600ml', 24, '24 botellas por caja')
    ON CONFLICT DO NOTHING;
  END IF;

  IF ing_cer IS NOT NULL THEN
    INSERT INTO public.unit_equivalences (ingredient_id, bulk_unit, bulk_description, sub_unit, sub_unit_description, conversion_factor, notes)
    VALUES (ing_cer, 'caja', 'Caja de cerveza', 'pz', 'Botella individual', 24, '24 botellas por caja')
    ON CONFLICT DO NOTHING;
  END IF;

  IF ing_ref IS NOT NULL THEN
    INSERT INTO public.unit_equivalences (ingredient_id, bulk_unit, bulk_description, sub_unit, sub_unit_description, conversion_factor, notes)
    VALUES (ing_ref, 'caja', 'Caja de refresco', 'pz', 'Lata individual 355ml', 24, '24 latas por caja')
    ON CONFLICT DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Equivalences seed failed: %', SQLERRM;
END $$;
