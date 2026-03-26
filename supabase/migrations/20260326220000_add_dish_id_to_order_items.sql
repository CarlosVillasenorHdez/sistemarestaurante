-- Add dish_id column to order_items for POS sync
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS dish_id UUID REFERENCES public.dishes(id) ON DELETE SET NULL;

-- Add notes column if missing (used by useOrderFlow)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_order_items_dish_id ON public.order_items(dish_id);
