-- Migration: Wipe all data and seed only Admin user
-- Clears all table data and auth users, then creates a single Admin login
-- Admin credentials: username = admin / password = 12345

DO $$
DECLARE
    admin_uuid UUID := gen_random_uuid();
BEGIN

    -- ----------------------------------------------------------------
    -- 1. WIPE ALL PUBLIC TABLE DATA (children first, then parents)
    -- ----------------------------------------------------------------

    -- RH / HR tables
    DELETE FROM public.employee_shifts;
    DELETE FROM public.rh_tiempos_extras;
    DELETE FROM public.rh_permisos;
    DELETE FROM public.rh_vacaciones;

    -- Loyalty
    DELETE FROM public.loyalty_transactions;
    DELETE FROM public.loyalty_customers;

    -- Delivery
    DELETE FROM public.delivery_orders;

    -- Reservations
    DELETE FROM public.reservations;

    -- Onboarding
    DELETE FROM public.onboarding_progress;

    -- Demo requests
    DELETE FROM public.demo_requests;

    -- Orders (items first)
    DELETE FROM public.order_items;
    DELETE FROM public.orders;

    -- Stock
    DELETE FROM public.stock_movements;

    -- Recipes
    DELETE FROM public.dish_recipes;

    -- Dishes & Ingredients
    DELETE FROM public.dishes;
    DELETE FROM public.ingredients;

    -- Employees
    DELETE FROM public.employees;

    -- Tables & Layout
    DELETE FROM public.restaurant_tables;
    DELETE FROM public.restaurant_layout;

    -- Gastos
    DELETE FROM public.gastos_pagos;
    DELETE FROM public.gastos_recurrentes;
    DELETE FROM public.depreciaciones;

    -- Config / misc
    DELETE FROM public.printer_config;
    DELETE FROM public.role_permissions;
    DELETE FROM public.system_config;
    DELETE FROM public.unit_equivalences;
    DELETE FROM public.branches;

    -- App users (must come before auth.users)
    DELETE FROM public.app_users;

    -- ----------------------------------------------------------------
    -- 2. WIPE ALL AUTH USERS
    -- ----------------------------------------------------------------
    DELETE FROM auth.users;

    -- ----------------------------------------------------------------
    -- 3. CREATE FRESH ADMIN AUTH USER
    -- ----------------------------------------------------------------
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES (
        admin_uuid,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'admin@sistemarest.local',
        crypt('12345', gen_salt('bf', 10)),
        now(), now(), now(),
        jsonb_build_object('full_name', 'Administrador', 'role', 'admin'),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
        false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
    );

    -- ----------------------------------------------------------------
    -- 4. CREATE FRESH ADMIN APP_USER RECORD
    -- ----------------------------------------------------------------
    INSERT INTO public.app_users (
        auth_user_id,
        username,
        full_name,
        app_role,
        is_active
    ) VALUES (
        admin_uuid,
        'admin',
        'Administrador',
        'admin',
        true
    );

    RAISE NOTICE 'Wipe complete. Admin user created with id: %', admin_uuid;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Migration error: %', SQLERRM;
        RAISE;
END $$;
