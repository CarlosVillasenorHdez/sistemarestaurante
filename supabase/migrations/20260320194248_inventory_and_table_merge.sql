-- ─── INVENTORY ENHANCEMENTS ──────────────────────────────────────────────────

-- Add reorder_point and supplier_url to ingredients
ALTER TABLE public.ingredients
ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(10,3) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier_url TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS supplier_phone TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

-- Stock movement history table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL DEFAULT 'entrada', -- 'entrada' | 'salida' | 'ajuste'
  quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
  previous_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
  new_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'Sistema',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient_id ON public.stock_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_access_stock_movements" ON public.stock_movements;
CREATE POLICY "open_access_stock_movements" ON public.stock_movements FOR ALL TO public USING (true) WITH CHECK (true);

-- ─── TABLE MERGE ─────────────────────────────────────────────────────────────

-- Add merge_group_id to restaurant_tables so merged tables share the same group
ALTER TABLE public.restaurant_tables
ADD COLUMN IF NOT EXISTS merge_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_merge_group ON public.restaurant_tables(merge_group_id);

-- ─── MOCK STOCK MOVEMENTS ────────────────────────────────────────────────────

DO $$
DECLARE
  ing_res UUID;
  ing_pol UUID;
  ing_agu UUID;
  ing_jit UUID;
  ing_tor UUID;
  ing_fri UUID;
BEGIN
  SELECT id INTO ing_res FROM public.ingredients WHERE name = 'Carne de Res' LIMIT 1;
  SELECT id INTO ing_pol FROM public.ingredients WHERE name = 'Pollo Entero' LIMIT 1;
  SELECT id INTO ing_agu FROM public.ingredients WHERE name = 'Aguacate' LIMIT 1;
  SELECT id INTO ing_jit FROM public.ingredients WHERE name = 'Jitomate' LIMIT 1;
  SELECT id INTO ing_tor FROM public.ingredients WHERE name = 'Tortillas de Maíz' LIMIT 1;
  SELECT id INTO ing_fri FROM public.ingredients WHERE name = 'Frijol Negro' LIMIT 1;

  -- Update ingredients with reorder_point and supplier info
  UPDATE public.ingredients SET reorder_point = 12, supplier_url = 'https://carniceriaeltoro.mx', supplier_phone = '55 1111 2222' WHERE name = 'Carne de Res';
  UPDATE public.ingredients SET reorder_point = 10, supplier_url = '', supplier_phone = '55 3333 4444' WHERE name = 'Pollo Entero';
  UPDATE public.ingredients SET reorder_point = 6, supplier_url = '', supplier_phone = '55 5555 6666' WHERE name = 'Chorizo';
  UPDATE public.ingredients SET reorder_point = 25, supplier_url = '', supplier_phone = '55 7777 8888' WHERE name = 'Aguacate';
  UPDATE public.ingredients SET reorder_point = 8, supplier_url = '', supplier_phone = '55 7777 8888' WHERE name = 'Jitomate';
  UPDATE public.ingredients SET reorder_point = 6, supplier_url = '', supplier_phone = '55 7777 8888' WHERE name = 'Cebolla Blanca';
  UPDATE public.ingredients SET reorder_point = 4, supplier_url = '', supplier_phone = '55 7777 8888' WHERE name = 'Chile Serrano';
  UPDATE public.ingredients SET reorder_point = 3, supplier_url = '', supplier_phone = '55 7777 8888' WHERE name = 'Cilantro';
  UPDATE public.ingredients SET reorder_point = 5, supplier_url = '', supplier_phone = '55 9999 0000' WHERE name = 'Queso Oaxaca';
  UPDATE public.ingredients SET reorder_point = 6, supplier_url = '', supplier_phone = '55 9999 0000' WHERE name = 'Crema Ácida';
  UPDATE public.ingredients SET reorder_point = 12, supplier_url = '', supplier_phone = '55 9999 0000' WHERE name = 'Leche Entera';
  UPDATE public.ingredients SET reorder_point = 30, supplier_url = '', supplier_phone = '55 1212 3434' WHERE name = 'Agua Mineral 600ml';
  UPDATE public.ingredients SET reorder_point = 30, supplier_url = '', supplier_phone = '55 1212 3434' WHERE name = 'Refresco 355ml';
  UPDATE public.ingredients SET reorder_point = 30, supplier_url = '', supplier_phone = '55 1212 3434' WHERE name = 'Cerveza Clara';
  UPDATE public.ingredients SET reorder_point = 10, supplier_url = '', supplier_phone = '55 5656 7878' WHERE name = 'Tortillas de Maíz';
  UPDATE public.ingredients SET reorder_point = 4, supplier_url = '', supplier_phone = '55 9090 1212' WHERE name = 'Aceite Vegetal';
  UPDATE public.ingredients SET reorder_point = 6, supplier_url = '', supplier_phone = '55 9090 1212' WHERE name = 'Arroz Blanco';
  UPDATE public.ingredients SET reorder_point = 6, supplier_url = '', supplier_phone = '55 9090 1212' WHERE name = 'Frijol Negro';
  UPDATE public.ingredients SET reorder_point = 0.5, supplier_url = '', supplier_phone = '55 3434 5656' WHERE name = 'Comino Molido';
  UPDATE public.ingredients SET reorder_point = 0.6, supplier_url = '', supplier_phone = '55 3434 5656' WHERE name = 'Chile Ancho Seco';

  -- Insert sample stock movements
  IF ing_res IS NOT NULL THEN
    INSERT INTO public.stock_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, reason, created_by, created_at) VALUES
      (ing_res, 'entrada', 10, 0, 10, 'Compra semanal', 'Carlos Mendoza', NOW() - INTERVAL '7 days'),
      (ing_res, 'salida', 2, 10, 8, 'Uso en cocina - Tacos de Res', 'Ana Hernández', NOW() - INTERVAL '2 days')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF ing_pol IS NOT NULL THEN
    INSERT INTO public.stock_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, reason, created_by, created_at) VALUES
      (ing_pol, 'entrada', 20, 0, 20, 'Compra semanal', 'Carlos Mendoza', NOW() - INTERVAL '7 days'),
      (ing_pol, 'salida', 5, 20, 15, 'Uso en cocina - Mole Negro', 'Roberto Díaz', NOW() - INTERVAL '3 days')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF ing_agu IS NOT NULL THEN
    INSERT INTO public.stock_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, reason, created_by, created_at) VALUES
      (ing_agu, 'entrada', 30, 0, 30, 'Compra en mercado', 'Sofía Ramírez', NOW() - INTERVAL '5 days'),
      (ing_agu, 'salida', 5, 30, 25, 'Uso en cocina - Guacamole', 'Ana Hernández', NOW() - INTERVAL '1 day')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF ing_jit IS NOT NULL THEN
    INSERT INTO public.stock_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, reason, created_by, created_at) VALUES
      (ing_jit, 'entrada', 8, 0, 8, 'Compra en mercado', 'Sofía Ramírez', NOW() - INTERVAL '5 days'),
      (ing_jit, 'salida', 4, 8, 4, 'Uso en cocina', 'Roberto Díaz', NOW() - INTERVAL '2 days')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF ing_tor IS NOT NULL THEN
    INSERT INTO public.stock_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, reason, created_by, created_at) VALUES
      (ing_tor, 'entrada', 10, 0, 10, 'Compra en tortillería', 'Carlos Mendoza', NOW() - INTERVAL '4 days'),
      (ing_tor, 'salida', 5, 10, 5, 'Uso en cocina - Tacos', 'Ana Hernández', NOW() - INTERVAL '1 day')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF ing_fri IS NOT NULL THEN
    INSERT INTO public.stock_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, reason, created_by, created_at) VALUES
      (ing_fri, 'entrada', 5, 0, 5, 'Compra semanal', 'Carlos Mendoza', NOW() - INTERVAL '6 days'),
      (ing_fri, 'salida', 3, 5, 2, 'Uso en cocina - Frijoles', 'Roberto Díaz', NOW() - INTERVAL '2 days')
    ON CONFLICT (id) DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
