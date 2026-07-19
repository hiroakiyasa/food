import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { useAuthStore } from '@/src/stores/authStore';
import {
  initializePurchases,
  getOfferings,
  purchaseMonthly,
  purchaseHalfYearly,
  restorePurchases,
  checkPremiumEntitlement,
} from '@/src/services/purchases/purchaseService';

export function usePurchaseSetup() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    initializePurchases(user.id).catch(() => {});

    // profiles.is_premium is updated server-side by the RevenueCat webhook;
    // the client only refetches so the UI catches up.
    const listener = (_info: CustomerInfo) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [user, queryClient]);
}

export function useOfferings() {
  return useQuery({
    queryKey: ['offerings'],
    queryFn: getOfferings,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export type PlanType = 'monthly' | 'half_yearly';

export function usePurchase() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: PlanType) => {
      const info = plan === 'monthly' ? await purchaseMonthly() : await purchaseHalfYearly();
      return info;
    },
    onSuccess: (info) => {
      if (!info || !user) return;
      if (checkPremiumEntitlement(info)) {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    },
  });
}

export function useRestorePurchases() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const info = await restorePurchases();
      return info;
    },
    onSuccess: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
