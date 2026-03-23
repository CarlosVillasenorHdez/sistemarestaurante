-- Migration: Create Admin User
-- Creates the admin user with username 'admin' and password '12345'

DO $$
DECLARE
    admin_auth_id UUID := gen_random_uuid();
    existing_auth_id UUID;
BEGIN
    -- Check if admin user already exists in auth.users
    SELECT id INTO existing_auth_id
    FROM auth.users
    WHERE email = 'admin@sistemarest.local'
    LIMIT 1;

    IF existing_auth_id IS NOT NULL THEN
        RAISE NOTICE 'Admin auth user already exists with id: %', existing_auth_id;
        admin_auth_id := existing_auth_id;
    ELSE
        -- Create auth user for admin
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
            created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
            is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
            recovery_token, recovery_sent_at, email_change_token_new, email_change,
            email_change_sent_at, email_change_token_current, email_change_confirm_status,
            reauthentication_token, reauthentication_sent_at, phone, phone_change,
            phone_change_token, phone_change_sent_at
        ) VALUES (
            admin_auth_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'admin@sistemarest.local',
            crypt('12345', gen_salt('bf', 10)),
            now(),
            now(),
            now(),
            jsonb_build_object('full_name', 'Administrador', 'role', 'admin'),
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
            false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
        );
        RAISE NOTICE 'Admin auth user created with id: %', admin_auth_id;
    END IF;

    -- Insert into app_users (skip if username 'admin' already exists)
    INSERT INTO public.app_users (
        auth_user_id,
        username,
        full_name,
        app_role,
        is_active
    ) VALUES (
        admin_auth_id,
        'admin',
        'Administrador',
        'admin',
        true
    )
    ON CONFLICT (username) DO UPDATE
        SET auth_user_id = admin_auth_id,
            full_name = 'Administrador',
            app_role = 'admin',
            is_active = true,
            updated_at = now();

    RAISE NOTICE 'Admin app_user record created/updated successfully.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating admin user: %', SQLERRM;
END $$;
