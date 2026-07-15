import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import {
  REVENUECAT_API_KEY_IOS,
  REVENUECAT_API_KEY_ANDROID,
  PREMIUM_ENTITLEMENT_ID,
} from '@/src/lib/constants';
import { supabase } from '@/src/lib/supabase';

export async function initializePurchases(userId: string): Promise<void> {
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

  if (!apiKey) return;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  await Purchases.configure({ apiKey, appUserID: userId });
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch {
    return null;
  }
}

export async function purchaseMonthly(): Promise<CustomerInfo | null> {
  try {
    const offerings = await Purchases.getOfferings();
    const monthly = offerings.current?.monthly;
    if (!monthly) throw new Error('Monthly package not found');

    const { customerInfo } = await Purchases.purchasePackage(monthly);
    return customerInfo;
  } catch (e: any) {
    if (e.userCancelled) return null;
    throw e;
  }
}

export async function purchaseHalfYearly(): Promise<CustomerInfo | null> {
  try {
    const offerings = await Purchases.getOfferings();
    const halfYearly = offerings.current?.sixMonth;
    if (!halfYearly) throw new Error('Half-yearly package not found');

    const { customerInfo } = await Purchases.purchasePackage(halfYearly);
    return customerInfo;
  } catch (e: any) {
    if (e.userCancelled) return null;
    throw e;
  }
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export function checkPremiumEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
}

export async function syncPremiumStatus(userId: string, isPremium: boolean): Promise<void> {
  await supabase
    .from('profiles')
    .update({ is_premium: isPremium, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}
