-- ─── Gastos Recurrentes y Depreciaciones ─────────────────────────────────────

-- 1. ENUM types
DROP TYPE IF EXISTS public.gasto_frecuencia CASCADE;
CREATE TYPE public.gasto_frecuencia AS ENUM ('diario', 'semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual');

DROP TYPE IF EXISTS public.gasto_estado CASCADE;
CREATE TYPE public.gasto_estado AS ENUM ('pendiente', 'pagado');

DROP TYPE IF EXISTS public.gasto_categoria CASCADE;
CREATE TYPE public.gasto_categoria AS ENUM ('servicios', 'renta', 'nomina', 'marketing', 'mantenimiento', 'suministros', 'financiero', 'impuestos', 'otro');

DROP TYPE IF EXISTS public.depreciacion_metodo CASCADE;
CREATE TYPE public.depreciacion_metodo AS ENUM ('linea_recta', 'saldo_decreciente', 'unidades_produccion');

-- 2. Gastos recurrentes table
CREATE TABLE IF NOT EXISTS public.gastos_recurrentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    monto DECIMAL(12,2) NOT NULL DEFAULT 0,
    categoria public.gasto_categoria NOT NULL DEFAULT 'otro'::public.gasto_categoria,
    frecuencia public.gasto_frecuencia NOT NULL DEFAULT 'mensual'::public.gasto_frecuencia,
    dia_pago INTEGER DEFAULT 1,
    proximo_pago DATE,
    estado public.gasto_estado NOT NULL DEFAULT 'pendiente'::public.gasto_estado,
    activo BOOLEAN NOT NULL DEFAULT true,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Historial de pagos de gastos
CREATE TABLE IF NOT EXISTS public.gastos_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gasto_id UUID NOT NULL REFERENCES public.gastos_recurrentes(id) ON DELETE CASCADE,
    fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
    monto_pagado DECIMAL(12,2) NOT NULL,
    periodo_inicio DATE,
    periodo_fin DATE,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Depreciaciones y amortizaciones
CREATE TABLE IF NOT EXISTS public.depreciaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL DEFAULT 'depreciacion',
    valor_original DECIMAL(12,2) NOT NULL DEFAULT 0,
    valor_residual DECIMAL(12,2) NOT NULL DEFAULT 0,
    vida_util_anios INTEGER NOT NULL DEFAULT 5,
    fecha_adquisicion DATE NOT NULL DEFAULT CURRENT_DATE,
    metodo public.depreciacion_metodo NOT NULL DEFAULT 'linea_recta'::public.depreciacion_metodo,
    activo BOOLEAN NOT NULL DEFAULT true,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_gastos_recurrentes_activo ON public.gastos_recurrentes(activo);
CREATE INDEX IF NOT EXISTS idx_gastos_recurrentes_categoria ON public.gastos_recurrentes(categoria);
CREATE INDEX IF NOT EXISTS idx_gastos_recurrentes_proximo_pago ON public.gastos_recurrentes(proximo_pago);
CREATE INDEX IF NOT EXISTS idx_gastos_pagos_gasto_id ON public.gastos_pagos(gasto_id);
CREATE INDEX IF NOT EXISTS idx_gastos_pagos_fecha ON public.gastos_pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_depreciaciones_activo ON public.depreciaciones(activo);

-- 6. Enable RLS
ALTER TABLE public.gastos_recurrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depreciaciones ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies (open for authenticated users — same pattern as rest of app)
DROP POLICY IF EXISTS "authenticated_gastos_recurrentes" ON public.gastos_recurrentes;
CREATE POLICY "authenticated_gastos_recurrentes"
ON public.gastos_recurrentes FOR ALL TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_gastos_pagos" ON public.gastos_pagos;
CREATE POLICY "authenticated_gastos_pagos"
ON public.gastos_pagos FOR ALL TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_depreciaciones" ON public.depreciaciones;
CREATE POLICY "authenticated_depreciaciones"
ON public.depreciaciones FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 8. Mock data
DO $$
BEGIN
    -- Gastos recurrentes de ejemplo
    INSERT INTO public.gastos_recurrentes (nombre, descripcion, monto, categoria, frecuencia, dia_pago, proximo_pago, estado, activo)
    VALUES
        ('Luz (CFE)', 'Servicio de electricidad del local', 4800.00, 'servicios'::public.gasto_categoria, 'mensual'::public.gasto_frecuencia, 15, CURRENT_DATE + INTERVAL '5 days', 'pendiente'::public.gasto_estado, true),
        ('Agua (SAPAM)', 'Servicio de agua potable', 1200.00, 'servicios'::public.gasto_categoria, 'bimestral'::public.gasto_frecuencia, 10, CURRENT_DATE + INTERVAL '20 days', 'pendiente'::public.gasto_estado, true),
        ('Gas LP', 'Gas para cocina industrial', 3500.00, 'servicios'::public.gasto_categoria, 'mensual'::public.gasto_frecuencia, 5, CURRENT_DATE + INTERVAL '2 days', 'pendiente'::public.gasto_estado, true),
        ('Renta del Local', 'Arrendamiento mensual del local', 35000.00, 'renta'::public.gasto_categoria, 'mensual'::public.gasto_frecuencia, 1, CURRENT_DATE + INTERVAL '10 days', 'pagado'::public.gasto_estado, true),
        ('Internet y Teléfono', 'Servicio de internet y línea telefónica', 850.00, 'servicios'::public.gasto_categoria, 'mensual'::public.gasto_frecuencia, 20, CURRENT_DATE + INTERVAL '8 days', 'pendiente'::public.gasto_estado, true),
        ('Seguro del Negocio', 'Póliza de seguro comercial', 4200.00, 'otro'::public.gasto_categoria, 'semestral'::public.gasto_frecuencia, 1, CURRENT_DATE + INTERVAL '45 days', 'pendiente'::public.gasto_estado, true),
        ('Publicidad en Redes', 'Pauta en Facebook e Instagram', 2500.00, 'marketing'::public.gasto_categoria, 'mensual'::public.gasto_frecuencia, 1, CURRENT_DATE + INTERVAL '12 days', 'pagado'::public.gasto_estado, true),
        ('Mantenimiento Equipos', 'Servicio preventivo de equipos de cocina', 1800.00, 'mantenimiento'::public.gasto_categoria, 'trimestral'::public.gasto_frecuencia, 15, CURRENT_DATE + INTERVAL '30 days', 'pendiente'::public.gasto_estado, true)
    ON CONFLICT (id) DO NOTHING;

    -- Depreciaciones de ejemplo
    INSERT INTO public.depreciaciones (nombre, descripcion, tipo, valor_original, valor_residual, vida_util_anios, fecha_adquisicion, metodo, activo)
    VALUES
        ('Estufa Industrial 6 Quemadores', 'Estufa Torrey 6 quemadores con horno', 'depreciacion', 28000.00, 2800.00, 10, '2024-01-15', 'linea_recta'::public.depreciacion_metodo, true),
        ('Refrigerador Comercial', 'Refrigerador Torrey 2 puertas 1400 lt', 'depreciacion', 22000.00, 2200.00, 10, '2024-01-15', 'linea_recta'::public.depreciacion_metodo, true),
        ('Sistema POS y Computadoras', 'Equipo de cómputo y software POS', 'depreciacion', 18000.00, 1800.00, 3, '2024-06-01', 'linea_recta'::public.depreciacion_metodo, true),
        ('Mobiliario y Sillas', 'Mesas, sillas y muebles del comedor', 'depreciacion', 45000.00, 4500.00, 10, '2023-09-01', 'linea_recta'::public.depreciacion_metodo, true),
        ('Licencia de Funcionamiento', 'Licencia municipal de operación', 'amortizacion', 8500.00, 0.00, 3, '2024-01-01', 'linea_recta'::public.depreciacion_metodo, true),
        ('Remodelación del Local', 'Inversión en remodelación y adecuación', 'amortizacion', 120000.00, 0.00, 5, '2023-09-01', 'linea_recta'::public.depreciacion_metodo, true)
    ON CONFLICT (id) DO NOTHING;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
