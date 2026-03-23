-- Branding & theme configuration keys
INSERT INTO public.system_config (config_key, config_value) VALUES
  ('brand_logo_url', ''),
  ('brand_primary_color', '#1B3A6B'),
  ('brand_accent_color', '#f59e0b'),
  ('brand_theme', 'dark'),
  ('brand_restaurant_name', 'Mi Restaurante')
ON CONFLICT (config_key) DO NOTHING;
