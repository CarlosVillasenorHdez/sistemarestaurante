-- ============================================================
-- Módulo de Recursos Humanos
-- Tablas: rh_vacaciones, rh_permisos, rh_tiempos_extras
-- ============================================================

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

DROP TYPE IF EXISTS public.rh_solicitud_estado CASCADE;
CREATE TYPE public.rh_solicitud_estado AS ENUM ('pendiente', 'aprobado', 'rechazado');

DROP TYPE IF EXISTS public.rh_permiso_tipo CASCADE;
CREATE TYPE public.rh_permiso_tipo AS ENUM (
  'personal', 'medico', 'familiar', 'otro'
);

-- ─── VACACIONES ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rh_vacaciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE NOT NULL,
  dias_solicitados INTEGER NOT NULL DEFAULT 1,
  estado          public.rh_solicitud_estado NOT NULL DEFAULT 'pendiente',
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rh_vacaciones_employee ON public.rh_vacaciones(employee_id);
CREATE INDEX IF NOT EXISTS idx_rh_vacaciones_estado ON public.rh_vacaciones(estado);

ALTER TABLE public.rh_vacaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rh_vacaciones_all" ON public.rh_vacaciones;
CREATE POLICY "rh_vacaciones_all" ON public.rh_vacaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── PERMISOS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rh_permisos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tipo            public.rh_permiso_tipo NOT NULL DEFAULT 'personal',
  fecha           DATE NOT NULL,
  horas           NUMERIC(4,1) NOT NULL DEFAULT 1,
  con_goce        BOOLEAN NOT NULL DEFAULT true,
  estado          public.rh_solicitud_estado NOT NULL DEFAULT 'pendiente',
  motivo          TEXT,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rh_permisos_employee ON public.rh_permisos(employee_id);

ALTER TABLE public.rh_permisos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rh_permisos_all" ON public.rh_permisos;
CREATE POLICY "rh_permisos_all" ON public.rh_permisos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── TIEMPOS EXTRAS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rh_tiempos_extras (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL,
  horas           NUMERIC(4,1) NOT NULL DEFAULT 1,
  factor_pago     NUMERIC(3,2) NOT NULL DEFAULT 1.5,
  estado          public.rh_solicitud_estado NOT NULL DEFAULT 'pendiente',
  descripcion     TEXT,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rh_tiempos_extras_employee ON public.rh_tiempos_extras(employee_id);

ALTER TABLE public.rh_tiempos_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rh_tiempos_extras_all" ON public.rh_tiempos_extras;
CREATE POLICY "rh_tiempos_extras_all" ON public.rh_tiempos_extras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── MOCK DATA ───────────────────────────────────────────────────────────────

DO $$
DECLARE
  emp1 UUID;
  emp2 UUID;
  emp3 UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employees'
  ) THEN
    SELECT id INTO emp1 FROM public.employees ORDER BY created_at LIMIT 1;
    SELECT id INTO emp2 FROM public.employees ORDER BY created_at OFFSET 1 LIMIT 1;
    SELECT id INTO emp3 FROM public.employees ORDER BY created_at OFFSET 2 LIMIT 1;

    IF emp1 IS NOT NULL THEN
      -- Vacaciones
      INSERT INTO public.rh_vacaciones (employee_id, fecha_inicio, fecha_fin, dias_solicitados, estado, notas)
      VALUES
        (emp1, CURRENT_DATE + 10, CURRENT_DATE + 17, 7, 'aprobado', 'Vacaciones de verano'),
        (emp1, CURRENT_DATE - 30, CURRENT_DATE - 23, 7, 'aprobado', 'Vacaciones anteriores')
      ON CONFLICT (id) DO NOTHING;

      -- Permisos
      INSERT INTO public.rh_permisos (employee_id, tipo, fecha, horas, con_goce, estado, motivo)
      VALUES
        (emp1, 'medico', CURRENT_DATE - 5, 3, true, 'aprobado', 'Cita medica')
      ON CONFLICT (id) DO NOTHING;

      -- Tiempos extras
      INSERT INTO public.rh_tiempos_extras (employee_id, fecha, horas, factor_pago, estado, descripcion)
      VALUES
        (emp1, CURRENT_DATE - 2, 2, 1.5, 'aprobado', 'Cierre de mes')
      ON CONFLICT (id) DO NOTHING;
    END IF;

    IF emp2 IS NOT NULL THEN
      INSERT INTO public.rh_vacaciones (employee_id, fecha_inicio, fecha_fin, dias_solicitados, estado, notas)
      VALUES
        (emp2, CURRENT_DATE + 20, CURRENT_DATE + 25, 5, 'pendiente', 'Solicitud pendiente de aprobacion')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.rh_tiempos_extras (employee_id, fecha, horas, factor_pago, estado, descripcion)
      VALUES
        (emp2, CURRENT_DATE - 1, 3, 2.0, 'pendiente', 'Dia festivo trabajado')
      ON CONFLICT (id) DO NOTHING;
    END IF;

    IF emp3 IS NOT NULL THEN
      INSERT INTO public.rh_permisos (employee_id, tipo, fecha, horas, con_goce, estado, motivo)
      VALUES
        (emp3, 'familiar', CURRENT_DATE - 3, 8, false, 'aprobado', 'Asunto familiar urgente')
      ON CONFLICT (id) DO NOTHING;
    END IF;
  ELSE
    RAISE NOTICE 'Table employees does not exist. Skipping mock data.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'RH mock data failed: %', SQLERRM;
END $$;
