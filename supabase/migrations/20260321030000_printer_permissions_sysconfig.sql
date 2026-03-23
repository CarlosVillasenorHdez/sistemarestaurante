-- ─── Printer Configuration ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.printer_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Impresora Principal',
  connection_type TEXT NOT NULL DEFAULT 'network', -- 'network' | 'usb' | 'bluetooth'
  ip_address TEXT,
  port INTEGER DEFAULT 9100,
  usb_path TEXT,
  bluetooth_address TEXT,
  paper_width INTEGER DEFAULT 80, -- mm: 58 or 80
  print_copies INTEGER DEFAULT 1,
  auto_cut BOOLEAN DEFAULT true,
  print_logo BOOLEAN DEFAULT true,
  print_footer BOOLEAN DEFAULT true,
  footer_text TEXT DEFAULT 'Gracias por su visita',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.printer_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_printer_config" ON public.printer_config;
CREATE POLICY "authenticated_manage_printer_config"
  ON public.printer_config FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Insert default printer config if none exists
INSERT INTO public.printer_config (name, connection_type, ip_address, port, paper_width)
SELECT 'Impresora Principal', 'network', '192.168.1.100', 9100, 80
WHERE NOT EXISTS (SELECT 1 FROM public.printer_config);

-- ─── Role Page Permissions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  page_key TEXT NOT NULL,
  can_access BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_role_page
  ON public.role_permissions (role, page_key);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_role_permissions" ON public.role_permissions;
CREATE POLICY "authenticated_manage_role_permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Seed default permissions per role
INSERT INTO public.role_permissions (role, page_key, can_access) VALUES
  -- admin: all pages
  ('admin', 'dashboard', true),
  ('admin', 'pos', true),
  ('admin', 'orders', true),
  ('admin', 'menu', true),
  ('admin', 'inventario', true),
  ('admin', 'personal', true),
  ('admin', 'gastos', true),
  ('admin', 'reportes', true),
  ('admin', 'configuracion', true),
  -- gerente
  ('gerente', 'dashboard', true),
  ('gerente', 'pos', true),
  ('gerente', 'orders', true),
  ('gerente', 'menu', true),
  ('gerente', 'inventario', true),
  ('gerente', 'personal', true),
  ('gerente', 'gastos', true),
  ('gerente', 'reportes', true),
  ('gerente', 'configuracion', false),
  -- cajero
  ('cajero', 'dashboard', false),
  ('cajero', 'pos', true),
  ('cajero', 'orders', true),
  ('cajero', 'menu', false),
  ('cajero', 'inventario', false),
  ('cajero', 'personal', false),
  ('cajero', 'gastos', false),
  ('cajero', 'reportes', false),
  ('cajero', 'configuracion', false),
  -- mesero
  ('mesero', 'dashboard', false),
  ('mesero', 'pos', true),
  ('mesero', 'orders', true),
  ('mesero', 'menu', false),
  ('mesero', 'inventario', false),
  ('mesero', 'personal', false),
  ('mesero', 'gastos', false),
  ('mesero', 'reportes', false),
  ('mesero', 'configuracion', false),
  -- cocinero
  ('cocinero', 'dashboard', false),
  ('cocinero', 'pos', false),
  ('cocinero', 'orders', true),
  ('cocinero', 'menu', false),
  ('cocinero', 'inventario', true),
  ('cocinero', 'personal', false),
  ('cocinero', 'gastos', false),
  ('cocinero', 'reportes', false),
  ('cocinero', 'configuracion', false),
  -- ayudante_cocina
  ('ayudante_cocina', 'dashboard', false),
  ('ayudante_cocina', 'pos', false),
  ('ayudante_cocina', 'orders', true),
  ('ayudante_cocina', 'menu', false),
  ('ayudante_cocina', 'inventario', false),
  ('ayudante_cocina', 'personal', false),
  ('ayudante_cocina', 'gastos', false),
  ('ayudante_cocina', 'reportes', false),
  ('ayudante_cocina', 'configuracion', false),
  -- repartidor
  ('repartidor', 'dashboard', false),
  ('repartidor', 'pos', false),
  ('repartidor', 'orders', true),
  ('repartidor', 'menu', false),
  ('repartidor', 'inventario', false),
  ('repartidor', 'personal', false),
  ('repartidor', 'gastos', false),
  ('repartidor', 'reportes', false),
  ('repartidor', 'configuracion', false)
ON CONFLICT (role, page_key) DO NOTHING;

-- ─── System Configuration ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_system_config" ON public.system_config;
CREATE POLICY "authenticated_manage_system_config"
  ON public.system_config FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

INSERT INTO public.system_config (config_key, config_value, description) VALUES
  ('table_count', '20', 'Número de mesas del restaurante'),
  ('restaurant_name', 'Restaurante El Sabor Mexicano', 'Nombre del restaurante'),
  ('iva_percent', '16', 'Porcentaje de IVA aplicado'),
  ('initialized', 'true', 'Si el sistema ya fue configurado inicialmente')
ON CONFLICT (config_key) DO NOTHING;
