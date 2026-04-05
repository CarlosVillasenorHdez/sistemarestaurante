'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import SubscriptionWall from '@/components/SubscriptionWall';

interface TenantStatus {
  is_active: boolean;
  trial_ends_at: string | null;
  plan_valid_until: string | null;
  plan: string;
}

function getWallReason(t: TenantStatus): 'inactive' | 'expired' | 'trial_ended' | null {
  if (!t.is_active) return 'inactive';
  const now = new Date();
  if (t.plan_valid_until && new Date(t.plan_valid_until) < now) return 'expired';
  if (!t.plan_valid_until && t.trial_ends_at && new Date(t.trial_ends_at) < now) return 'trial_ended';
  return null;
}

export default function ErpGroupLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<TenantStatus | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!appUser?.tenantId) { setChecking(false); return; }
    if (appUser.appRole === 'superadmin') { setChecking(false); return; }
    const supabase = createClient();
    supabase
      .from('tenants')
      .select('is_active, trial_ends_at, plan_valid_until, plan')
      .eq('id', appUser.tenantId)
      .single()
      .then(({ data }) => {
        if (data) setStatus(data as TenantStatus);
        setChecking(false);
      });
  }, [appUser, authLoading]);

  if (authLoading || checking) return <>{children}</>;
  if (status) {
    const reason = getWallReason(status);
    if (reason) return <SubscriptionWall reason={reason} plan={status.plan} />;
  }
  return <>{children}</>;
}
