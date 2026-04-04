// ─── Fuente de verdad de planes Aldente ───────────────────────────────────────
export const PLAN_MODULES = {
  basico: {
    label: 'Básico',
    price: 800,
    pages: ['dashboard', 'pos', 'orders', 'menu', 'personal', 'corte_caja'],
    features: {} as Record<string, never>,
  },
  estandar: {
    label: 'Estándar',
    price: 1500,
    pages: [
      'dashboard', 'pos', 'orders', 'menu', 'personal', 'corte_caja',
      'inventario', 'lealtad', 'reservaciones', 'reportes', 'mesero', 'cocina',
    ],
    features: { inventario: true, lealtad: true, reservaciones: true, cocina: true },
  },
  premium: {
    label: 'Premium',
    price: 2500,
    pages: [
      'dashboard', 'pos', 'orders', 'menu', 'personal', 'corte_caja',
      'inventario', 'lealtad', 'reservaciones', 'reportes', 'mesero', 'cocina',
      'delivery', 'recursos_humanos', 'gastos', 'sucursales', 'alarmas', 'configuracion',
    ],
    features: {
      inventario: true, lealtad: true, reservaciones: true, cocina: true,
      delivery: true, recursosHumanos: true, gastos: true,
      multiSucursal: true, alarmas: true, meseroMovil: true,
    },
  },
} as const;

export type PlanKey = keyof typeof PLAN_MODULES;

export function getPlan(plan: string): (typeof PLAN_MODULES)[PlanKey] {
  return PLAN_MODULES[plan as PlanKey] ?? PLAN_MODULES.basico;
}

export function planPrice(plan: string): number {
  return getPlan(plan).price;
}
