import { useAuth } from '@/contexts/AuthContext';

export function useBranch() {
  const { branchId } = useAuth();
  return {
    branch: branchId ?? null,
    branchId: branchId ?? null,
  };
}
