-- ─── ENUMS ───────────────────────────────────────────────────────────────────

DROP TYPE IF EXISTS public.dish_category CASCADE;
CREATE TYPE public.dish_category AS ENUM ('Entradas','Platos Fuertes','Postres','Bebidas','Extras');

DROP TYPE IF EXISTS public.ingredient_category CASCADE;
CREATE TYPE public.ingredient_category AS ENUM ('Carnes','Verduras','Lácteos','Bebidas','Abarrotes','Especias');

DROP TYPE IF EXISTS public.ingredient_unit CASCADE;
CREATE TYPE public.ingredient_unit AS ENUM ('kg','lt','pz','g','ml','caja');

DROP TYPE IF EXISTS public.employee_role CASCADE;
CREATE TYPE public.employee_role AS ENUM ('Administrador','Gerente','Cajero','Mesero','Cocinero','Ayudante de Cocina','Repartidor');

DROP TYPE IF EXISTS public.employee_status CASCADE;
CREATE TYPE public.employee_status AS ENUM ('activo','inactivo');

DROP TYPE IF EXISTS public.table_status CASCADE;
CREATE TYPE public.table_status AS ENUM ('libre','ocupada','espera');

DROP TYPE IF EXISTS public.order_status CASCADE;
CREATE TYPE public.order_status AS ENUM ('abierta','preparacion','lista','cerrada','cancelada');

DROP TYPE IF EXISTS public.payment_method CASCADE;
CREATE TYPE public.payment_method AS ENUM ('efectivo','tarjeta');

-- ─── TABLES ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category public.dish_category NOT NULL DEFAULT 'Entradas',
  available BOOLEAN NOT NULL DEFAULT true,
  image TEXT,
  image_alt TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🍽️',
  popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.ingredient_category NOT NULL DEFAULT 'Abarrotes',
  stock NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit public.ingredient_unit NOT NULL DEFAULT 'kg',
  min_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  supplier TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role public.employee_role NOT NULL DEFAULT 'Mesero',
  phone TEXT NOT NULL DEFAULT '',
  hire_date DATE,
  status public.employee_status NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status public.table_status NOT NULL DEFAULT 'libre',
  current_order_id TEXT,
  waiter TEXT,
  opened_at TEXT,
  item_count INTEGER,
  partial_total NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  mesa TEXT NOT NULL,
  mesa_num INTEGER NOT NULL DEFAULT 0,
  mesero TEXT NOT NULL DEFAULT '',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  iva NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'abierta',
  pay_method public.payment_method,
  opened_at TEXT NOT NULL DEFAULT '',
  closed_at TEXT,
  duration_min INTEGER,
  branch TEXT NOT NULL DEFAULT 'Sucursal Centro',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL DEFAULT '🍽️',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_dishes_category ON public.dishes(category);
CREATE INDEX IF NOT EXISTS idx_dishes_available ON public.dishes(available);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON public.ingredients(category);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON public.restaurant_tables(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_access_dishes" ON public.dishes;
CREATE POLICY "open_access_dishes" ON public.dishes FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_ingredients" ON public.ingredients;
CREATE POLICY "open_access_ingredients" ON public.ingredients FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_employees" ON public.employees;
CREATE POLICY "open_access_employees" ON public.employees FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "open_access_restaurant_tables" ON public.restaurant_tables FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_orders" ON public.orders;
CREATE POLICY "open_access_orders" ON public.orders FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_order_items" ON public.order_items;
CREATE POLICY "open_access_order_items" ON public.order_items FOR ALL TO public USING (true) WITH CHECK (true);

-- ─── MOCK DATA ────────────────────────────────────────────────────────────────

DO $$
BEGIN

-- Dishes
INSERT INTO public.dishes (name, description, price, category, available, emoji, popular) VALUES
  ('Guacamole con Totopos','Aguacate fresco con jitomate, cebolla, cilantro y chile serrano. Acompañado de totopos artesanales.',89,'Entradas',true,'🥑',true),
  ('Sopa de Lima','Caldo de pollo con tiras de tortilla, lima, pollo deshebrado y chile habanero.',75,'Entradas',true,'🍲',false),
  ('Elotes Asados','Elote a la parrilla con mayonesa, queso cotija, chile piquín y limón.',65,'Entradas',false,'🌽',false),
  ('Quesadilla de Flor de Calabaza','Flor de calabaza, quesillo, epazote.',95,'Entradas',true,'🧀',false),
  ('Tacos de Res (3 pzas)','Tortillas de maíz con carne de res al pastor, cebolla, cilantro y salsa verde.',145,'Platos Fuertes',true,'🌮',true),
  ('Mole Negro con Pollo','Pollo en salsa de mole negro oaxaqueño con más de 30 ingredientes. Servido con arroz y frijoles.',175,'Platos Fuertes',true,'🍗',false),
  ('Birria de Res','Caldo de res con chile guajillo, ancho y especias. Servido con consomé, cebolla y cilantro.',165,'Platos Fuertes',true,'🥣',true),
  ('Pozole Rojo','Caldo de maíz cacahuazintle con carne de cerdo, chile guajillo y tostadas.',155,'Platos Fuertes',true,'🍜',true),
  ('Enchiladas Verdes','Pollo deshebrado, salsa verde, crema, queso.',135,'Platos Fuertes',true,'🫔',false),
  ('Pescado a la Veracruzana','Huachinango, jitomate, aceitunas, alcaparras.',195,'Platos Fuertes',true,'🐠',false),
  ('Flan Napolitano','Flan cremoso de vainilla con caramelo dorado y crema batida.',70,'Postres',true,'🍮',false),
  ('Churros con Cajeta','Churros crujientes espolvoreados con azúcar y canela, acompañados de cajeta de cabra.',75,'Postres',true,'🍩',false),
  ('Pastel de Tres Leches','Bizcocho esponjoso empapado en tres tipos de leche, cubierto con crema batida y fresas.',85,'Postres',true,'🍰',true),
  ('Agua de Jamaica','Agua fresca de flor de jamaica con azúcar de caña. Servida en jarra de 500 ml.',35,'Bebidas',true,'🫙',false),
  ('Horchata','Agua de arroz con canela, vainilla y leche condensada. Servida fría.',35,'Bebidas',true,'🥛',false),
  ('Margarita Clásica','Tequila blanco, triple sec, jugo de limón y sal en el borde. Servida en copa escarachada.',95,'Bebidas',true,'🍹',true),
  ('Cerveza Artesanal','Cerveza artesanal local de temporada. Consulta disponibilidad con el mesero.',75,'Bebidas',true,'🍺',false),
  ('Café de Olla','Café negro con canela y piloncillo.',45,'Bebidas',true,'☕',false),
  ('Salsa Roja Extra','Porción extra de salsa roja de chile de árbol tatemado.',15,'Extras',true,'🌶️',false),
  ('Tortillas de Maíz (5 pzas)','Tortillas de maíz azul hechas a mano, recién salidas del comal.',20,'Extras',true,'🫓',false),
  ('Arroz y Frijoles','Guarnición de arroz y frijoles negros.',40,'Extras',true,'🍚',false)
ON CONFLICT (id) DO NOTHING;

-- Ingredients
INSERT INTO public.ingredients (name, category, stock, unit, min_stock, cost, supplier) VALUES
  ('Carne de Res','Carnes',8,'kg',10,180,'Carnicería El Toro'),
  ('Pollo Entero','Carnes',15,'kg',8,95,'Avícola San Juan'),
  ('Chorizo','Carnes',3,'kg',5,120,'Carnicería El Toro'),
  ('Aguacate','Verduras',25,'pz',20,12,'Mercado Central'),
  ('Jitomate','Verduras',4,'kg',6,28,'Mercado Central'),
  ('Cebolla Blanca','Verduras',10,'kg',5,18,'Mercado Central'),
  ('Chile Serrano','Verduras',2,'kg',3,45,'Mercado Central'),
  ('Cilantro','Verduras',1.5,'kg',2,35,'Mercado Central'),
  ('Queso Oaxaca','Lácteos',6,'kg',4,145,'Lácteos La Vaca'),
  ('Crema Ácida','Lácteos',8,'lt',5,55,'Lácteos La Vaca'),
  ('Leche Entera','Lácteos',3,'lt',10,22,'Lácteos La Vaca'),
  ('Agua Mineral 600ml','Bebidas',48,'pz',24,8,'Distribuidora Norte'),
  ('Refresco 355ml','Bebidas',12,'pz',24,12,'Distribuidora Norte'),
  ('Cerveza Clara','Bebidas',36,'pz',24,18,'Distribuidora Norte'),
  ('Tortillas de Maíz','Abarrotes',5,'kg',8,20,'Tortillería Lupita'),
  ('Aceite Vegetal','Abarrotes',4,'lt',3,48,'Abarrotes Don Pepe'),
  ('Arroz Blanco','Abarrotes',12,'kg',5,22,'Abarrotes Don Pepe'),
  ('Frijol Negro','Abarrotes',2,'kg',5,30,'Abarrotes Don Pepe'),
  ('Comino Molido','Especias',0.3,'kg',0.5,180,'Especias del Sur'),
  ('Chile Ancho Seco','Especias',0.8,'kg',0.5,220,'Especias del Sur')
ON CONFLICT (id) DO NOTHING;

-- Employees
INSERT INTO public.employees (name, role, phone, hire_date, status) VALUES
  ('Carlos Mendoza','Administrador','55 1234 5678','2019-03-15','activo'),
  ('Sofía Ramírez','Gerente','55 2345 6789','2020-06-01','activo'),
  ('Luis Torres','Cajero','55 3456 7890','2021-01-10','activo'),
  ('María García','Mesero','55 4567 8901','2021-04-20','activo'),
  ('Javier López','Mesero','55 5678 9012','2022-02-14','activo'),
  ('Ana Hernández','Cocinero','55 6789 0123','2020-09-05','activo'),
  ('Roberto Díaz','Cocinero','55 7890 1234','2021-11-22','activo'),
  ('Patricia Flores','Ayudante de Cocina','55 8901 2345','2022-07-18','activo'),
  ('Miguel Ángel Ruiz','Ayudante de Cocina','55 9012 3456','2023-01-09','inactivo'),
  ('Fernanda Castro','Mesero','55 0123 4567','2022-11-30','activo'),
  ('Diego Morales','Repartidor','55 1122 3344','2023-03-12','activo'),
  ('Valeria Ortiz','Cajero','55 2233 4455','2023-06-01','inactivo')
ON CONFLICT (id) DO NOTHING;

-- Restaurant Tables
INSERT INTO public.restaurant_tables (number, name, capacity, status, current_order_id, waiter, opened_at, item_count, partial_total) VALUES
  (1,'Mesa 1',4,'libre',null,null,null,null,null),
  (2,'Mesa 2',2,'ocupada','ORD-1060','Ana García','15:10',3,298),
  (3,'Mesa 3',6,'ocupada','ORD-1058','Sofía Ramírez','15:42',4,486),
  (4,'Mesa 4',4,'libre',null,null,null,null,null),
  (5,'Mesa 5',4,'espera',null,'Sofía Ramírez','15:51',null,null),
  (6,'Mesa 6',8,'ocupada','ORD-1054','Sofía Ramírez','15:51',2,185),
  (7,'Mesa 7',4,'ocupada','ORD-1059','Luis Hernández','15:22',5,620),
  (8,'Mesa 8',2,'libre',null,null,null,null,null),
  (9,'Mesa 9',4,'ocupada','ORD-1057','Diego Torres','15:38',6,712),
  (10,'Mesa 10',6,'libre',null,null,null,null,null),
  (11,'Mesa 11',4,'espera',null,null,'15:58',null,null),
  (12,'Mesa 12',4,'libre',null,null,null,null,null),
  (13,'Mesa 13',8,'ocupada','ORD-1061','Diego Torres','16:02',7,890),
  (14,'Mesa 14',4,'libre',null,null,null,null,null),
  (15,'Mesa 15',2,'libre',null,null,null,null,null),
  (16,'Mesa 16 (Terraza)',6,'ocupada','ORD-1062','Ana García','15:55',4,540)
ON CONFLICT (number) DO NOTHING;

-- Orders
INSERT INTO public.orders (id, mesa, mesa_num, mesero, subtotal, iva, discount, total, status, pay_method, opened_at, closed_at, duration_min, branch, notes) VALUES
  ('ORD-1063','Mesa 3',3,'Sofía Ramírez',449,71.84,0,520.84,'abierta',null,'16:02',null,null,'Sucursal Centro',null),
  ('ORD-1062','Mesa 16 (Terraza)',16,'Ana García',575,92,0,667,'preparacion',null,'15:55',null,null,'Sucursal Centro',null),
  ('ORD-1061','Mesa 13',13,'Diego Torres',875,140,0,1015,'abierta',null,'15:48',null,null,'Sucursal Centro',null),
  ('ORD-1060','Mesa 2',2,'Ana García',340,54.4,0,394.4,'lista',null,'15:30',null,null,'Sucursal Centro',null),
  ('ORD-1059','Mesa 7',7,'Luis Hernández',834,133.44,0,967.44,'abierta',null,'15:22',null,null,'Sucursal Centro',null),
  ('ORD-1058','Mesa 3',3,'Sofía Ramírez',535,85.6,0,620.6,'cerrada','tarjeta','14:50','15:28',38,'Sucursal Centro',null),
  ('ORD-1057','Mesa 9',9,'Diego Torres',810,129.6,50,889.6,'cerrada','efectivo','14:35','15:18',43,'Sucursal Centro',null),
  ('ORD-1056','Mesa 1',1,'Ana García',420,67.2,0,487.2,'cerrada','tarjeta','14:10','14:52',42,'Sucursal Centro',null),
  ('ORD-1055','Mesa 14',14,'Luis Hernández',1388,222.08,100,1510.08,'cerrada','efectivo','13:45','14:38',53,'Sucursal Centro',null),
  ('ORD-1054','Mesa 6',6,'Sofía Ramírez',300,48,0,348,'cerrada','tarjeta','13:20','13:58',38,'Sucursal Centro',null),
  ('ORD-1053','Mesa 11',11,'Diego Torres',700,112,0,812,'cancelada',null,'13:05','13:15',10,'Sucursal Centro','Cliente se retiró antes de ser atendido'),
  ('ORD-1052','Mesa 8',8,'Ana García',844,135.04,0,979.04,'cerrada','tarjeta','12:40','13:28',48,'Sucursal Centro',null),
  ('ORD-1051','Mesa 5',5,'Luis Hernández',690,110.4,69,731.4,'cerrada','efectivo','12:15','13:02',47,'Sucursal Centro',null),
  ('ORD-1050','Mesa 10',10,'Sofía Ramírez',365,58.4,0,423.4,'cancelada',null,'11:50','11:58',8,'Sucursal Centro','Error al registrar la orden, platillo no disponible')
ON CONFLICT (id) DO NOTHING;

-- Order Items
INSERT INTO public.order_items (order_id, name, qty, price, emoji) VALUES
  ('ORD-1063','Tacos de Res (3 pzas)',2,145,'🌮'),
  ('ORD-1063','Agua de Jamaica',2,35,'🫙'),
  ('ORD-1063','Guacamole con Totopos',1,89,'🥑'),
  ('ORD-1062','Pozole Rojo',2,155,'🍜'),
  ('ORD-1062','Margarita Clásica',2,95,'🍹'),
  ('ORD-1062','Churros con Cajeta',1,75,'🍩'),
  ('ORD-1061','Birria de Res',2,165,'🥣'),
  ('ORD-1061','Enchiladas Verdes',2,135,'🫔'),
  ('ORD-1061','Horchata',3,35,'🥛'),
  ('ORD-1061','Pastel de Tres Leches',2,85,'🍰'),
  ('ORD-1060','Sopa de Lima',1,75,'🍲'),
  ('ORD-1060','Mole Negro con Pollo',1,175,'🍗'),
  ('ORD-1060','Café de Olla',2,45,'☕'),
  ('ORD-1059','Guacamole con Totopos',1,89,'🥑'),
  ('ORD-1059','Tacos de Res (3 pzas)',2,145,'🌮'),
  ('ORD-1059','Pescado a la Veracruzana',1,195,'🐠'),
  ('ORD-1059','Margarita Clásica',2,95,'🍹'),
  ('ORD-1059','Flan Napolitano',1,70,'🍮'),
  ('ORD-1058','Elotes Asados',2,65,'🌽'),
  ('ORD-1058','Enchiladas Verdes',1,135,'🫔'),
  ('ORD-1058','Cerveza Artesanal',3,75,'🍺'),
  ('ORD-1058','Churros con Cajeta',1,75,'🍩'),
  ('ORD-1057','Pozole Rojo',3,155,'🍜'),
  ('ORD-1057','Quesadilla de Flor de Calabaza',2,95,'🧀'),
  ('ORD-1057','Agua de Jamaica',3,35,'🫙'),
  ('ORD-1057','Pastel de Tres Leches',2,85,'🍰'),
  ('ORD-1056','Mole Negro con Pollo',2,175,'🍗'),
  ('ORD-1056','Horchata',2,35,'🥛'),
  ('ORD-1055','Birria de Res',3,165,'🥣'),
  ('ORD-1055','Tacos de Res (3 pzas)',2,145,'🌮'),
  ('ORD-1055','Margarita Clásica',4,95,'🍹'),
  ('ORD-1055','Guacamole con Totopos',2,89,'🥑'),
  ('ORD-1055','Pastel de Tres Leches',3,85,'🍰'),
  ('ORD-1054','Sopa de Lima',2,75,'🍲'),
  ('ORD-1054','Cerveza Artesanal',2,75,'🍺'),
  ('ORD-1053','Enchiladas Verdes',2,135,'🫔'),
  ('ORD-1053','Pozole Rojo',1,155,'🍜'),
  ('ORD-1053','Café de Olla',3,45,'☕'),
  ('ORD-1053','Flan Napolitano',2,70,'🍮'),
  ('ORD-1052','Pescado a la Veracruzana',2,195,'🐠'),
  ('ORD-1052','Guacamole con Totopos',1,89,'🥑'),
  ('ORD-1052','Margarita Clásica',2,95,'🍹'),
  ('ORD-1052','Pastel de Tres Leches',2,85,'🍰'),
  ('ORD-1051','Tacos de Res (3 pzas)',3,145,'🌮'),
  ('ORD-1051','Horchata',3,35,'🥛'),
  ('ORD-1051','Churros con Cajeta',2,75,'🍩'),
  ('ORD-1050','Birria de Res',1,165,'🥣'),
  ('ORD-1050','Elotes Asados',2,65,'🌽'),
  ('ORD-1050','Agua de Jamaica',2,35,'🫙')
ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
