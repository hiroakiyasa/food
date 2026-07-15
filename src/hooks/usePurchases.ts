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
  syncPremiumStatus,
} from '@/src/services/purchases/purchaseService';

export function usePurchaseSetup() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    initializePurchases(user.id).catch(() => {});

    const listener = (info: CustomerInfo) => {
      const isPremium = checkPremiumEntitlement(info);
      syncPremiumStatus(user.id, isPremium).then(() => {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      });
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
    onSuccess: async (info) => {
      if (!info || !user) return;
      const isPremium = checkPremiumEntitlement(info);
      if (isPremium) {
        await syncPremiumStatus(user.id, true);
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
    onSuccess: async (info) => {
      if (!user) return;
      const isPremium = checkPremiumEntitlement(info);
      await syncPremiumStatus(user.id, isPremium);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
