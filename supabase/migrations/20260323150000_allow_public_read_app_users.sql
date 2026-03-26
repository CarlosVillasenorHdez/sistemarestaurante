-- Migration: Allow public read on app_users for login dropdown
-- The login page needs to list active workers before authentication occurs.
-- This policy allows unauthenticated (anon) users to SELECT from app_users
-- so the worker dropdown can be populated on the login screen.

DROP POLICY IF EXISTS "Public can read active workers for login" ON public.app_users;
CREATE POLICY "Public can read active workers for login"
  ON public.app_users FOR SELECT
  TO anon
  USING (is_active = true);
