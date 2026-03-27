-- ─────────────────────────────────────────────────────────────────────────────
-- DUMMY SEED DATA — Full system test data
-- Covers: dishes, ingredients, recipes, unit_equivalences, employees,
--         restaurant_tables, orders, order_items, stock_movements,
--         loyalty_customers, reservations, gastos_recurrentes, depreciaciones
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  -- ── Ingredient UUIDs ──────────────────────────────────────────────────────
  ing_res       UUID := gen_random_uuid();  -- Carne de Res
  ing_pol       UUID := gen_random_uuid();  -- Pechuga de Pollo
  ing_cer_pue   UUID := gen_random_uuid();  -- Carne de Cerdo
  ing_cho       UUID := gen_random_uuid();  -- Chorizo
  ing_cam       UUID := gen_random_uuid();  -- Camarón
  ing_agu       UUID := gen_random_uuid();  -- Aguacate
  ing_jit       UUID := gen_random_uuid();  -- Jitomate
  ing_ceb       UUID := gen_random_uuid();  -- Cebolla Blanca
  ing_chi_ser   UUID := gen_random_uuid();  -- Chile Serrano
  ing_chi_anc   UUID := gen_random_uuid();  -- Chile Ancho Seco
  ing_chi_gua   UUID := gen_random_uuid();  -- Chile Guajillo
  ing_chi_hab   UUID := gen_random_uuid();  -- Chile Habanero
  ing_cil       UUID := gen_random_uuid();  -- Cilantro
  ing_lim       UUID := gen_random_uuid();  -- Limón
  ing_ajo       UUID := gen_random_uuid();  -- Ajo
  ing_epa       UUID := gen_random_uuid();  -- Epazote
  ing_que_oax   UUID := gen_random_uuid();  -- Queso Oaxaca
  ing_que_cot   UUID := gen_random_uuid();  -- Queso Cotija
  ing_cre       UUID := gen_random_uuid();  -- Crema Ácida
  ing_man       UUID := gen_random_uuid();  -- Mantequilla
  ing_lec       UUID := gen_random_uuid();  -- Leche Entera
  ing_hue       UUID := gen_random_uuid();  -- Huevo
  ing_tor       UUID := gen_random_uuid();  -- Tortillas de Maíz
  ing_tot       UUID := gen_random_uuid();  -- Totopos
  ing_arr       UUID := gen_random_uuid();  -- Arroz Blanco
  ing_fri       UUID := gen_random_uuid();  -- Frijol Negro
  ing_ace       UUID := gen_random_uuid();  -- Aceite Vegetal
  ing_azu       UUID := gen_random_uuid();  -- Azúcar
  ing_can       UUID := gen_random_uuid();  -- Canela
  ing_vai       UUID := gen_random_uuid();  -- Vainilla
  ing_com       UUID := gen_random_uuid();  -- Comino Molido
  ing_ore       UUID := gen_random_uuid();  -- Orégano
  ing_sal       UUID := gen_random_uuid();  -- Sal de Mar
  ing_mai       UUID := gen_random_uuid();  -- Maíz Cacahuazintle
  ing_flo       UUID := gen_random_uuid();  -- Flor de Calabaza
  ing_elo       UUID := gen_random_uuid();  -- Elote
  ing_may       UUID := gen_random_uuid();  -- Mayonesa
  ing_tec       UUID := gen_random_uuid();  -- Tequila Blanco
  ing_tri       UUID := gen_random_uuid();  -- Triple Sec
  ing_agu_min   UUID := gen_random_uuid();  -- Agua Mineral 600ml
  ing_ref       UUID := gen_random_uuid();  -- Refresco 355ml
  ing_cer_cla   UUID := gen_random_uuid();  -- Cerveza Clara
  ing_jama      UUID := gen_random_uuid();  -- Flor de Jamaica
  ing_arr_beb   UUID := gen_random_uuid();  -- Arroz para Horchata
  ing_cafe      UUID := gen_random_uuid();  -- Café Molido
  ing_pil       UUID := gen_random_uuid();  -- Piloncillo
  ing_fre       UUID := gen_random_uuid();  -- Fresas
  ing_caj       UUID := gen_random_uuid();  -- Cajeta

  -- ── Dish UUIDs ────────────────────────────────────────────────────────────
  dish_guac     UUID := gen_random_uuid();  -- Guacamole con Totopos
  dish_sopa     UUID := gen_random_uuid();  -- Sopa de Lima
  dish_elo      UUID := gen_random_uuid();  -- Elotes Asados
  dish_quesad   UUID := gen_random_uuid();  -- Quesadilla de Flor de Calabaza
  dish_tacos    UUID := gen_random_uuid();  -- Tacos de Res
  dish_mole     UUID := gen_random_uuid();  -- Mole Negro con Pollo
  dish_birria   UUID := gen_random_uuid();  -- Birria de Res
  dish_pozole   UUID := gen_random_uuid();  -- Pozole Rojo
  dish_ench     UUID := gen_random_uuid();  -- Enchiladas Verdes
  dish_cam_p    UUID := gen_random_uuid();  -- Camarones al Ajillo
  dish_flan     UUID := gen_random_uuid();  -- Flan Napolitano
  dish_chur     UUID := gen_random_uuid();  -- Churros con Cajeta
  dish_tres     UUID := gen_random_uuid();  -- Pastel de Tres Leches
  dish_jama     UUID := gen_random_uuid();  -- Agua de Jamaica
  dish_hor      UUID := gen_random_uuid();  -- Horchata
  dish_marg     UUID := gen_random_uuid();  -- Margarita Clásica
  dish_cerv     UUID := gen_random_uuid();  -- Cerveza Artesanal
  dish_cafe     UUID := gen_random_uuid();  -- Café de Olla
  dish_sal_ext  UUID := gen_random_uuid();  -- Salsa Roja Extra
  dish_tor_ext  UUID := gen_random_uuid();  -- Tortillas de Maíz (5 pzas)
  dish_arr_fri  UUID := gen_random_uuid();  -- Arroz y Frijoles

  -- ── Employee UUIDs ────────────────────────────────────────────────────────
  emp_admin     UUID := gen_random_uuid();
  emp_gerente   UUID := gen_random_uuid();
  emp_cajero1   UUID := gen_random_uuid();
  emp_cajero2   UUID := gen_random_uuid();
  emp_mes1      UUID := gen_random_uuid();
  emp_mes2      UUID := gen_random_uuid();
  emp_mes3      UUID := gen_random_uuid();
  emp_coc1      UUID := gen_random_uuid();
  emp_coc2      UUID := gen_random_uuid();
  emp_ayu1      UUID := gen_random_uuid();
  emp_ayu2      UUID := gen_random_uuid();
  emp_rep1      UUID := gen_random_uuid();

  -- ── Order IDs (TEXT PK) ───────────────────────────────────────────────────
  ord1  TEXT := 'ORD-2001';
  ord2  TEXT := 'ORD-2002';
  ord3  TEXT := 'ORD-2003';
  ord4  TEXT := 'ORD-2004';
  ord5  TEXT := 'ORD-2005';
  ord6  TEXT := 'ORD-2006';
  ord7  TEXT := 'ORD-2007';
  ord8  TEXT := 'ORD-2008';

  -- ── Loyalty customer UUIDs ────────────────────────────────────────────────
  loy1  UUID := gen_random_uuid();
  loy2  UUID := gen_random_uuid();
  loy3  UUID := gen_random_uuid();

  -- ── Branch UUID ───────────────────────────────────────────────────────────
  branch1 UUID := gen_random_uuid();

  -- ── Table UUIDs (for reservations FK) ────────────────────────────────────
  tbl1_id UUID;
  tbl2_id UUID;

BEGIN

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. BRANCH
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.branches (id, name, address, phone, email, manager_name, is_active)
VALUES (branch1, 'Sucursal Centro', 'Av. Independencia 123, Col. Centro', '55 1000 2000', 'contacto@restaurante.mx', 'Carlos Mendoza', true)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. INGREDIENTS — stock generoso para pruebas
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.ingredients (id, name, category, stock, unit, min_stock, cost, supplier, reorder_point, supplier_phone) VALUES
  (ing_res,     'Carne de Res',          'Carnes',    15,    'kg',   8,    185, 'Carnicería El Toro',    10,  '55 1111 2222'),
  (ing_pol,     'Pechuga de Pollo',      'Carnes',    20,    'kg',   8,    90,  'Avícola San Juan',      10,  '55 3333 4444'),
  (ing_cer_pue, 'Carne de Cerdo',        'Carnes',    12,    'kg',   5,    110, 'Carnicería El Toro',    6,   '55 1111 2222'),
  (ing_cho,     'Chorizo',               'Carnes',    5,     'kg',   3,    125, 'Carnicería El Toro',    4,   '55 1111 2222'),
  (ing_cam,     'Camarón Mediano',        'Carnes',    8,     'kg',   4,    280, 'Mariscos del Golfo',    5,   '55 5555 6666'),
  (ing_agu,     'Aguacate',              'Verduras',  40,    'pz',   20,   13,  'Mercado Central',       25,  '55 7777 8888'),
  (ing_jit,     'Jitomate',              'Verduras',  10,    'kg',   5,    28,  'Mercado Central',       6,   '55 7777 8888'),
  (ing_ceb,     'Cebolla Blanca',        'Verduras',  12,    'kg',   5,    18,  'Mercado Central',       6,   '55 7777 8888'),
  (ing_chi_ser, 'Chile Serrano',         'Verduras',  3,     'kg',   2,    45,  'Mercado Central',       2,   '55 7777 8888'),
  (ing_chi_anc, 'Chile Ancho Seco',      'Especias',  1.5,   'kg',   0.5,  220, 'Especias del Sur',      0.6, '55 3434 5656'),
  (ing_chi_gua, 'Chile Guajillo',        'Especias',  1.2,   'kg',   0.5,  200, 'Especias del Sur',      0.6, '55 3434 5656'),
  (ing_chi_hab, 'Chile Habanero',        'Verduras',  0.8,   'kg',   0.3,  80,  'Mercado Central',       0.4, '55 7777 8888'),
  (ing_cil,     'Cilantro',              'Verduras',  2,     'kg',   1,    35,  'Mercado Central',       1.5, '55 7777 8888'),
  (ing_lim,     'Limón',                 'Verduras',  5,     'kg',   2,    22,  'Mercado Central',       3,   '55 7777 8888'),
  (ing_ajo,     'Ajo',                   'Verduras',  2,     'kg',   0.5,  60,  'Mercado Central',       1,   '55 7777 8888'),
  (ing_epa,     'Epazote',               'Verduras',  0.5,   'kg',   0.2,  40,  'Mercado Central',       0.3, '55 7777 8888'),
  (ing_que_oax, 'Queso Oaxaca',          'Lácteos',   8,     'kg',   4,    145, 'Lácteos La Vaca',       5,   '55 9999 0000'),
  (ing_que_cot, 'Queso Cotija',          'Lácteos',   3,     'kg',   1,    130, 'Lácteos La Vaca',       2,   '55 9999 0000'),
  (ing_cre,     'Crema Ácida',           'Lácteos',   10,    'lt',   4,    55,  'Lácteos La Vaca',       5,   '55 9999 0000'),
  (ing_man,     'Mantequilla',           'Lácteos',   3,     'kg',   1,    95,  'Lácteos La Vaca',       2,   '55 9999 0000'),
  (ing_lec,     'Leche Entera',          'Lácteos',   15,    'lt',   8,    22,  'Lácteos La Vaca',       10,  '55 9999 0000'),
  (ing_hue,     'Huevo',                 'Lácteos',   60,    'pz',   24,   3,   'Lácteos La Vaca',       30,  '55 9999 0000'),
  (ing_tor,     'Tortillas de Maíz',     'Abarrotes', 8,     'kg',   5,    20,  'Tortillería Lupita',    10,  '55 5656 7878'),
  (ing_tot,     'Totopos',               'Abarrotes', 5,     'kg',   2,    55,  'Abarrotes Don Pepe',    3,   '55 9090 1212'),
  (ing_arr,     'Arroz Blanco',          'Abarrotes', 15,    'kg',   5,    22,  'Abarrotes Don Pepe',    6,   '55 9090 1212'),
  (ing_fri,     'Frijol Negro',          'Abarrotes', 10,    'kg',   4,    30,  'Abarrotes Don Pepe',    5,   '55 9090 1212'),
  (ing_ace,     'Aceite Vegetal',        'Abarrotes', 6,     'lt',   3,    48,  'Abarrotes Don Pepe',    4,   '55 9090 1212'),
  (ing_azu,     'Azúcar',                'Abarrotes', 8,     'kg',   3,    25,  'Abarrotes Don Pepe',    4,   '55 9090 1212'),
  (ing_can,     'Canela en Rama',        'Especias',  0.5,   'kg',   0.2,  160, 'Especias del Sur',      0.3, '55 3434 5656'),
  (ing_vai,     'Vainilla Líquida',      'Especias',  0.5,   'lt',   0.2,  220, 'Especias del Sur',      0.3, '55 3434 5656'),
  (ing_com,     'Comino Molido',         'Especias',  0.6,   'kg',   0.3,  180, 'Especias del Sur',      0.4, '55 3434 5656'),
  (ing_ore,     'Orégano Seco',          'Especias',  0.4,   'kg',   0.2,  150, 'Especias del Sur',      0.3, '55 3434 5656'),
  (ing_sal,     'Sal de Mar',            'Especias',  2,     'kg',   0.5,  30,  'Abarrotes Don Pepe',    1,   '55 9090 1212'),
  (ing_mai,     'Maíz Cacahuazintle',    'Abarrotes', 10,    'kg',   4,    35,  'Abarrotes Don Pepe',    5,   '55 9090 1212'),
  (ing_flo,     'Flor de Calabaza',      'Verduras',  1.5,   'kg',   0.5,  90,  'Mercado Central',       0.8, '55 7777 8888'),
  (ing_elo,     'Elote',                 'Verduras',  20,    'pz',   10,   8,   'Mercado Central',       12,  '55 7777 8888'),
  (ing_may,     'Mayonesa',              'Abarrotes', 3,     'kg',   1,    65,  'Abarrotes Don Pepe',    2,   '55 9090 1212'),
  (ing_tec,     'Tequila Blanco',        'Bebidas',   6,     'lt',   2,    180, 'Distribuidora Norte',   3,   '55 1212 3434'),
  (ing_tri,     'Triple Sec',            'Bebidas',   3,     'lt',   1,    120, 'Distribuidora Norte',   2,   '55 1212 3434'),
  (ing_agu_min, 'Agua Mineral 600ml',    'Bebidas',   72,    'pz',   24,   8,   'Distribuidora Norte',   30,  '55 1212 3434'),
  (ing_ref,     'Refresco 355ml',        'Bebidas',   48,    'pz',   24,   12,  'Distribuidora Norte',   30,  '55 1212 3434'),
  (ing_cer_cla, 'Cerveza Clara',         'Bebidas',   48,    'pz',   24,   18,  'Distribuidora Norte',   30,  '55 1212 3434'),
  (ing_jama,    'Flor de Jamaica',       'Abarrotes', 2,     'kg',   0.5,  85,  'Abarrotes Don Pepe',    1,   '55 9090 1212'),
  (ing_arr_beb, 'Arroz para Horchata',   'Abarrotes', 3,     'kg',   1,    22,  'Abarrotes Don Pepe',    2,   '55 9090 1212'),
  (ing_cafe,    'Café Molido',           'Abarrotes', 2,     'kg',   0.5,  180, 'Abarrotes Don Pepe',    1,   '55 9090 1212'),
  (ing_pil,     'Piloncillo',            'Abarrotes', 3,     'kg',   1,    40,  'Abarrotes Don Pepe',    2,   '55 9090 1212'),
  (ing_fre,     'Fresas',                'Verduras',  3,     'kg',   1,    55,  'Mercado Central',       2,   '55 7777 8888'),
  (ing_caj,     'Cajeta de Cabra',       'Lácteos',   2,     'lt',   0.5,  95,  'Lácteos La Vaca',       1,   '55 9999 0000')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. UNIT EQUIVALENCES — para probar conversiones
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.unit_equivalences (ingredient_id, bulk_unit, bulk_description, sub_unit, sub_unit_description, conversion_factor, notes) VALUES
  (ing_tor,     'kg',   'Kilogramo de tortillas',       'pz',  'Tortilla individual',          20,   'Aprox. 20 tortillas por kg'),
  (ing_agu_min, 'caja', 'Caja de agua mineral',         'pz',  'Botella individual 600ml',     24,   '24 botellas por caja'),
  (ing_ref,     'caja', 'Caja de refresco',             'pz',  'Lata individual 355ml',        24,   '24 latas por caja'),
  (ing_cer_cla, 'caja', 'Caja de cerveza',              'pz',  'Botella individual',           24,   '24 botellas por caja'),
  (ing_hue,     'caja', 'Caja de huevo',                'pz',  'Huevo individual',             30,   '30 piezas por caja'),
  (ing_lec,     'caja', 'Caja de leche (12 litros)',    'lt',  'Litro de leche',               12,   '12 litros por caja'),
  (ing_res,     'kg',   'Kilogramo de carne de res',    'g',   'Gramo de carne',               1000, '1000 g por kg — para recetas en gramos'),
  (ing_pol,     'kg',   'Kilogramo de pechuga',         'g',   'Gramo de pechuga',             1000, '1000 g por kg — para recetas en gramos'),
  (ing_que_oax, 'kg',   'Kilogramo de queso Oaxaca',    'g',   'Gramo de queso',               1000, '1000 g por kg'),
  (ing_tec,     'lt',   'Litro de tequila',             'ml',  'Mililitro de tequila',         1000, '1000 ml por litro'),
  (ing_tri,     'lt',   'Litro de triple sec',          'ml',  'Mililitro de triple sec',      1000, '1000 ml por litro'),
  (ing_tot,     'kg',   'Kilogramo de totopos',         'g',   'Gramo de totopos',             1000, '1000 g por kg'),
  (ing_mai,     'kg',   'Kilogramo de maíz cacahuazintle', 'g', 'Gramo de maíz',              1000, '1000 g por kg'),
  (ing_cafe,    'kg',   'Kilogramo de café molido',     'g',   'Gramo de café',                1000, '1000 g por kg')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DISHES
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.dishes (id, name, description, price, category, available, emoji, popular) VALUES
  (dish_guac,   'Guacamole con Totopos',          'Aguacate fresco con jitomate, cebolla, cilantro y chile serrano. Acompañado de totopos artesanales.',                                    89,  'Entradas',      true,  '🥑',  true),
  (dish_sopa,   'Sopa de Lima',                   'Caldo de pollo con tiras de tortilla, lima, pollo deshebrado y chile habanero.',                                                          75,  'Entradas',      true,  '🍲',  false),
  (dish_elo,    'Elotes Asados',                  'Elote a la parrilla con mayonesa, queso cotija, chile piquín y limón.',                                                                   65,  'Entradas',      true,  '🌽',  false),
  (dish_quesad, 'Quesadilla de Flor de Calabaza', 'Flor de calabaza, quesillo y epazote en tortilla de maíz.',                                                                              95,  'Entradas',      true,  '🧀',  false),
  (dish_tacos,  'Tacos de Res (3 pzas)',           'Tortillas de maíz con carne de res al pastor, cebolla, cilantro y salsa verde.',                                                        145, 'Platos Fuertes', true, '🌮',  true),
  (dish_mole,   'Mole Negro con Pollo',            'Pollo en salsa de mole negro oaxaqueño. Servido con arroz y frijoles.',                                                                 175, 'Platos Fuertes', true, '🍗',  false),
  (dish_birria, 'Birria de Res',                   'Caldo de res con chile guajillo, ancho y especias. Servido con consomé, cebolla y cilantro.',                                           165, 'Platos Fuertes', true, '🥣',  true),
  (dish_pozole, 'Pozole Rojo',                     'Caldo de maíz cacahuazintle con carne de cerdo, chile guajillo y tostadas.',                                                            155, 'Platos Fuertes', true, '🍜',  true),
  (dish_ench,   'Enchiladas Verdes',               'Pollo deshebrado, salsa verde, crema y queso.',                                                                                         135, 'Platos Fuertes', true, '🫔',  false),
  (dish_cam_p,  'Camarones al Ajillo',             'Camarones salteados en mantequilla, ajo, limón y chile serrano. Servidos con arroz.',                                                   195, 'Platos Fuertes', true, '🦐',  true),
  (dish_flan,   'Flan Napolitano',                 'Flan cremoso de vainilla con caramelo dorado y crema batida.',                                                                           70,  'Postres',       true,  '🍮',  false),
  (dish_chur,   'Churros con Cajeta',              'Churros crujientes espolvoreados con azúcar y canela, acompañados de cajeta de cabra.',                                                  75,  'Postres',       true,  '🍩',  false),
  (dish_tres,   'Pastel de Tres Leches',           'Bizcocho esponjoso empapado en tres tipos de leche, cubierto con crema batida y fresas.',                                               85,  'Postres',       true,  '🍰',  true),
  (dish_jama,   'Agua de Jamaica',                 'Agua fresca de flor de jamaica con azúcar de caña. Servida en jarra de 500 ml.',                                                        35,  'Bebidas',       true,  '🫙',  false),
  (dish_hor,    'Horchata',                        'Agua de arroz con canela, vainilla y leche condensada. Servida fría.',                                                                   35,  'Bebidas',       true,  '🥛',  false),
  (dish_marg,   'Margarita Clásica',               'Tequila blanco, triple sec, jugo de limón y sal en el borde. Servida en copa escarachada.',                                             95,  'Bebidas',       true,  '🍹',  true),
  (dish_cerv,   'Cerveza Artesanal',               'Cerveza artesanal local de temporada.',                                                                                                  75,  'Bebidas',       true,  '🍺',  false),
  (dish_cafe,   'Café de Olla',                    'Café negro con canela y piloncillo.',                                                                                                    45,  'Bebidas',       true,  '☕',  false),
  (dish_sal_ext,'Salsa Roja Extra',                'Porción extra de salsa roja de chile de árbol tatemado.',                                                                                15,  'Extras',        true,  '🌶️', false),
  (dish_tor_ext,'Tortillas de Maíz (5 pzas)',      'Tortillas de maíz azul hechas a mano, recién salidas del comal.',                                                                       20,  'Extras',        true,  '🫓',  false),
  (dish_arr_fri,'Arroz y Frijoles',                'Guarnición de arroz blanco y frijoles negros.',                                                                                          40,  'Extras',        true,  '🍚',  false)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DISH RECIPES — ingredientes y cantidades por platillo
--    unit = unidad en que se descuenta del inventario
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.dish_recipes (dish_id, ingredient_id, quantity, unit, notes) VALUES
  -- Guacamole con Totopos
  (dish_guac, ing_agu,     3,      'pz',   '3 aguacates medianos'),
  (dish_guac, ing_jit,     0.1,    'kg',   '1 jitomate mediano'),
  (dish_guac, ing_ceb,     0.05,   'kg',   'Media cebolla'),
  (dish_guac, ing_chi_ser, 0.01,   'kg',   '1 chile serrano'),
  (dish_guac, ing_cil,     0.02,   'kg',   'Manojo pequeño'),
  (dish_guac, ing_lim,     0.05,   'kg',   '1 limón'),
  (dish_guac, ing_sal,     0.005,  'kg',   'Al gusto'),
  (dish_guac, ing_tot,     0.08,   'kg',   'Porción de totopos'),

  -- Sopa de Lima
  (dish_sopa, ing_pol,     0.15,   'kg',   'Pechuga deshebrada'),
  (dish_sopa, ing_ceb,     0.05,   'kg',   'Media cebolla'),
  (dish_sopa, ing_ajo,     0.01,   'kg',   '2 dientes de ajo'),
  (dish_sopa, ing_chi_hab, 0.005,  'kg',   'Chile habanero al gusto'),
  (dish_sopa, ing_lim,     0.08,   'kg',   '2 limas'),
  (dish_sopa, ing_tor,     0.05,   'kg',   'Tiras de tortilla'),
  (dish_sopa, ing_cil,     0.01,   'kg',   'Cilantro al gusto'),
  (dish_sopa, ing_sal,     0.003,  'kg',   'Al gusto'),

  -- Elotes Asados
  (dish_elo, ing_elo,      2,      'pz',   '2 elotes'),
  (dish_elo, ing_may,      0.03,   'kg',   'Mayonesa'),
  (dish_elo, ing_que_cot,  0.04,   'kg',   'Queso cotija rallado'),
  (dish_elo, ing_lim,      0.05,   'kg',   '1 limón'),
  (dish_elo, ing_chi_ser,  0.005,  'kg',   'Chile piquín al gusto'),
  (dish_elo, ing_sal,      0.002,  'kg',   'Al gusto'),

  -- Quesadilla de Flor de Calabaza
  (dish_quesad, ing_tor,   0.1,    'kg',   '2 tortillas grandes'),
  (dish_quesad, ing_flo,   0.08,   'kg',   'Flor de calabaza'),
  (dish_quesad, ing_que_oax, 0.1,  'kg',   'Quesillo'),
  (dish_quesad, ing_epa,   0.01,   'kg',   'Epazote'),
  (dish_quesad, ing_ace,   0.02,   'lt',   'Para dorar'),
  (dish_quesad, ing_sal,   0.002,  'kg',   'Al gusto'),

  -- Tacos de Res (3 pzas)
  (dish_tacos, ing_res,    0.18,   'kg',   '180 g de carne de res'),
  (dish_tacos, ing_tor,    0.15,   'kg',   '3 tortillas (aprox 50g c/u)'),
  (dish_tacos, ing_ceb,    0.04,   'kg',   'Cebolla picada'),
  (dish_tacos, ing_cil,    0.02,   'kg',   'Cilantro'),
  (dish_tacos, ing_chi_ser,0.01,   'kg',   'Chile serrano'),
  (dish_tacos, ing_lim,    0.04,   'kg',   '1 limón'),
  (dish_tacos, ing_sal,    0.003,  'kg',   'Al gusto'),
  (dish_tacos, ing_ace,    0.02,   'lt',   'Para cocinar'),

  -- Mole Negro con Pollo
  (dish_mole, ing_pol,     0.25,   'kg',   'Pieza de pollo'),
  (dish_mole, ing_chi_anc, 0.04,   'kg',   'Chile ancho'),
  (dish_mole, ing_chi_gua, 0.03,   'kg',   'Chile guajillo'),
  (dish_mole, ing_ajo,     0.015,  'kg',   '3 dientes de ajo'),
  (dish_mole, ing_ceb,     0.06,   'kg',   'Media cebolla'),
  (dish_mole, ing_com,     0.005,  'kg',   'Comino'),
  (dish_mole, ing_ore,     0.003,  'kg',   'Orégano'),
  (dish_mole, ing_azu,     0.02,   'kg',   'Azúcar para balancear'),
  (dish_mole, ing_ace,     0.03,   'lt',   'Para freír'),
  (dish_mole, ing_arr,     0.08,   'kg',   'Arroz de guarnición'),
  (dish_mole, ing_fri,     0.06,   'kg',   'Frijoles de guarnición'),
  (dish_mole, ing_sal,     0.005,  'kg',   'Al gusto'),

  -- Birria de Res
  (dish_birria, ing_res,   0.3,    'kg',   'Carne de res para birria'),
  (dish_birria, ing_chi_anc, 0.05, 'kg',   'Chile ancho'),
  (dish_birria, ing_chi_gua, 0.04, 'kg',   'Chile guajillo'),
  (dish_birria, ing_ceb,   0.08,   'kg',   'Cebolla'),
  (dish_birria, ing_ajo,   0.02,   'kg',   'Ajo'),
  (dish_birria, ing_com,   0.005,  'kg',   'Comino'),
  (dish_birria, ing_ore,   0.004,  'kg',   'Orégano'),
  (dish_birria, ing_cil,   0.03,   'kg',   'Cilantro'),
  (dish_birria, ing_lim,   0.06,   'kg',   'Limón'),
  (dish_birria, ing_sal,   0.006,  'kg',   'Al gusto'),
  (dish_birria, ing_tor,   0.1,    'kg',   'Tortillas para acompañar'),

  -- Pozole Rojo
  (dish_pozole, ing_cer_pue, 0.25, 'kg',   'Carne de cerdo'),
  (dish_pozole, ing_mai,   0.15,   'kg',   'Maíz cacahuazintle'),
  (dish_pozole, ing_chi_gua, 0.04, 'kg',   'Chile guajillo'),
  (dish_pozole, ing_chi_anc, 0.03, 'kg',   'Chile ancho'),
  (dish_pozole, ing_ceb,   0.06,   'kg',   'Cebolla'),
  (dish_pozole, ing_ajo,   0.015,  'kg',   'Ajo'),
  (dish_pozole, ing_ore,   0.004,  'kg',   'Orégano'),
  (dish_pozole, ing_sal,   0.006,  'kg',   'Al gusto'),

  -- Enchiladas Verdes
  (dish_ench, ing_pol,     0.2,    'kg',   'Pollo deshebrado'),
  (dish_ench, ing_tor,     0.15,   'kg',   '3 tortillas'),
  (dish_ench, ing_chi_ser, 0.03,   'kg',   'Para salsa verde'),
  (dish_ench, ing_ceb,     0.05,   'kg',   'Cebolla'),
  (dish_ench, ing_ajo,     0.01,   'kg',   'Ajo'),
  (dish_ench, ing_cre,     0.06,   'lt',   'Crema'),
  (dish_ench, ing_que_oax, 0.06,   'kg',   'Queso'),
  (dish_ench, ing_ace,     0.02,   'lt',   'Para freír'),
  (dish_ench, ing_sal,     0.004,  'kg',   'Al gusto'),

  -- Camarones al Ajillo
  (dish_cam_p, ing_cam,    0.2,    'kg',   'Camarones medianos'),
  (dish_cam_p, ing_man,    0.04,   'kg',   'Mantequilla'),
  (dish_cam_p, ing_ajo,    0.02,   'kg',   '4 dientes de ajo'),
  (dish_cam_p, ing_lim,    0.06,   'kg',   '2 limones'),
  (dish_cam_p, ing_chi_ser,0.01,   'kg',   'Chile serrano'),
  (dish_cam_p, ing_arr,    0.08,   'kg',   'Arroz de guarnición'),
  (dish_cam_p, ing_sal,    0.004,  'kg',   'Al gusto'),
  (dish_cam_p, ing_cil,    0.01,   'kg',   'Cilantro'),

  -- Flan Napolitano
  (dish_flan, ing_hue,     4,      'pz',   '4 huevos'),
  (dish_flan, ing_lec,     0.3,    'lt',   'Leche entera'),
  (dish_flan, ing_azu,     0.1,    'kg',   'Azúcar para caramelo y flan'),
  (dish_flan, ing_vai,     0.01,   'lt',   'Vainilla'),
  (dish_flan, ing_cre,     0.05,   'lt',   'Crema para decorar'),

  -- Churros con Cajeta
  (dish_chur, ing_ace,     0.1,    'lt',   'Para freír'),
  (dish_chur, ing_azu,     0.05,   'kg',   'Azúcar para espolvorear'),
  (dish_chur, ing_can,     0.005,  'kg',   'Canela molida'),
  (dish_chur, ing_caj,     0.08,   'lt',   'Cajeta de cabra'),
  (dish_chur, ing_man,     0.03,   'kg',   'Mantequilla para masa'),

  -- Pastel de Tres Leches
  (dish_tres, ing_hue,     6,      'pz',   '6 huevos'),
  (dish_tres, ing_lec,     0.5,    'lt',   'Leche entera'),
  (dish_tres, ing_azu,     0.15,   'kg',   'Azúcar'),
  (dish_tres, ing_vai,     0.01,   'lt',   'Vainilla'),
  (dish_tres, ing_cre,     0.2,    'lt',   'Crema para cubrir'),
  (dish_tres, ing_fre,     0.1,    'kg',   'Fresas para decorar'),
  (dish_tres, ing_man,     0.05,   'kg',   'Mantequilla'),

  -- Agua de Jamaica
  (dish_jama, ing_jama,    0.03,   'kg',   'Flor de jamaica seca'),
  (dish_jama, ing_azu,     0.04,   'kg',   'Azúcar'),

  -- Horchata
  (dish_hor, ing_arr_beb,  0.05,   'kg',   'Arroz remojado'),
  (dish_hor, ing_can,      0.005,  'kg',   'Canela'),
  (dish_hor, ing_vai,      0.005,  'lt',   'Vainilla'),
  (dish_hor, ing_azu,      0.04,   'kg',   'Azúcar'),
  (dish_hor, ing_lec,      0.05,   'lt',   'Leche condensada'),

  -- Margarita Clásica
  (dish_marg, ing_tec,     0.06,   'lt',   '60 ml tequila'),
  (dish_marg, ing_tri,     0.03,   'lt',   '30 ml triple sec'),
  (dish_marg, ing_lim,     0.04,   'kg',   'Jugo de limón'),
  (dish_marg, ing_sal,     0.002,  'kg',   'Sal para el borde'),

  -- Cerveza Artesanal
  (dish_cerv, ing_cer_cla, 1,      'pz',   '1 botella de cerveza'),

  -- Café de Olla
  (dish_cafe, ing_cafe,    0.015,  'kg',   'Café molido'),
  (dish_cafe, ing_can,     0.005,  'kg',   'Canela en rama'),
  (dish_cafe, ing_pil,     0.03,   'kg',   'Piloncillo'),

  -- Salsa Roja Extra
  (dish_sal_ext, ing_chi_ser, 0.02, 'kg',  'Chile serrano tatemado'),
  (dish_sal_ext, ing_jit,   0.05,  'kg',   'Jitomate'),
  (dish_sal_ext, ing_ajo,   0.005, 'kg',   'Ajo'),
  (dish_sal_ext, ing_sal,   0.002, 'kg',   'Sal'),

  -- Tortillas de Maíz (5 pzas)
  (dish_tor_ext, ing_tor,  0.25,   'kg',   '5 tortillas aprox 50g c/u'),

  -- Arroz y Frijoles
  (dish_arr_fri, ing_arr,  0.1,    'kg',   'Arroz blanco'),
  (dish_arr_fri, ing_fri,  0.08,   'kg',   'Frijoles negros'),
  (dish_arr_fri, ing_ace,  0.01,   'lt',   'Aceite'),
  (dish_arr_fri, ing_sal,  0.003,  'kg',   'Sal')
ON CONFLICT (dish_id, ingredient_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. EMPLOYEES
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.employees (id, name, role, app_role, phone, email, pin, hire_date, status, salary, salary_frequency) VALUES
  (emp_admin,   'Carlos Mendoza',       'Administrador',      'admin',          '55 1234 5678', 'carlos@restaurante.mx',    '1234', '2019-03-15', 'activo',   18000, 'mensual'),
  (emp_gerente, 'Sofía Ramírez',        'Gerente',            'gerente',        '55 2345 6789', 'sofia@restaurante.mx',     '2345', '2020-06-01', 'activo',   14000, 'mensual'),
  (emp_cajero1, 'Luis Torres',          'Cajero',             'cajero',         '55 3456 7890', 'luis@restaurante.mx',      '3456', '2021-01-10', 'activo',   9000,  'mensual'),
  (emp_cajero2, 'Valeria Ortiz',        'Cajero',             'cajero',         '55 2233 4455', 'valeria@restaurante.mx',   '4455', '2023-06-01', 'activo',   9000,  'mensual'),
  (emp_mes1,    'María García',         'Mesero',             'mesero',         '55 4567 8901', 'maria@restaurante.mx',     '5678', '2021-04-20', 'activo',   7500,  'mensual'),
  (emp_mes2,    'Javier López',         'Mesero',             'mesero',         '55 5678 9012', 'javier@restaurante.mx',    '6789', '2022-02-14', 'activo',   7500,  'mensual'),
  (emp_mes3,    'Fernanda Castro',      'Mesero',             'mesero',         '55 0123 4567', 'fernanda@restaurante.mx',  '7890', '2022-11-30', 'activo',   7500,  'mensual'),
  (emp_coc1,    'Ana Hernández',        'Cocinero',           'cocinero',       '55 6789 0123', 'ana@restaurante.mx',       '8901', '2020-09-05', 'activo',   11000, 'mensual'),
  (emp_coc2,    'Roberto Díaz',         'Cocinero',           'cocinero',       '55 7890 1234', 'roberto@restaurante.mx',   '9012', '2021-11-22', 'activo',   11000, 'mensual'),
  (emp_ayu1,    'Patricia Flores',      'Ayudante de Cocina', 'ayudante_cocina','55 8901 2345', 'patricia@restaurante.mx',  '0123', '2022-07-18', 'activo',   7000,  'mensual'),
  (emp_ayu2,    'Miguel Ángel Ruiz',    'Ayudante de Cocina', 'ayudante_cocina','55 9012 3456', 'miguel@restaurante.mx',    '1122', '2023-01-09', 'inactivo', 7000,  'mensual'),
  (emp_rep1,    'Diego Morales',        'Repartidor',         'repartidor',     '55 1122 3344', 'diego@restaurante.mx',     '2233', '2023-03-12', 'activo',   7000,  'mensual')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. EMPLOYEE SHIFTS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.employee_shifts (employee_id, day, shift) VALUES
  (emp_coc1, 'Lunes',     'matutino'),
  (emp_coc1, 'Martes',    'matutino'),
  (emp_coc1, 'Miércoles', 'matutino'),
  (emp_coc1, 'Jueves',    'matutino'),
  (emp_coc1, 'Viernes',   'matutino'),
  (emp_coc1, 'Sábado',    'matutino'),
  (emp_coc1, 'Domingo',   'descanso'),
  (emp_coc2, 'Lunes',     'vespertino'),
  (emp_coc2, 'Martes',    'vespertino'),
  (emp_coc2, 'Miércoles', 'vespertino'),
  (emp_coc2, 'Jueves',    'vespertino'),
  (emp_coc2, 'Viernes',   'vespertino'),
  (emp_coc2, 'Sábado',    'descanso'),
  (emp_coc2, 'Domingo',   'vespertino'),
  (emp_mes1, 'Lunes',     'matutino'),
  (emp_mes1, 'Martes',    'matutino'),
  (emp_mes1, 'Miércoles', 'matutino'),
  (emp_mes1, 'Jueves',    'matutino'),
  (emp_mes1, 'Viernes',   'matutino'),
  (emp_mes1, 'Sábado',    'descanso'),
  (emp_mes1, 'Domingo',   'descanso'),
  (emp_mes2, 'Lunes',     'vespertino'),
  (emp_mes2, 'Martes',    'vespertino'),
  (emp_mes2, 'Miércoles', 'vespertino'),
  (emp_mes2, 'Jueves',    'vespertino'),
  (emp_mes2, 'Viernes',   'vespertino'),
  (emp_mes2, 'Sábado',    'vespertino'),
  (emp_mes2, 'Domingo',   'descanso')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RESTAURANT TABLES (16 mesas)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.restaurant_tables (number, name, capacity, status) VALUES
  (1,  'Mesa 1',            4, 'libre'),
  (2,  'Mesa 2',            2, 'libre'),
  (3,  'Mesa 3',            6, 'libre'),
  (4,  'Mesa 4',            4, 'libre'),
  (5,  'Mesa 5',            4, 'libre'),
  (6,  'Mesa 6',            8, 'libre'),
  (7,  'Mesa 7',            4, 'libre'),
  (8,  'Mesa 8',            2, 'libre'),
  (9,  'Mesa 9',            4, 'libre'),
  (10, 'Mesa 10',           6, 'libre'),
  (11, 'Mesa 11',           4, 'libre'),
  (12, 'Mesa 12',           4, 'libre'),
  (13, 'Mesa 13',           8, 'libre'),
  (14, 'Mesa 14',           4, 'libre'),
  (15, 'Mesa 15',           2, 'libre'),
  (16, 'Mesa 16 (Terraza)', 6, 'libre')
ON CONFLICT (number) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ORDERS — mezcla de estados para probar el flujo completo
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.orders (id, mesa, mesa_num, mesero, subtotal, iva, discount, total, status, pay_method, opened_at, closed_at, duration_min, branch, kitchen_status) VALUES
  (ord1, 'Mesa 2',  2,  'María García',   310,  49.6,  0,   359.6,  'abierta',     null,       '13:00', null,    null, 'Sucursal Centro', 'en_edicion'),
  (ord2, 'Mesa 5',  5,  'Javier López',   480,  76.8,  0,   556.8,  'preparacion', null,       '12:45', null,    null, 'Sucursal Centro', 'enviado_cocina'),
  (ord3, 'Mesa 7',  7,  'Fernanda Castro',620,  99.2,  0,   719.2,  'lista',       null,       '12:30', null,    null, 'Sucursal Centro', 'listo'),
  (ord4, 'Mesa 10', 10, 'María García',   870,  139.2, 50,  959.2,  'cerrada',     'tarjeta',  '11:00', '12:10', 70,  'Sucursal Centro', 'listo'),
  (ord5, 'Mesa 3',  3,  'Javier López',   540,  86.4,  0,   626.4,  'cerrada',     'efectivo', '11:30', '12:45', 75,  'Sucursal Centro', 'listo'),
  (ord6, 'Mesa 1',  1,  'Fernanda Castro',290,  46.4,  0,   336.4,  'cerrada',     'tarjeta',  '10:00', '10:55', 55,  'Sucursal Centro', 'listo'),
  (ord7, 'Mesa 6',  6,  'María García',   1050, 168,   100, 1118,   'cerrada',     'efectivo', '09:30', '11:00', 90,  'Sucursal Centro', 'listo'),
  (ord8, 'Mesa 13', 13, 'Javier López',   430,  68.8,  0,   498.8,  'cancelada',   null,       '13:15', null,    null, 'Sucursal Centro', 'en_edicion')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ORDER ITEMS — vinculados a dish_id para que el sistema descuente receta
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.order_items (order_id, dish_id, name, qty, price, emoji) VALUES
  -- ORD-2001 (abierta)
  (ord1, dish_tacos,  'Tacos de Res (3 pzas)',    2, 145, '🌮'),
  (ord1, dish_guac,   'Guacamole con Totopos',    1,  89, '🥑'),
  (ord1, dish_marg,   'Margarita Clásica',        1,  95, '🍹'),

  -- ORD-2002 (preparacion)
  (ord2, dish_mole,   'Mole Negro con Pollo',     2, 175, '🍗'),
  (ord2, dish_arr_fri,'Arroz y Frijoles',         2,  40, '🍚'),
  (ord2, dish_jama,   'Agua de Jamaica',          2,  35, '🫙'),

  -- ORD-2003 (lista)
  (ord3, dish_birria, 'Birria de Res',            2, 165, '🥣'),
  (ord3, dish_pozole, 'Pozole Rojo',              1, 155, '🍜'),
  (ord3, dish_cerv,   'Cerveza Artesanal',        2,  75, '🍺'),
  (ord3, dish_tres,   'Pastel de Tres Leches',    1,  85, '🍰'),

  -- ORD-2004 (cerrada)
  (ord4, dish_cam_p,  'Camarones al Ajillo',      2, 195, '🦐'),
  (ord4, dish_ench,   'Enchiladas Verdes',        2, 135, '🫔'),
  (ord4, dish_sopa,   'Sopa de Lima',             2,  75, '🍲'),
  (ord4, dish_flan,   'Flan Napolitano',          2,  70, '🍮'),
  (ord4, dish_marg,   'Margarita Clásica',        2,  95, '🍹'),

  -- ORD-2005 (cerrada)
  (ord5, dish_tacos,  'Tacos de Res (3 pzas)',    2, 145, '🌮'),
  (ord5, dish_quesad, 'Quesadilla de Flor de Calabaza', 2, 95, '🧀'),
  (ord5, dish_hor,    'Horchata',                 2,  35, '🥛'),
  (ord5, dish_chur,   'Churros con Cajeta',       2,  75, '🍩'),

  -- ORD-2006 (cerrada)
  (ord6, dish_elo,    'Elotes Asados',            2,  65, '🌽'),
  (ord6, dish_birria, 'Birria de Res',            1, 165, '🥣'),
  (ord6, dish_cafe,   'Café de Olla',             1,  45, '☕'),

  -- ORD-2007 (cerrada)
  (ord7, dish_mole,   'Mole Negro con Pollo',     3, 175, '🍗'),
  (ord7, dish_cam_p,  'Camarones al Ajillo',      2, 195, '🦐'),
  (ord7, dish_arr_fri,'Arroz y Frijoles',         3,  40, '🍚'),
  (ord7, dish_cerv,   'Cerveza Artesanal',        4,  75, '🍺'),

  -- ORD-2008 (cancelada — sin descuento de inventario)
  (ord8, dish_pozole, 'Pozole Rojo',              2, 155, '🍜'),
  (ord8, dish_jama,   'Agua de Jamaica',          2,  35, '🫙')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. STOCK MOVEMENTS — entradas iniciales + salidas por órdenes cerradas
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.stock_movements (ingredient_id, movement_type, quantity, previous_stock, new_stock, reason, created_by, created_at) VALUES
  -- Entradas iniciales de inventario
  (ing_res,     'entrada', 20,   0,    20,   'Compra semanal — proveedor Carnicería El Toro',  'Carlos Mendoza',  NOW() - INTERVAL '7 days'),
  (ing_pol,     'entrada', 25,   0,    25,   'Compra semanal — Avícola San Juan',              'Carlos Mendoza',  NOW() - INTERVAL '7 days'),
  (ing_cer_pue, 'entrada', 15,   0,    15,   'Compra semanal — Carnicería El Toro',            'Carlos Mendoza',  NOW() - INTERVAL '7 days'),
  (ing_cam,     'entrada', 10,   0,    10,   'Compra — Mariscos del Golfo',                    'Sofía Ramírez',   NOW() - INTERVAL '5 days'),
  (ing_agu,     'entrada', 60,   0,    60,   'Compra en Mercado Central',                      'Sofía Ramírez',   NOW() - INTERVAL '5 days'),
  (ing_jit,     'entrada', 15,   0,    15,   'Compra en Mercado Central',                      'Sofía Ramírez',   NOW() - INTERVAL '5 days'),
  (ing_tor,     'entrada', 12,   0,    12,   'Compra en Tortillería Lupita',                   'Carlos Mendoza',  NOW() - INTERVAL '4 days'),
  (ing_arr,     'entrada', 20,   0,    20,   'Compra — Abarrotes Don Pepe',                    'Carlos Mendoza',  NOW() - INTERVAL '6 days'),
  (ing_fri,     'entrada', 15,   0,    15,   'Compra — Abarrotes Don Pepe',                    'Carlos Mendoza',  NOW() - INTERVAL '6 days'),
  (ing_que_oax, 'entrada', 10,   0,    10,   'Compra — Lácteos La Vaca',                       'Sofía Ramírez',   NOW() - INTERVAL '4 days'),
  (ing_lec,     'entrada', 20,   0,    20,   'Compra — Lácteos La Vaca',                       'Sofía Ramírez',   NOW() - INTERVAL '4 days'),
  (ing_hue,     'entrada', 90,   0,    90,   'Compra — Lácteos La Vaca (3 cajas)',             'Sofía Ramírez',   NOW() - INTERVAL '4 days'),
  (ing_agu_min, 'entrada', 96,   0,    96,   'Compra — Distribuidora Norte (4 cajas)',         'Carlos Mendoza',  NOW() - INTERVAL '3 days'),
  (ing_cer_cla, 'entrada', 72,   0,    72,   'Compra — Distribuidora Norte (3 cajas)',         'Carlos Mendoza',  NOW() - INTERVAL '3 days'),
  (ing_tec,     'entrada', 8,    0,    8,    'Compra — Distribuidora Norte',                   'Carlos Mendoza',  NOW() - INTERVAL '3 days'),

  -- Salidas por consumo en órdenes cerradas (ORD-2004, ORD-2005, ORD-2006, ORD-2007)
  -- ORD-2004: 2x Camarones al Ajillo, 2x Enchiladas Verdes, 2x Sopa de Lima, 2x Flan, 2x Margarita
  (ing_cam,     'salida',  0.4,  10,   9.6,  'Consumo — ORD-2004 Camarones al Ajillo x2',     'Sistema',         NOW() - INTERVAL '2 hours'),
  (ing_pol,     'salida',  0.4,  25,   24.6, 'Consumo — ORD-2004 Enchiladas Verdes x2',       'Sistema',         NOW() - INTERVAL '2 hours'),
  (ing_hue,     'salida',  8,    90,   82,   'Consumo — ORD-2004 Flan Napolitano x2',         'Sistema',         NOW() - INTERVAL '2 hours'),
  (ing_tec,     'salida',  0.12, 8,    7.88, 'Consumo — ORD-2004 Margarita Clásica x2',       'Sistema',         NOW() - INTERVAL '2 hours'),

  -- ORD-2005: 2x Tacos de Res, 2x Quesadilla, 2x Horchata, 2x Churros
  (ing_res,     'salida',  0.36, 20,   19.64,'Consumo — ORD-2005 Tacos de Res x2',            'Sistema',         NOW() - INTERVAL '1 hour 30 min'),
  (ing_tor,     'salida',  0.5,  12,   11.5, 'Consumo — ORD-2005 Tacos + Quesadilla',         'Sistema',         NOW() - INTERVAL '1 hour 30 min'),
  (ing_que_oax, 'salida',  0.2,  10,   9.8,  'Consumo — ORD-2005 Quesadilla x2',              'Sistema',         NOW() - INTERVAL '1 hour 30 min'),
  (ing_caj,     'salida',  0.16, 2,    1.84, 'Consumo — ORD-2005 Churros con Cajeta x2',      'Sistema',         NOW() - INTERVAL '1 hour 30 min'),

  -- ORD-2006: 2x Elotes, 1x Birria, 1x Café
  (ing_elo,     'salida',  4,    20,   16,   'Consumo — ORD-2006 Elotes Asados x2',           'Sistema',         NOW() - INTERVAL '1 hour'),
  (ing_res,     'salida',  0.3,  19.64,19.34,'Consumo — ORD-2006 Birria de Res x1',           'Sistema',         NOW() - INTERVAL '1 hour'),
  (ing_cafe,    'salida',  0.015,2,    1.985,'Consumo — ORD-2006 Café de Olla x1',            'Sistema',         NOW() - INTERVAL '1 hour'),

  -- ORD-2007: 3x Mole, 2x Camarones, 3x Arroz y Frijoles, 4x Cerveza
  (ing_pol,     'salida',  0.75, 24.6, 23.85,'Consumo — ORD-2007 Mole Negro x3',             'Sistema',         NOW() - INTERVAL '30 min'),
  (ing_cam,     'salida',  0.4,  9.6,  9.2,  'Consumo — ORD-2007 Camarones al Ajillo x2',    'Sistema',         NOW() - INTERVAL '30 min'),
  (ing_arr,     'salida',  0.54, 20,   19.46,'Consumo — ORD-2007 Arroz y Frijoles x3 + Mole','Sistema',         NOW() - INTERVAL '30 min'),
  (ing_fri,     'salida',  0.42, 15,   14.58,'Consumo — ORD-2007 Frijoles x3 + Mole',        'Sistema',         NOW() - INTERVAL '30 min'),
  (ing_cer_cla, 'salida',  4,    72,   68,   'Consumo — ORD-2007 Cerveza Artesanal x4',       'Sistema',         NOW() - INTERVAL '30 min'),

  -- Ajuste de inventario por merma
  (ing_agu,     'ajuste',  5,    60,   55,   'Merma — aguacates maduros descartados',         'Ana Hernández',   NOW() - INTERVAL '1 day'),
  (ing_jit,     'ajuste',  2,    15,   13,   'Merma — jitomates en mal estado',               'Ana Hernández',   NOW() - INTERVAL '1 day'),
  (ing_cil,     'ajuste',  0.5,  2,    1.5,  'Merma — cilantro marchito',                     'Ana Hernández',   NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. LOYALTY CUSTOMERS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.loyalty_customers (id, name, phone, email, points, total_spent, total_visits, is_active) VALUES
  (loy1, 'Alejandro Vega',    '55 9988 7766', 'alejandro@email.com', 1250, 4800, 18, true),
  (loy2, 'Carmen Salinas',    '55 8877 6655', 'carmen@email.com',    680,  2600, 10, true),
  (loy3, 'Rodrigo Peña',      '55 7766 5544', 'rodrigo@email.com',   320,  1200, 5,  true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.loyalty_transactions (customer_id, type, points, amount, order_id, notes, created_by) VALUES
  (loy1, 'acumulacion', 480, 1800, ord4, 'Acumulación por visita', 'Sistema'),
  (loy1, 'acumulacion', 210, 800,  ord5, 'Acumulación por visita', 'Sistema'),
  (loy1, 'canje',       200, 0,    '',   'Canje por descuento $50', 'Luis Torres'),
  (loy2, 'acumulacion', 340, 1300, ord6, 'Acumulación por visita', 'Sistema'),
  (loy3, 'acumulacion', 320, 1200, ord7, 'Acumulación por visita', 'Sistema')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. RESERVATIONS
-- ─────────────────────────────────────────────────────────────────────────────
SELECT id INTO tbl1_id FROM public.restaurant_tables WHERE number = 4 LIMIT 1;
SELECT id INTO tbl2_id FROM public.restaurant_tables WHERE number = 8 LIMIT 1;

INSERT INTO public.reservations (guest_name, guest_phone, guest_email, party_size, reservation_date, reservation_time, table_id, status, notes, branch_id) VALUES
  ('Familia Martínez',  '55 1122 3344', 'martinez@email.com', 6, CURRENT_DATE + 1, '14:00', tbl1_id, 'confirmada', 'Cumpleaños — solicitan pastel',    branch1),
  ('Empresa Tech MX',   '55 2233 4455', 'eventos@techMX.com', 12, CURRENT_DATE + 2, '13:30', null,    'confirmada', 'Comida de negocios — mesa grande', branch1),
  ('Laura Gutiérrez',   '55 3344 5566', 'laura@email.com',    2, CURRENT_DATE + 1, '20:00', tbl2_id, 'pendiente',  'Aniversario — velas y flores',    branch1),
  ('Grupo Amigos',      '55 4455 6677', '',                   8, CURRENT_DATE + 3, '15:00', null,    'confirmada', '',                                branch1)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. GASTOS RECURRENTES
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.gastos_recurrentes (nombre, descripcion, monto, categoria, frecuencia, dia_pago, proximo_pago, estado, activo) VALUES
  ('Renta del local',         'Renta mensual del local en Av. Independencia',    18000, 'renta',         'mensual',   1,  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE, 'pendiente', true),
  ('Servicio de luz',         'CFE — consumo eléctrico mensual',                 4500,  'servicios',     'mensual',   5,  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE, 'pendiente', true),
  ('Servicio de gas',         'Gas LP para cocina',                              2800,  'servicios',     'mensual',   5,  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE, 'pendiente', true),
  ('Internet y teléfono',     'Servicio de internet y línea telefónica',         950,   'servicios',     'mensual',   10, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE, 'pendiente', true),
  ('Nómina quincenal',        'Pago de nómina a todo el personal',               45000, 'nomina',        'quincenal', 15, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '15 days')::DATE, 'pendiente', true),
  ('Mantenimiento equipos',   'Servicio preventivo de equipos de cocina',        1500,  'mantenimiento', 'mensual',   20, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE, 'pendiente', true),
  ('Publicidad en redes',     'Campaña mensual en Facebook e Instagram',         2500,  'marketing',     'mensual',   1,  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE, 'pendiente', true),
  ('Seguro del negocio',      'Póliza de seguro anual del establecimiento',      12000, 'financiero',    'anual',     1,  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year')::DATE,   'pendiente', true),
  ('Suministros de limpieza', 'Detergentes, desinfectantes y utensilios',        1200,  'suministros',   'mensual',   3,  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE, 'pendiente', true),
  ('Contabilidad',            'Honorarios del contador externo',                 3500,  'financiero',    'mensual',   28, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE, 'pendiente', true)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. DEPRECIACIONES
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.depreciaciones (nombre, descripcion, tipo, valor_original, valor_residual, vida_util_anios, fecha_adquisicion, metodo, activo) VALUES
  ('Estufa Industrial 6 quemadores', 'Estufa de acero inoxidable para cocina profesional',  'depreciacion', 28000, 2000, 10, '2022-01-15', 'linea_recta',      true),
  ('Refrigerador comercial',         'Refrigerador de 2 puertas 1200 litros',               'depreciacion', 22000, 1500, 8,  '2021-06-01', 'linea_recta',      true),
  ('Horno de convección',            'Horno eléctrico de convección 6 charolas',            'depreciacion', 18000, 1000, 8,  '2022-03-10', 'linea_recta',      true),
  ('Sistema POS (hardware)',         'Terminal de punto de venta con impresora',             'depreciacion', 12000, 500,  5,  '2023-01-20', 'linea_recta',      true),
  ('Mobiliario de comedor',          'Mesas, sillas y decoración del salón',                'depreciacion', 45000, 5000, 10, '2020-09-01', 'linea_recta',      true),
  ('Campana extractora',             'Campana de extracción de humos para cocina',           'depreciacion', 15000, 1000, 10, '2021-01-10', 'linea_recta',      true),
  ('Licuadora industrial',           'Licuadora de 10 litros para salsas y bebidas',        'depreciacion', 8500,  500,  5,  '2022-07-05', 'saldo_decreciente', true),
  ('Vehículo de reparto',            'Motocicleta para entregas a domicilio',               'depreciacion', 35000, 5000, 5,  '2023-03-12', 'linea_recta',      true)
ON CONFLICT DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed data insertion failed: %', SQLERRM;
END $$;
