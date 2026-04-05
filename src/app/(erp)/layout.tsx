'use client';

/**
 * (erp)/layout.tsx
 *
 * ERP group layout — checks tenant subscription status on mount.
 * If the tenant is inactive, expired, or trial-ended, shows SubscriptionWall.
 * Fails open (renders normally) if the subscription data can't be fetched.
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SubscriptionWall from '@/components/SubscriptionWall';
import { createClient } from '@/lib/supabase/client';

type WallReason = 'inactive' | 'expired' | 'trial_ended';

interface SubscriptionState {
  checked: boolean;
  blocked: boolean;
  reason?: WallReason;
  plan?: string;
}

export default function ErpGroupLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [sub, setSub] = useState<SubscriptionState>({ checked: false, blocked: false });

  useEffect(() => {
    // Wait for auth to resolve
    if (authLoading) return;
    // No user logged in — AuthContext redirects to login, nothing to check here
    if (!appUser?.tenantId) {
      setSub({ checked: true, blocked: false });
      return;
    }

    supabase
      .from('tenants')
      .select('plan, is_active, plan_valid_until, trial_ends_at')
      .eq('id', appUser.tenantId)
      .single()
      .then(({ data, error }) => {
        // Fail open: if query fails, render normally
        if (error || !data) {
          setSub({ checked: true, blocked: false });
          return;
        }

        const now = new Date();
        const d = data as {
          plan: string;
          is_active: boolean;
          plan_valid_until: string | null;
          trial_ends_at: string | null;
        };

        if (!d.is_active) {
          setSub({ checked: true, blocked: true, reason: 'inactive', plan: d.plan });
          return;
        }

        if (d.plan_valid_until && new Date(d.plan_valid_until) < now) {
          setSub({ checked: true, blocked: true, reason: 'expired', plan: d.plan });
          return;
        }

        if (!d.plan_valid_until && d.trial_ends_at && new Date(d.trial_ends_at) < now) {
          setSub({ checked: true, blocked: true, reason: 'trial_ended', plan: d.plan });
          return;
        }

        setSub({ checked: true, blocked: false });
      });
  }, [authLoading, appUser?.tenantId, supabase]);

  // While checking, render children (avoids flicker for users with active plans)
  if (!sub.checked) return <>{children}</>;

  if (sub.blocked && sub.reason) {
    return <SubscriptionWall reason={sub.reason} plan={sub.plan} />;
  }

  return <>{children}</>;
}
