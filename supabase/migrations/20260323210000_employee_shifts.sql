-- Migration: Add employee_shifts table for weekly shift scheduling
-- Timestamp: 20260323210000

CREATE TABLE IF NOT EXISTS public.employee_shifts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day text NOT NULL CHECK (day IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')),
  shift text NOT NULL DEFAULT 'descanso' CHECK (shift IN ('matutino', 'vespertino', 'nocturno', 'descanso')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (employee_id, day)
);

ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'employee_shifts' AND policyname = 'Allow authenticated read employee_shifts'
  ) THEN
    CREATE POLICY "Allow authenticated read employee_shifts"
      ON public.employee_shifts FOR SELECT
      TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'employee_shifts' AND policyname = 'Allow authenticated write employee_shifts'
  ) THEN
    CREATE POLICY "Allow authenticated write employee_shifts"
      ON public.employee_shifts FOR ALL
      TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
