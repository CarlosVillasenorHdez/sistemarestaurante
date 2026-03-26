// Database row types — mapped from Supabase schema
// Use these instead of 'any' when mapping Supabase responses

export interface DbTable {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: 'libre' | 'ocupada' | 'espera';
  current_order_id: string | null;
  waiter: string | null;
  opened_at: string | null;
  item_count: number | null;
  partial_total: number | null;
  merge_group_id: string | null;
  updated_at: string | null;
}

export interface DbOrder {
  id: string;
  mesa: string;
  mesa_num: number;
  mesero: string;
  subtotal: number;
  iva: number;
  discount: number;
  total: number;
  status: 'abierta' | 'preparacion' | 'lista' | 'cerrada' | 'cancelada';
  kitchen_status: 'en_edicion' | 'pendiente' | 'preparacion' | 'lista' | 'entregada';
  pay_method: 'efectivo' | 'tarjeta' | null;
  opened_at: string | null;
  closed_at: string | null;
  branch: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  dish_id: string | null;
  name: string;
  qty: number;
  price: number;
  emoji: string | null;
  notes: string | null;
  created_at: string;
}

export interface DbDish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  image: string | null;
  image_alt: string | null;
  emoji: string;
  popular: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface DbIngredient {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  min_stock: number;
  reorder_point: number;
  cost: number;
  supplier: string | null;
  supplier_url: string | null;
  supplier_phone: string | null;
  notes: string | null;
  updated_at: string | null;
}

export interface DbDishRecipe {
  id: string;
  dish_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  notes: string | null;
  ingredients?: DbIngredient;
}

export interface DbEmployee {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string | null;
  hire_date: string;
  salary: number;
  salary_frequency: 'semanal' | 'quincenal' | 'mensual';
  status: 'activo' | 'inactivo';
  updated_at: string | null;
}

export interface DbAppUser {
  id: string;
  auth_user_id: string;
  username: string;
  full_name: string;
  app_role: string;
  employee_id: string | null;
  is_active: boolean;
}

export interface DbSystemConfig {
  config_key: string;
  config_value: string;
}

export interface DbLayoutPosition {
  number: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  shape?: string;
}

export interface DbRestaurantLayout {
  id: string;
  tables_layout: DbLayoutPosition[];
  updated_at: string | null;
}
