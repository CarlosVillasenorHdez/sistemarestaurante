-- Migration: Ensure Admin user is active and visible in login dropdown
-- This migration guarantees the Admin user exists in app_users with is_active = true
-- and that the anon RLS policy is in place for the login page dropdown.

-- Step 1: Ensure the anon read policy exists (idempotent)
DROP POLICY IF EXISTS "Public can read active workers for login" ON public.app_users;
CREATE POLICY "Public can read active workers for login"
  ON public.app_users FOR SELECT
  TO anon
  USING (is_active = true);

-- Step 2: Ensure Admin user record exists in app_users with is_active = true
DO $$
DECLARE
    admin_auth_id UUID;
    existing_app_user_id UUID;
BEGIN
    -- Find the auth user for admin
    SELECT id INTO admin_auth_id
    FROM auth.users
    WHERE email = 'admin@sistemarest.local'
    LIMIT 1;

    IF admin_auth_id IS NULL THEN
        -- Create auth user if it doesn't exist
        admin_auth_id := gen_random_uuid();
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
            now(), now(), now(),
            jsonb_build_object('full_name', 'Administrador', 'role', 'admin'),
            jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
            false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
        );
        RAISE NOTICE 'Admin auth user created with id: %', admin_auth_id;
    ELSE
        -- Update password to ensure it is correct
        UPDATE auth.users
        SET encrypted_password = crypt('12345', gen_salt('bf', 10)),
            updated_at = now()
        WHERE id = admin_auth_id;
        RAISE NOTICE 'Admin auth user found with id: %', admin_auth_id;
    END IF;

    -- Check if app_users record exists for admin
    SELECT id INTO existing_app_user_id
    FROM public.app_users
    WHERE username = 'admin'
    LIMIT 1;

    IF existing_app_user_id IS NULL THEN
        -- Insert new app_users record
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
        );
        RAISE NOTICE 'Admin app_user record created.';
    ELSE
        -- Update existing record to ensure it is active and linked
        UPDATE public.app_users
        SET auth_user_id = admin_auth_id,
            full_name = 'Administrador',
            app_role = 'admin',
            is_active = true,
            updated_at = now()
        WHERE username = 'admin';
        RAISE NOTICE 'Admin app_user record updated to active.';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error ensuring admin user: %', SQLERRM;
END $$;
