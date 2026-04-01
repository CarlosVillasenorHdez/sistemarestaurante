-- =============================================================================
-- DEMO SEED DATA — Datos de demostración completos
-- Pobla: delivery_orders, gastos_pagos, rh_vacaciones, rh_permisos,
--        rh_tiempos_extras, rh_incapacidades, cortes_caja
-- Agrega más órdenes cerradas históricas para reportes y dashboard
-- Tenant: 00000000-0000-0000-0000-000000000001
-- =============================================================================

DO $$
DECLARE
  tid  UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  bid  UUID;   -- branch id (Sucursal Centro)

  -- Employees (lookup by name)
  emp_admin_id    UUID;
  emp_gerente_id  UUID;
  emp_cajero1_id  UUID;
  emp_mes1_id     UUID;
  emp_mes2_id     UUID;
  emp_mes3_id     UUID;
  emp_coc1_id     UUID;
  emp_coc2_id     UUID;
  emp_ayu1_id     UUID;
  emp_rep1_id     UUID;

  -- Gastos recurrentes IDs
  gr_renta_id     UUID;
  gr_luz_id       UUID;
  gr_gas_id       UUID;
  gr_nomina_id    UUID;
  gr_mant_id      UUID;

  -- Corte de caja IDs
  corte1_id UUID := gen_random_uuid();
  corte2_id UUID := gen_random_uuid();
  corte3_id UUID := gen_random_uuid();

BEGIN

  -- ── Resolve branch ──────────────────────────────────────────────────────────
  SELECT id INTO bid FROM public.branches WHERE name = 'Sucursal Centro' LIMIT 1;

  -- ── Resolve employee IDs ────────────────────────────────────────────────────
  SELECT id INTO emp_admin_id   FROM public.employees WHERE name = 'Carlos Mendoza'    LIMIT 1;
  SELECT id INTO emp_gerente_id FROM public.employees WHERE name = 'Sofía Ramírez'     LIMIT 1;
  SELECT id INTO emp_cajero1_id FROM public.employees WHERE name = 'Luis Torres'       LIMIT 1;
  SELECT id INTO emp_mes1_id    FROM public.employees WHERE name = 'María García'      LIMIT 1;
  SELECT id INTO emp_mes2_id    FROM public.employees WHERE name = 'Javier López'      LIMIT 1;
  SELECT id INTO emp_mes3_id    FROM public.employees WHERE name = 'Fernanda Castro'   LIMIT 1;
  SELECT id INTO emp_coc1_id    FROM public.employees WHERE name = 'Ana Hernández'     LIMIT 1;
  SELECT id INTO emp_coc2_id    FROM public.employees WHERE name = 'Roberto Díaz'      LIMIT 1;
  SELECT id INTO emp_ayu1_id    FROM public.employees WHERE name = 'Patricia Flores'   LIMIT 1;
  SELECT id INTO emp_rep1_id    FROM public.employees WHERE name = 'Diego Morales'     LIMIT 1;

  -- ── Resolve gastos recurrentes IDs ──────────────────────────────────────────
  SELECT id INTO gr_renta_id  FROM public.gastos_recurrentes WHERE nombre = 'Renta del local'       LIMIT 1;
  SELECT id INTO gr_luz_id    FROM public.gastos_recurrentes WHERE nombre = 'Servicio de luz'        LIMIT 1;
  SELECT id INTO gr_gas_id    FROM public.gastos_recurrentes WHERE nombre = 'Servicio de gas'        LIMIT 1;
  SELECT id INTO gr_nomina_id FROM public.gastos_recurrentes WHERE nombre = 'Nómina quincenal'       LIMIT 1;
  SELECT id INTO gr_mant_id   FROM public.gastos_recurrentes WHERE nombre = 'Mantenimiento equipos'  LIMIT 1;

  -- ===========================================================================
  -- 1. DELIVERY ORDERS — pedidos de plataformas externas
  -- ===========================================================================
  INSERT INTO public.delivery_orders (
    external_id, platform, customer_name, customer_address, customer_phone,
    items, subtotal, delivery_fee, total, status, notes,
    branch_id, tenant_id, received_at
  ) VALUES
  (
    'UE-78234', 'uber_eats', 'Roberto Sánchez',
    'Calle Morelos 45, Col. Reforma',
    '55 8899 0011',
    '[{"name":"Tacos de Res (3 pzas)","qty":2,"price":145},{"name":"Agua de Jamaica","qty":2,"price":35}]'::jsonb,
    360, 35, 395, 'entregado', 'Sin cebolla en los tacos',
    bid, tid, NOW() - INTERVAL '3 hours'
  ),
  (
    'RP-44512', 'rappi', 'Daniela Fuentes',
    'Av. Juárez 210, Piso 3',
    '55 7766 5544',
    '[{"name":"Birria de Res","qty":1,"price":165},{"name":"Pozole Rojo","qty":1,"price":155},{"name":"Horchata","qty":2,"price":35}]'::jsonb,
    390, 45, 435, 'entregado', NULL,
    bid, tid, NOW() - INTERVAL '5 hours'
  ),
  (
    'DD-99103', 'didi_food', 'Marco Herrera',
    'Blvd. Insurgentes 780, Col. Norte',
    '55 6655 4433',
    '[{"name":"Mole Negro con Pollo","qty":2,"price":175},{"name":"Arroz y Frijoles","qty":2,"price":40},{"name":"Café de Olla","qty":2,"price":45}]'::jsonb,
    520, 50, 570, 'en_camino', 'Entregar en recepción',
    bid, tid, NOW() - INTERVAL '45 minutes'
  ),
  (
    'UE-78301', 'uber_eats', 'Claudia Ríos',
    'Privada Las Flores 12',
    '55 5544 3322',
    '[{"name":"Guacamole con Totopos","qty":1,"price":89},{"name":"Enchiladas Verdes","qty":2,"price":135},{"name":"Margarita Clásica","qty":2,"price":95}]'::jsonb,
    549, 35, 584, 'preparacion', NULL,
    bid, tid, NOW() - INTERVAL '20 minutes'
  ),
  (
    'RP-44589', 'rappi', 'Ernesto Vargas',
    'Calle Hidalgo 33, Col. Centro',
    '55 4433 2211',
    '[{"name":"Camarones al Ajillo","qty":1,"price":195},{"name":"Sopa de Lima","qty":1,"price":75},{"name":"Flan Napolitano","qty":1,"price":70}]'::jsonb,
    340, 40, 380, 'recibido', 'Alergia a mariscos — verificar',
    bid, tid, NOW() - INTERVAL '5 minutes'
  ),
  (
    'MN-10045', 'manual', 'Empresa Constructora MX',
    'Av. Tecnológico 500, Parque Industrial',
    '55 3322 1100',
    '[{"name":"Tacos de Res (3 pzas)","qty":5,"price":145},{"name":"Pozole Rojo","qty":3,"price":155},{"name":"Agua de Jamaica","qty":5,"price":35},{"name":"Horchata","qty":3,"price":35}]'::jsonb,
    1360, 0, 1360, 'listo', 'Pedido corporativo — 8 personas',
    bid, tid, NOW() - INTERVAL '1 hour'
  ),
  (
    'UE-77998', 'uber_eats', 'Sofía Mendez',
    'Calle Allende 88',
    '55 2211 0099',
    '[{"name":"Pastel de Tres Leches","qty":2,"price":85},{"name":"Churros con Cajeta","qty":1,"price":75},{"name":"Café de Olla","qty":2,"price":45}]'::jsonb,
    335, 35, 370, 'cancelado', 'Cliente canceló — fuera de zona',
    bid, tid, NOW() - INTERVAL '2 hours'
  ),
  (
    'DD-99050', 'didi_food', 'Alejandro Torres',
    'Residencial El Bosque, Casa 14',
    '55 1100 9988',
    '[{"name":"Birria de Res","qty":2,"price":165},{"name":"Tortillas de Maíz (5 pzas)","qty":2,"price":20},{"name":"Cerveza Artesanal","qty":2,"price":75}]'::jsonb,
    520, 50, 570, 'entregado', NULL,
    bid, tid, NOW() - INTERVAL '6 hours'
  )
  ON CONFLICT DO NOTHING;

  -- ===========================================================================
  -- 2. GASTOS PAGOS — historial de pagos de gastos recurrentes
  -- ===========================================================================
  IF gr_renta_id IS NOT NULL THEN
    INSERT INTO public.gastos_pagos (gasto_id, fecha_pago, monto_pagado, periodo_inicio, periodo_fin, notas, tenant_id) VALUES
      (gr_renta_id, CURRENT_DATE - INTERVAL '2 months', 18000, (CURRENT_DATE - INTERVAL '2 months')::date, (CURRENT_DATE - INTERVAL '2 months' + INTERVAL '1 month - 1 day')::date, 'Pago puntual', tid),
      (gr_renta_id, CURRENT_DATE - INTERVAL '1 month',  18000, (CURRENT_DATE - INTERVAL '1 month')::date,  (CURRENT_DATE - INTERVAL '1 day')::date,                                 'Pago puntual', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF gr_luz_id IS NOT NULL THEN
    INSERT INTO public.gastos_pagos (gasto_id, fecha_pago, monto_pagado, periodo_inicio, periodo_fin, notas, tenant_id) VALUES
      (gr_luz_id, CURRENT_DATE - INTERVAL '2 months', 4200, (CURRENT_DATE - INTERVAL '2 months')::date, (CURRENT_DATE - INTERVAL '2 months' + INTERVAL '1 month - 1 day')::date, 'Consumo normal', tid),
      (gr_luz_id, CURRENT_DATE - INTERVAL '1 month',  4800, (CURRENT_DATE - INTERVAL '1 month')::date,  (CURRENT_DATE - INTERVAL '1 day')::date,                                 'Consumo alto por temporada', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF gr_gas_id IS NOT NULL THEN
    INSERT INTO public.gastos_pagos (gasto_id, fecha_pago, monto_pagado, periodo_inicio, periodo_fin, notas, tenant_id) VALUES
      (gr_gas_id, CURRENT_DATE - INTERVAL '2 months', 2600, (CURRENT_DATE - INTERVAL '2 months')::date, (CURRENT_DATE - INTERVAL '2 months' + INTERVAL '1 month - 1 day')::date, NULL, tid),
      (gr_gas_id, CURRENT_DATE - INTERVAL '1 month',  2800, (CURRENT_DATE - INTERVAL '1 month')::date,  (CURRENT_DATE - INTERVAL '1 day')::date,                                 NULL, tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF gr_nomina_id IS NOT NULL THEN
    INSERT INTO public.gastos_pagos (gasto_id, fecha_pago, monto_pagado, periodo_inicio, periodo_fin, notas, tenant_id) VALUES
      (gr_nomina_id, CURRENT_DATE - INTERVAL '45 days', 45000, (CURRENT_DATE - INTERVAL '45 days')::date, (CURRENT_DATE - INTERVAL '31 days')::date, 'Quincena 1 — mes anterior', tid),
      (gr_nomina_id, CURRENT_DATE - INTERVAL '30 days', 45000, (CURRENT_DATE - INTERVAL '30 days')::date, (CURRENT_DATE - INTERVAL '16 days')::date, 'Quincena 2 — mes anterior', tid),
      (gr_nomina_id, CURRENT_DATE - INTERVAL '15 days', 45000, (CURRENT_DATE - INTERVAL '15 days')::date, (CURRENT_DATE - INTERVAL '1 day')::date,   'Quincena 1 — mes actual',   tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF gr_mant_id IS NOT NULL THEN
    INSERT INTO public.gastos_pagos (gasto_id, fecha_pago, monto_pagado, periodo_inicio, periodo_fin, notas, tenant_id) VALUES
      (gr_mant_id, CURRENT_DATE - INTERVAL '1 month', 1500, (CURRENT_DATE - INTERVAL '1 month')::date, (CURRENT_DATE - INTERVAL '1 day')::date, 'Servicio preventivo realizado', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ===========================================================================
  -- 3. RH VACACIONES
  -- ===========================================================================
  IF emp_mes1_id IS NOT NULL THEN
    INSERT INTO public.rh_vacaciones (employee_id, fecha_inicio, fecha_fin, dias_solicitados, estado, notas, tenant_id) VALUES
      (emp_mes1_id, CURRENT_DATE + 14, CURRENT_DATE + 21, 5, 'aprobado', 'Vacaciones de Semana Santa', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_mes2_id IS NOT NULL THEN
    INSERT INTO public.rh_vacaciones (employee_id, fecha_inicio, fecha_fin, dias_solicitados, estado, notas, tenant_id) VALUES
      (emp_mes2_id, CURRENT_DATE + 30, CURRENT_DATE + 37, 5, 'pendiente', 'Solicitud de vacaciones — pendiente de aprobación', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_coc1_id IS NOT NULL THEN
    INSERT INTO public.rh_vacaciones (employee_id, fecha_inicio, fecha_fin, dias_solicitados, estado, notas, tenant_id) VALUES
      (emp_coc1_id, CURRENT_DATE - 20, CURRENT_DATE - 13, 5, 'aprobado', 'Vacaciones tomadas — mes pasado', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_mes3_id IS NOT NULL THEN
    INSERT INTO public.rh_vacaciones (employee_id, fecha_inicio, fecha_fin, dias_solicitados, estado, notas, tenant_id) VALUES
      (emp_mes3_id, CURRENT_DATE + 60, CURRENT_DATE + 65, 4, 'pendiente', 'Vacaciones de verano', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_ayu1_id IS NOT NULL THEN
    INSERT INTO public.rh_vacaciones (employee_id, fecha_inicio, fecha_fin, dias_solicitados, estado, notas, tenant_id) VALUES
      (emp_ayu1_id, CURRENT_DATE + 7, CURRENT_DATE + 9, 2, 'rechazado', 'Rechazado — temporada alta', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ===========================================================================
  -- 4. RH PERMISOS
  -- ===========================================================================
  IF emp_mes1_id IS NOT NULL THEN
    INSERT INTO public.rh_permisos (employee_id, tipo, fecha, horas, con_goce, estado, motivo, tenant_id) VALUES
      (emp_mes1_id, 'medico', CURRENT_DATE - 5, 3, true, 'aprobado', 'Cita médica de rutina', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_coc2_id IS NOT NULL THEN
    INSERT INTO public.rh_permisos (employee_id, tipo, fecha, horas, con_goce, estado, motivo, tenant_id) VALUES
      (emp_coc2_id, 'familiar', CURRENT_DATE - 2, 4, true, 'aprobado', 'Graduación de hijo', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_mes2_id IS NOT NULL THEN
    INSERT INTO public.rh_permisos (employee_id, tipo, fecha, horas, con_goce, estado, motivo, tenant_id) VALUES
      (emp_mes2_id, 'personal', CURRENT_DATE + 3, 2, false, 'pendiente', 'Trámite en banco', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_ayu1_id IS NOT NULL THEN
    INSERT INTO public.rh_permisos (employee_id, tipo, fecha, horas, con_goce, estado, motivo, tenant_id) VALUES
      (emp_ayu1_id, 'medico', CURRENT_DATE - 10, 5, true, 'aprobado', 'Urgencia médica familiar', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_rep1_id IS NOT NULL THEN
    INSERT INTO public.rh_permisos (employee_id, tipo, fecha, horas, con_goce, estado, motivo, tenant_id) VALUES
      (emp_rep1_id, 'otro', CURRENT_DATE + 1, 3, false, 'pendiente', 'Renovación de licencia de conducir', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ===========================================================================
  -- 5. RH TIEMPOS EXTRAS
  -- ===========================================================================
  IF emp_coc1_id IS NOT NULL THEN
    INSERT INTO public.rh_tiempos_extras (employee_id, fecha, horas, factor_pago, estado, descripcion, tenant_id) VALUES
      (emp_coc1_id, CURRENT_DATE - 7,  3, 1.5, 'aprobado', 'Evento especial — cena de empresa', tid),
      (emp_coc1_id, CURRENT_DATE - 14, 2, 1.5, 'aprobado', 'Cobertura por ausencia de compañero', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_coc2_id IS NOT NULL THEN
    INSERT INTO public.rh_tiempos_extras (employee_id, fecha, horas, factor_pago, estado, descripcion, tenant_id) VALUES
      (emp_coc2_id, CURRENT_DATE - 3,  4, 2.0, 'aprobado', 'Turno nocturno — fin de semana', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_mes1_id IS NOT NULL THEN
    INSERT INTO public.rh_tiempos_extras (employee_id, fecha, horas, factor_pago, estado, descripcion, tenant_id) VALUES
      (emp_mes1_id, CURRENT_DATE - 1,  2, 1.5, 'pendiente', 'Cierre tardío — mesa VIP', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_mes3_id IS NOT NULL THEN
    INSERT INTO public.rh_tiempos_extras (employee_id, fecha, horas, factor_pago, estado, descripcion, tenant_id) VALUES
      (emp_mes3_id, CURRENT_DATE - 5,  3, 1.5, 'aprobado', 'Evento de cumpleaños — grupo de 20 personas', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_rep1_id IS NOT NULL THEN
    INSERT INTO public.rh_tiempos_extras (employee_id, fecha, horas, factor_pago, estado, descripcion, tenant_id) VALUES
      (emp_rep1_id, CURRENT_DATE - 2,  2, 1.5, 'pendiente', 'Entregas adicionales — pedidos de plataforma', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ===========================================================================
  -- 6. RH INCAPACIDADES
  -- ===========================================================================
  IF emp_ayu1_id IS NOT NULL THEN
    INSERT INTO public.rh_incapacidades (employee_id, tipo, fecha_inicio, fecha_fin, dias, folio_imss, porcentaje_salario, estado, notas, tenant_id) VALUES
      (emp_ayu1_id, 'enfermedad_general', CURRENT_DATE - 30, CURRENT_DATE - 25, 5, 'IMSS-2026-0034521', 60, 'pendiente', 'Gripe con complicaciones respiratorias', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  IF emp_coc2_id IS NOT NULL THEN
    INSERT INTO public.rh_incapacidades (employee_id, tipo, fecha_inicio, fecha_fin, dias, folio_imss, porcentaje_salario, estado, notas, tenant_id) VALUES
      (emp_coc2_id, 'riesgo_trabajo', CURRENT_DATE - 60, CURRENT_DATE - 53, 7, 'IMSS-2026-0029876', 100, 'pendiente', 'Quemadura leve en mano derecha — accidente en cocina', tid)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ===========================================================================
  -- 7. CORTES DE CAJA — historial de 3 cortes
  -- ===========================================================================
  INSERT INTO public.cortes_caja (
    id, tenant_id, apertura_at, fondo_inicial, apertura_por,
    cierre_at, cierre_por,
    ventas_efectivo, ventas_tarjeta, ventas_total,
    ordenes_count, descuentos_total, iva_total,
    efectivo_contado, diferencia,
    denominaciones, notas, status
  ) VALUES
  (
    corte1_id, tid,
    NOW() - INTERVAL '2 days 10 hours', 2000, 'Luis Torres',
    NOW() - INTERVAL '2 days 1 hour',   'Luis Torres',
    3850, 5200, 9050,
    22, 150, 1448,
    5900, 50,
    '{"1000":3,"500":4,"200":5,"100":8,"50":10,"20":15,"10":20}'::jsonb,
    'Corte sin novedad', 'cerrado'
  ),
  (
    corte2_id, tid,
    NOW() - INTERVAL '1 day 10 hours', 2000, 'Valeria Ortiz',
    NOW() - INTERVAL '1 day 1 hour',   'Valeria Ortiz',
    4200, 6800, 11000,
    28, 200, 1760,
    6250, 50,
    '{"1000":4,"500":5,"200":6,"100":10,"50":12,"20":18,"10":25}'::jsonb,
    'Diferencia de $50 — moneda encontrada al final', 'cerrado'
  ),
  (
    corte3_id, tid,
    NOW() - INTERVAL '10 hours', 2000, 'Luis Torres',
    NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL,
    NULL,
    'Corte en curso — turno actual', 'abierto'
  )
  ON CONFLICT DO NOTHING;

  -- ===========================================================================
  -- 8. ÓRDENES HISTÓRICAS ADICIONALES — para enriquecer reportes y dashboard
  --    (últimos 7 días, variedad de meseros y montos)
  -- ===========================================================================
  INSERT INTO public.orders (
    id, mesa, mesa_num, mesero, subtotal, iva, discount, total,
    status, pay_method, opened_at, closed_at, duration_min,
    branch, kitchen_status, tenant_id
  ) VALUES
  -- Ayer
  ('ORD-DEMO-01','Mesa 4',  4,  'María García',    520,  83.2,  0,   603.2,  'cerrada', 'efectivo', '12:00', '13:05', 65,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-02','Mesa 8',  8,  'Javier López',    310,  49.6,  0,   359.6,  'cerrada', 'tarjeta',  '12:30', '13:20', 50,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-03','Mesa 11', 11, 'Fernanda Castro', 780,  124.8, 50,  854.8,  'cerrada', 'tarjeta',  '13:00', '14:15', 75,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-04','Mesa 2',  2,  'María García',    430,  68.8,  0,   498.8,  'cerrada', 'efectivo', '14:00', '14:55', 55,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-05','Mesa 6',  6,  'Javier López',    960,  153.6, 100, 1013.6, 'cerrada', 'tarjeta',  '14:30', '16:00', 90,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-06','Mesa 9',  9,  'Fernanda Castro', 290,  46.4,  0,   336.4,  'cerrada', 'efectivo', '15:00', '15:45', 45,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-07','Mesa 14', 14, 'María García',    650,  104,   0,   754,    'cerrada', 'tarjeta',  '18:00', '19:10', 70,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-08','Mesa 3',  3,  'Javier López',    1100, 176,   0,   1276,   'cerrada', 'efectivo', '19:00', '20:30', 90,  'Sucursal Centro', 'listo', tid),
  -- Hace 2 días
  ('ORD-DEMO-09','Mesa 5',  5,  'Fernanda Castro', 480,  76.8,  0,   556.8,  'cerrada', 'tarjeta',  '13:00', '13:50', 50,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-10','Mesa 7',  7,  'María García',    870,  139.2, 50,  959.2,  'cerrada', 'efectivo', '14:00', '15:20', 80,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-11','Mesa 10', 10, 'Javier López',    340,  54.4,  0,   394.4,  'cerrada', 'tarjeta',  '15:00', '15:40', 40,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-12','Mesa 12', 12, 'Fernanda Castro', 720,  115.2, 0,   835.2,  'cerrada', 'tarjeta',  '19:30', '20:45', 75,  'Sucursal Centro', 'listo', tid),
  -- Hace 3 días
  ('ORD-DEMO-13','Mesa 1',  1,  'María García',    560,  89.6,  0,   649.6,  'cerrada', 'efectivo', '12:00', '13:00', 60,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-14','Mesa 4',  4,  'Javier López',    430,  68.8,  0,   498.8,  'cerrada', 'tarjeta',  '13:30', '14:20', 50,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-15','Mesa 6',  6,  'Fernanda Castro', 1250, 200,   100, 1350,   'cerrada', 'tarjeta',  '20:00', '21:30', 90,  'Sucursal Centro', 'listo', tid),
  -- Hace 4 días
  ('ORD-DEMO-16','Mesa 8',  8,  'María García',    390,  62.4,  0,   452.4,  'cerrada', 'efectivo', '12:30', '13:15', 45,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-17','Mesa 13', 13, 'Javier López',    980,  156.8, 50,  1086.8, 'cerrada', 'tarjeta',  '14:00', '15:30', 90,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-18','Mesa 2',  2,  'Fernanda Castro', 310,  49.6,  0,   359.6,  'cerrada', 'efectivo', '18:00', '18:50', 50,  'Sucursal Centro', 'listo', tid),
  -- Hace 5 días
  ('ORD-DEMO-19','Mesa 5',  5,  'María García',    640,  102.4, 0,   742.4,  'cerrada', 'tarjeta',  '13:00', '14:10', 70,  'Sucursal Centro', 'listo', tid),
  ('ORD-DEMO-20','Mesa 9',  9,  'Javier López',    820,  131.2, 0,   951.2,  'cerrada', 'efectivo', '19:00', '20:20', 80,  'Sucursal Centro', 'listo', tid)
  ON CONFLICT (id) DO NOTHING;

  -- ===========================================================================
  -- 9. ORDER ITEMS para las órdenes históricas demo
  -- ===========================================================================
  INSERT INTO public.order_items (order_id, name, qty, price, emoji, tenant_id) VALUES
  -- ORD-DEMO-01
  ('ORD-DEMO-01', 'Tacos de Res (3 pzas)',    2, 145, '🌮', tid),
  ('ORD-DEMO-01', 'Guacamole con Totopos',    1,  89, '🥑', tid),
  ('ORD-DEMO-01', 'Agua de Jamaica',          2,  35, '🫙', tid),
  ('ORD-DEMO-01', 'Flan Napolitano',          1,  70, '🍮', tid),
  -- ORD-DEMO-02
  ('ORD-DEMO-02', 'Sopa de Lima',             2,  75, '🍲', tid),
  ('ORD-DEMO-02', 'Horchata',                 2,  35, '🥛', tid),
  ('ORD-DEMO-02', 'Churros con Cajeta',       1,  75, '🍩', tid),
  -- ORD-DEMO-03
  ('ORD-DEMO-03', 'Mole Negro con Pollo',     2, 175, '🍗', tid),
  ('ORD-DEMO-03', 'Arroz y Frijoles',         2,  40, '🍚', tid),
  ('ORD-DEMO-03', 'Margarita Clásica',        2,  95, '🍹', tid),
  ('ORD-DEMO-03', 'Pastel de Tres Leches',    1,  85, '🍰', tid),
  -- ORD-DEMO-04
  ('ORD-DEMO-04', 'Birria de Res',            1, 165, '🥣', tid),
  ('ORD-DEMO-04', 'Elotes Asados',            2,  65, '🌽', tid),
  ('ORD-DEMO-04', 'Café de Olla',             2,  45, '☕', tid),
  -- ORD-DEMO-05
  ('ORD-DEMO-05', 'Camarones al Ajillo',      2, 195, '🦐', tid),
  ('ORD-DEMO-05', 'Enchiladas Verdes',        2, 135, '🫔', tid),
  ('ORD-DEMO-05', 'Cerveza Artesanal',        3,  75, '🍺', tid),
  -- ORD-DEMO-06
  ('ORD-DEMO-06', 'Quesadilla de Flor de Calabaza', 2, 95, '🧀', tid),
  ('ORD-DEMO-06', 'Horchata',                 1,  35, '🥛', tid),
  ('ORD-DEMO-06', 'Café de Olla',             1,  45, '☕', tid),
  -- ORD-DEMO-07
  ('ORD-DEMO-07', 'Pozole Rojo',              2, 155, '🍜', tid),
  ('ORD-DEMO-07', 'Tortillas de Maíz (5 pzas)', 2, 20, '🫓', tid),
  ('ORD-DEMO-07', 'Agua de Jamaica',          2,  35, '🫙', tid),
  ('ORD-DEMO-07', 'Flan Napolitano',          2,  70, '🍮', tid),
  -- ORD-DEMO-08
  ('ORD-DEMO-08', 'Birria de Res',            3, 165, '🥣', tid),
  ('ORD-DEMO-08', 'Tacos de Res (3 pzas)',    2, 145, '🌮', tid),
  ('ORD-DEMO-08', 'Margarita Clásica',        3,  95, '🍹', tid),
  ('ORD-DEMO-08', 'Pastel de Tres Leches',    2,  85, '🍰', tid),
  -- ORD-DEMO-09
  ('ORD-DEMO-09', 'Enchiladas Verdes',        2, 135, '🫔', tid),
  ('ORD-DEMO-09', 'Sopa de Lima',             1,  75, '🍲', tid),
  ('ORD-DEMO-09', 'Horchata',                 2,  35, '🥛', tid),
  -- ORD-DEMO-10
  ('ORD-DEMO-10', 'Mole Negro con Pollo',     2, 175, '🍗', tid),
  ('ORD-DEMO-10', 'Camarones al Ajillo',      2, 195, '🦐', tid),
  ('ORD-DEMO-10', 'Cerveza Artesanal',        2,  75, '🍺', tid),
  -- ORD-DEMO-11
  ('ORD-DEMO-11', 'Guacamole con Totopos',    2,  89, '🥑', tid),
  ('ORD-DEMO-11', 'Tacos de Res (3 pzas)',    1, 145, '🌮', tid),
  ('ORD-DEMO-11', 'Agua de Jamaica',          1,  35, '🫙', tid),
  -- ORD-DEMO-12
  ('ORD-DEMO-12', 'Pozole Rojo',              2, 155, '🍜', tid),
  ('ORD-DEMO-12', 'Birria de Res',            2, 165, '🥣', tid),
  ('ORD-DEMO-12', 'Cerveza Artesanal',        2,  75, '🍺', tid),
  -- ORD-DEMO-13
  ('ORD-DEMO-13', 'Tacos de Res (3 pzas)',    2, 145, '🌮', tid),
  ('ORD-DEMO-13', 'Elotes Asados',            2,  65, '🌽', tid),
  ('ORD-DEMO-13', 'Margarita Clásica',        2,  95, '🍹', tid),
  -- ORD-DEMO-14
  ('ORD-DEMO-14', 'Enchiladas Verdes',        2, 135, '🫔', tid),
  ('ORD-DEMO-14', 'Arroz y Frijoles',         2,  40, '🍚', tid),
  ('ORD-DEMO-14', 'Café de Olla',             2,  45, '☕', tid),
  -- ORD-DEMO-15
  ('ORD-DEMO-15', 'Camarones al Ajillo',      3, 195, '🦐', tid),
  ('ORD-DEMO-15', 'Mole Negro con Pollo',     2, 175, '🍗', tid),
  ('ORD-DEMO-15', 'Margarita Clásica',        3,  95, '🍹', tid),
  ('ORD-DEMO-15', 'Pastel de Tres Leches',    2,  85, '🍰', tid),
  -- ORD-DEMO-16
  ('ORD-DEMO-16', 'Sopa de Lima',             2,  75, '🍲', tid),
  ('ORD-DEMO-16', 'Quesadilla de Flor de Calabaza', 2, 95, '🧀', tid),
  ('ORD-DEMO-16', 'Horchata',                 2,  35, '🥛', tid),
  -- ORD-DEMO-17
  ('ORD-DEMO-17', 'Birria de Res',            3, 165, '🥣', tid),
  ('ORD-DEMO-17', 'Pozole Rojo',              2, 155, '🍜', tid),
  ('ORD-DEMO-17', 'Cerveza Artesanal',        3,  75, '🍺', tid),
  -- ORD-DEMO-18
  ('ORD-DEMO-18', 'Guacamole con Totopos',    1,  89, '🥑', tid),
  ('ORD-DEMO-18', 'Tacos de Res (3 pzas)',    1, 145, '🌮', tid),
  ('ORD-DEMO-18', 'Agua de Jamaica',          2,  35, '🫙', tid),
  -- ORD-DEMO-19
  ('ORD-DEMO-19', 'Mole Negro con Pollo',     2, 175, '🍗', tid),
  ('ORD-DEMO-19', 'Enchiladas Verdes',        2, 135, '🫔', tid),
  ('ORD-DEMO-19', 'Margarita Clásica',        1,  95, '🍹', tid),
  -- ORD-DEMO-20
  ('ORD-DEMO-20', 'Camarones al Ajillo',      2, 195, '🦐', tid),
  ('ORD-DEMO-20', 'Birria de Res',            2, 165, '🥣', tid),
  ('ORD-DEMO-20', 'Cerveza Artesanal',        2,  75, '🍺', tid),
  ('ORD-DEMO-20', 'Pastel de Tres Leches',    1,  85, '🍰', tid)
  ON CONFLICT DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Demo seed failed: %', SQLERRM;
END $$;
