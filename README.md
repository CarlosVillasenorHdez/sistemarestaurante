# 🍽️ Aldente — Plataforma de Inteligencia Operativa para Restaurantes
 
> *"Por fin sabes qué pasa en tu negocio."*
 
Aldente es una plataforma SaaS nativa en la nube para la gestión y análisis de restaurantes. Convierte la operación diaria en inteligencia accionable — desde el primer platillo vendido hasta el pronóstico de recompra de insumos.
 
**Stack:** Next.js 15 · React 19 · TypeScript · Supabase · Tailwind CSS · Recharts  
**Deploy:** `https://sistemares5994.builtwithrocket.new`  
**Versión:** Alpha 0.1 · En producción con cliente fundador
 
---
 
## 🎯 Misión
 
Ser el sistema que convierte el caos de cada servicio en la inteligencia que hace crecer al restaurante. Comenzando con restaurantes en México, con visión de expandirse a toda la industria de hospitalidad en Latinoamérica (hoteles, spas, cafeterías).
 
---
 
## 🏗️ Arquitectura
 
### Multi-Tenant Nativo
Arquitectura `tenants → branches → datos` implementada desde la base:
- `tenant_id` en **24 tablas** con triggers automáticos de asignación
- Funciones PostgreSQL `auth_tenant_id()` y `auth_branch_id()` para aislamiento
- RLS habilitado en todas las tablas
- Soporte multi-sucursal por tenant con selector en sidebar
- Vista consolidada `v_orders_by_branch` para reportes cruzados
 
### Autenticación con PIN
Sistema de login propio (no Supabase Auth como capa única):
- Selección de usuario por nombre + PIN numérico
- Hash SHA-256 con Web Crypto API (sin dependencias externas)
- Sesión en `sessionStorage` con clave `aldente_session`
- Integración con `supabase.auth` para que `auth.uid()` funcione en RLS
 
### Permisos Granulares por Rol
- Hook `useRolePermissions` con cache de módulo compartido
- 18 páginas configurables por rol desde UI de administración
- Admin siempre con acceso total (sin consulta DB)
- Defaults seguros: deny-all para roles sin configuración explícita
- Feature flags adicionales por plan (10 módulos activables desde `system_config`)
 
---
 
## 📦 Módulos del Sistema
 
### OPERACIONES
| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | KPIs en tiempo real: ventas del día, órdenes abiertas, mesas ocupadas, ticket promedio. Gráficas de tendencia por hora/día/semana |
| **Punto de Venta** | Mapa visual de mesas drag-and-drop, unión de mesas (merge groups), toma de órdenes, descuentos, IVA 16%, pago efectivo/tarjeta. Reconexión automática con backoff exponencial en Realtime |
| **Mesero Móvil** | Vista optimizada para dispositivos móviles — meseros toman órdenes desde su celular sin necesidad de terminal física |
| **Órdenes** | Panel de administración de órdenes con filtros, cancelaciones, historial completo |
| **Corte de Caja** | Apertura/cierre de turno con fondo inicial, conteo de denominaciones MXN, diferencias, resumen por método de pago y por mesero |
| **Cocina (KDS)** | Kanban Realtime: Pendiente → En Preparación → Lista → Entregada. Barras de tiempo por urgencia (10/20/30 min). Drag & drop. Modo oscuro optimizado |
| **Delivery** | Módulo de órdenes a domicilio con webhook API para Uber Eats y Rappi. Normalización de payload entre plataformas |
 
### GESTIÓN
| Módulo | Descripción |
|--------|-------------|
| **Menú** | CRUD de platillos con categorías, precio, emoji, disponibilidad, marca "popular". Recetas vinculadas a inventario para deducción automática al cerrar órdenes |
| **Inventario** | CRUD de ingredientes, movimientos con bitácora, alertas de stock mínimo, equivalencias de unidades (kg↔g, lt↔ml, caja↔pz). **Análisis de desperdicio:** % waste ratio, costo estimado en $, tendencia semanal por ingrediente (90 días). **Forecasting RoP:** proyección de stock a 7 días, días hasta punto de reorden, ordenado por urgencia |
| **Reservaciones** | Gestión de reservas con calendario, estados (confirmada/cancelada), integración con POS para marcar mesas reservadas |
| **Lealtad** | Programa de puntos configurable: pesos-por-punto, valor del punto, niveles con beneficios, acumulación/canje integrado en POS |
 
### PERSONAS
| Módulo | Descripción |
|--------|-------------|
| **Personal** | Registro de empleados con roles, salario, frecuencia de pago. Cálculo de nómina normalizada mensual |
| **Recursos Humanos** | Gestión de vacaciones, permisos y tiempos extras. Turnos de empleados |
| **Gastos** | Gastos recurrentes con frecuencias (diario a anual), control pendiente/pagado. Depreciaciones con 3 métodos: línea recta, saldo decreciente, unidades de producción |
| **Multi-Sucursal** | Gestión de sucursales con stats consolidadas por sucursal (órdenes, ingresos, ticket promedio, stock bajo) |
 
### ANÁLISIS Y SISTEMA
| Módulo | Descripción |
|--------|-------------|
| **Reportes** | P&L básico, ventas por período (día/semana/mes), ranking de platillos más/menos vendidos, rendimiento por mesero, bajo stock |
| **Alarmas** | Centro de alertas proactivo: inventario bajo mínimo, órdenes demoradas, gastos próximos a vencer, alertas de sistema. Filtros por categoría y severidad |
| **Configuración** | Datos del restaurante, branding (logo, colores, tema claro/oscuro), layout de mesas drag-and-drop, horarios por día, impresora térmica (58/80mm, red/USB/BT). **Editor de permisos por rol** con 18 páginas configurables |
| **Onboarding** | Wizard de 5 pasos para configuración inicial: datos del restaurante → menú → mesas → empleados → ¡Listo! |
| **Landing** | Página pública con 3 planes de pricing ($799/$1,499/$2,999 MXN/mes) y formulario de solicitud de demo con webhook API |
 
---
 
## 🔐 Seguridad
 
- Autenticación de dos factores: selección de usuario + PIN hasheado con SHA-256
- Integración con Supabase Auth para que `auth.uid()` active RLS a nivel PostgreSQL
- Permisos granulares: 18 módulos configurables por rol desde interfaz de administración
- Defaults seguros: deny-all para roles no configurados (excepto defaults mínimos para mesero/cocinero)
- 3 Edge Functions en Supabase: `create-app-user`, `update-user-password`, `send-email`
- Cache de permisos compartido por módulo (no por componente) para performance
 
---
 
## 🗄️ Base de Datos
 
**18 migraciones** en `supabase/migrations/`, la más reciente del 29 de marzo 2026.
 
Tablas principales: `tenants · branches · restaurant_tables · orders · order_items · dishes · dish_recipes · ingredients · stock_movements · unit_equivalences · employees · app_users · role_permissions · loyalty_customers · loyalty_transactions · reservations · delivery_orders · gastos_recurrentes · depreciaciones · system_config · printer_config · restaurant_layout · rh_vacaciones · rh_permisos · rh_tiempos_extras · employee_shifts`
 
---
 
## 🚀 Instalación
 
```bash
git clone https://github.com/CarlosVillasenorHdez/sistemarestaurante.git
cd sistemarestaurante
npm install
```
 
Crear `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```
 
Aplicar migraciones:
```bash
supabase db push
# O ejecutar manualmente en Supabase SQL Editor
```
 
Iniciar:
```bash
npm run dev  # Puerto 4028
```
 
---
 
## 📋 Scripts
 
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo en puerto 4028 |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run type-check` | TypeScript sin emit |
 
---
 
## 🧰 Stack Tecnológico
 
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Next.js | 15.1 | Framework (App Router) |
| React | 19.0 | UI |
| TypeScript | 5.x | Tipado estricto |
| Supabase | 2.49 | DB, Auth, Realtime, Edge Functions |
| Tailwind CSS | 3.4 | Estilos |
| Recharts | 2.15 | Gráficas |
| Lucide React | 0.577 | Iconografía |
| React Hook Form | 7.71 | Formularios |
| Sonner | 1.7 | Notificaciones |
 
---
 
## 🔜 Roadmap
 
- [ ] CFDI 4.0 — facturación electrónica SAT México *(prioridad #1)*
- [ ] Activar RLS con filtro `tenant_id = auth_tenant_id()` en producción
- [ ] Wizard de onboarding en flujo de registro nuevo tenant
- [ ] App PWA para meseros offline-first
- [ ] Integración nativa Uber Eats / Rappi / DiDi Food
- [ ] Programa de referidos para boca en boca
- [ ] Inteligencia de industria — benchmarks agregados y anonimizados
 
---
 
## 🏢 Modelo de Negocio
 
SaaS mensual por restaurante/sucursal orientado a restaurantes pequeños y medianos en México como punto de entrada, con visión de escalar a toda la industria de hospitalidad en Latinoamérica.
 
| Plan | Precio | Módulos |
|------|--------|---------|
| Básico | $799 MXN/mes | POS, KDS, Menú, hasta 10 mesas |
| Profesional | $1,499 MXN/mes | Todo Básico + KDS, Reservaciones, Lealtad, Reportes |
| Empresarial | $2,999 MXN/mes | Todo + Multi-sucursal, Delivery integrado, API, Soporte 24/7 |
 
---
 
*Construido con Next.js · Supabase · TypeScript*  
*Aldente — Transformar el caos operativo en precisión financiera*
