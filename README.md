🍽️ SistemaRest — Sistema de Gestión para Restaurantes

Plataforma SaaS completa para la gestión operativa de restaurantes medianos y cadenas locales. Construida con Next.js 15, TypeScript y Supabase.


📋 Descripción
SistemaRest es una solución integral de gestión para restaurantes que cubre el ciclo completo de operación: desde la toma de pedidos en mesa hasta el análisis financiero. Diseñado para restaurantes medianos y cadenas locales que buscan digitalizar y optimizar su operación sin depender de múltiples herramientas.
Modelo de negocio

SaaS mensual por restaurante/sucursal
Orientado a restaurantes medianos y cadenas locales (2–10 sucursales)
Desplegable en la nube con Supabase como backend


✨ Módulos del sistema
🖥️ Punto de Venta (POS)

Mapa visual de mesas con estados (libre / ocupada / en espera)
Unión de mesas — tickets compartidos entre mesas físicas (merge groups)
Catálogo de menú con categorías, precios y disponibilidad
Gestión de órdenes con modificadores de cantidad
Descuentos por porcentaje o monto fijo
Cálculo automático de IVA (16%)
Pago en efectivo y tarjeta
Deducción automática de inventario al cerrar una orden (basada en recetas por platillo)
Registro de movimientos de stock por venta

🍳 Cocina — KDS (Kitchen Display System)

Tablero Kanban en tiempo real: Pendiente → En Preparación → Lista
Sincronización en tiempo real vía Supabase Realtime (postgres_changes)
Indicador de tiempo transcurrido por orden (alertas a los 12 y 20 minutos)
Alertas visuales y sonoras para órdenes nuevas
Botones de avance de estado por orden
Modo oscuro optimizado para pantallas de cocina

📦 Inventario

CRUD completo de ingredientes con categorías y unidades
Control de movimientos de stock (entradas, salidas, ajustes) con bitácora
Alertas automáticas de stock mínimo y punto de reorden
Equivalencias de unidades (kg ↔ g, caja ↔ pz, lt ↔ ml)
Análisis de desperdicio con indicadores de eficiencia
Información de proveedor por ingrediente (nombre, teléfono, URL)

💰 Gastos y Depreciaciones

Registro de gastos recurrentes con frecuencias (diario a anual)
Control de estado (pendiente / pagado) y próximas fechas de pago
Módulo de depreciación contable con 3 métodos:

Línea recta
Saldo decreciente
Unidades de producción


Cálculo de depreciación anual y acumulada por activo

📊 Dashboard y Reportes

KPIs en tiempo real: ventas del día, órdenes abiertas, mesas ocupadas, ticket promedio
Gráfica de ventas por hora (hoy) y por día (semana)
Reportes de platillos más y menos vendidos
Análisis de rendimiento por mesero
Estado P&L básico integrando ingresos, gastos y nómina reales
Análisis de horas pico y predicción de demanda

👥 Personal

Registro de empleados con roles, salario y frecuencia de pago
Control de estado (activo / inactivo)
7 roles disponibles: Administrador, Gerente, Cajero, Mesero, Cocinero, Ayudante de Cocina, Repartidor
Cálculo de nómina mensual normalizada (semanal / quincenal / mensual)

🍜 Menú

Gestión de platillos con nombre, categoría, precio, descripción y emoji
Control de disponibilidad por platillo
Marca de "popular" para destacar en el POS
Recetas por platillo vinculadas al inventario para deducción automática

⚙️ Configuración

Datos del restaurante y logo
Configuración operativa (IVA, mesas, turnos)
Editor de layout de mesas con drag & drop
Horarios de atención por día de la semana
Configuración de impresora térmica (red/USB/Bluetooth, papel 58mm/80mm)
Gestión de usuarios del sistema con roles y contraseñas


🔐 Sistema de autenticación y permisos

Autenticación con Supabase Auth
Tabla app_users vinculada a auth.users con roles de aplicación
Permisos por módulo basados en base de datos (role_permissions)
El sidebar filtra dinámicamente las secciones según el rol del usuario autenticado
Administrador tiene acceso total; los demás roles solo ven lo permitido
Creación de usuarios vía Supabase Edge Function con Service Role (seguro)


🗄️ Estructura de base de datos (Supabase)
Las migraciones están en supabase/migrations/ e incluyen:
MigraciónContenidorestaurant_schemaTablas base: mesas, órdenes, items, platillosinventory_and_table_mergeIngredientes, movimientos de stock, merge groupsrecipes_equivalences_roles_salaryRecetas, equivalencias de unidades, nóminaauth_users_and_rolesUsuarios de app, roles, permisos por páginagastos_depreciacionesGastos recurrentes y activos depreciablesprinter_permissions_sysconfigConfig de impresora y system_configkitchen_layout_cocineroEstado KDS, layout de mesas, rol cocinero
Tablas principales
restaurant_tables · orders · order_items · dishes · dish_recipes · ingredients · stock_movements · unit_equivalences · employees · app_users · role_permissions · gastos_recurrentes · depreciaciones · system_config · printer_configs

🚀 Instalación y configuración
Prerrequisitos

Node.js 18+
Cuenta en Supabase

1. Clonar el repositorio
bashgit clone https://github.com/CarlosVillasenorHdez/sistemarestaurante.git
cd sistemarestaurante
2. Instalar dependencias
bashnpm install
3. Configurar variables de entorno
Crea un archivo .env.local en la raíz del proyecto:
envNEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
4. Aplicar migraciones de base de datos
bash# Con Supabase CLI
supabase db push

# O ejecuta manualmente cada archivo en supabase/migrations/ desde el SQL Editor de Supabase
5. Iniciar el servidor de desarrollo
bashnpm run dev
Accede a http://localhost:4028

📁 Estructura del proyecto
sistemarestaurante/
├── public/                        # Assets estáticos
├── src/
│   ├── app/
│   │   ├── cocina/                # KDS — Módulo de cocina
│   │   ├── configuracion/         # Configuración del sistema
│   │   ├── dashboard/             # Dashboard con KPIs y gráficas
│   │   ├── gastos/                # Gastos recurrentes y depreciaciones
│   │   ├── inventario/            # Control de inventario
│   │   ├── login/                 # Autenticación
│   │   ├── menu/                  # Gestión del menú
│   │   ├── orders-management/     # Administración de órdenes
│   │   ├── personal/              # Gestión de empleados
│   │   ├── pos-punto-de-venta/    # Punto de venta
│   │   └── reportes/              # Reportes y análisis
│   ├── components/
│   │   ├── ui/                    # Componentes reutilizables
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx            # Navegación con permisos por rol
│   │   └── Topbar.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx        # Contexto de autenticación y gestión de usuarios
│   └── lib/
│       └── supabase/              # Clientes Supabase (server/client)
├── supabase/
│   ├── functions/                 # Edge Functions (create-user, update-password)
│   └── migrations/                # Migraciones SQL de la base de datos
├── next.config.mjs
├── tailwind.config.js
└── package.json

📦 Scripts disponibles
ComandoDescripciónnpm run devServidor de desarrollo en puerto 4028npm run buildBuild de producciónnpm run serveServidor de producciónnpm run lintVerificar código con ESLintnpm run lint:fixCorregir errores de ESLintnpm run formatFormatear código con Prettiernpm run type-checkVerificar tipos TypeScript

🧰 Stack tecnológico
TecnologíaVersiónUsoNext.js15.1Framework principal (App Router)React19.0UITypeScript5.xTipado estáticoSupabase2.49Base de datos, Auth, Realtime, Edge FunctionsTailwind CSS3.4EstilosRecharts2.15Gráficas y visualizacionesLucide React0.577IconografíaReact Hook Form7.71FormulariosSonner1.7Notificaciones (toasts)

🔜 Próximas funcionalidades

 Facturación electrónica CFDI 4.0 (SAT México)
 Gestión multi-sucursal con panel centralizado
 Módulo de reservaciones con calendario
 Integración con plataformas de delivery (Uber Eats, Rappi)
 App móvil para meseros (PWA)
 Programa de lealtad / puntos
 Landing page pública con planes y precios


🏗️ Construido con

Rocket.new — Plataforma de desarrollo asistido por IA
Next.js
Supabase
