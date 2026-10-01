import type {
  Offering,
  Package as RevenueCatPackage,
  Purchases as PurchasesClient,
} from "@revenuecat/purchases-js";
import { useStore } from "../store/useStore";

const PRO_ENTITLEMENT = "neuronotes_pro";
const ANONYMOUS_USER_KEY = "neuronotes_revenuecat_user_id";
const TERMS_URL = "https://neuronotes.app/terms";

let purchasesInstance: PurchasesClient | null = null;
let configuredAppUserId: string | null = null;

export type { Offering, RevenueCatPackage };

function getAppUserId(): string {
  const authenticatedUserId = useStore.getState().user?.id;
  if (authenticatedUserId) return authenticatedUserId;

  let anonymousUserId = window.localStorage.getItem(ANONYMOUS_USER_KEY);
  if (!anonymousUserId) {
    anonymousUserId = `neuronotes-web-${crypto.randomUUID()}`;
    window.localStorage.setItem(ANONYMOUS_USER_KEY, anonymousUserId);
  }
  return anonymousUserId;
}

async function getPurchases(userId = getAppUserId()): Promise<PurchasesClient | null> {
  const apiKey =
    import.meta.env.VITE_REVENUECAT_WEB_API_KEY ||
    import.meta.env.VITE_REVENUECAT_KEY;
  if (!apiKey) return null;

  const { Purchases } = await import("@revenuecat/purchases-js");

  if (!Purchases.isConfigured()) {
    purchasesInstance = Purchases.configure({ apiKey, appUserId: userId });
    configuredAppUserId = userId;
    return purchasesInstance;
  }

  purchasesInstance = Purchases.getSharedInstance();
  if (configuredAppUserId !== userId) {
    await purchasesInstance.changeUser(userId);
    configuredAppUserId = userId;
  }
  return purchasesInstance;
}

export const initRevenueCat = async (userId?: string): Promise<boolean> =>
  (await getPurchases(userId || getAppUserId())) !== null;

export const getOfferings = async (): Promise<Offering> => {
  const purchases = await getPurchases();
  if (!purchases) {
    throw new Error("Add VITE_REVENUECAT_WEB_API_KEY to enable Web Billing.");
  }

  const offerings = await purchases.getOfferings();
  if (!offerings.current) {
    throw new Error("No current RevenueCat offering is configured.");
  }
  return offerings.current;
};

export const checkProStatus = async (): Promise<boolean> => {
  try {
    const purchases = await getPurchases();
    return purchases ? purchases.isEntitledTo(PRO_ENTITLEMENT) : false;
  } catch {
    return false;
  }
};

export const getSubscriptionManagementURL = async (): Promise<string | null> => {
  const purchases = await getPurchases();
  if (!purchases) return null;

  const customerInfo = await purchases.getCustomerInfo();
  return customerInfo.managementURL;
};

export const purchasePackage = async (
  rcPackage: RevenueCatPackage,
): Promise<boolean> => {
  const purchases = await getPurchases();
  if (!purchases) {
    throw new Error("Add VITE_REVENUECAT_WEB_API_KEY to enable Web Billing.");
  }

  const result = await purchases.purchase({
    rcPackage,
    termsAndConditionsUrl: TERMS_URL,
  });
  return Boolean(result.customerInfo.entitlements.active[PRO_ENTITLEMENT]);
};

export const restorePurchases = checkProStatus;

export const listenForUpdates = (
  callback: (isPro: boolean) => void,
): (() => void) => {
  let stopped = false;

  const check = async () => {
    const isPro = await checkProStatus();
    if (!stopped) callback(isPro);
  };

  void check();
  const interval = window.setInterval(() => void check(), 60_000);
  return () => {
    stopped = true;
    window.clearInterval(interval);
  };
};

export enum PAYWALL_RESULT {
  NOT_PRESENTED = "NOT_PRESENTED",
  ERROR = "ERROR",
  CANCELLED = "CANCELLED",
  PURCHASED = "PURCHASED",
  RESTORED = "RESTORED",
}

/**
 * Web-compatible RevenueCatUI adapter matching the React Native API interface.
 */
export const RevenueCatUI = {
  presentPaywall: async (params?: { offering?: Offering }): Promise<PAYWALL_RESULT> => {
    try {
      const purchases = await getPurchases();
      if (!purchases) {
        console.warn(
          "RevenueCat Web Billing is not configured. Missing VITE_REVENUECAT_WEB_API_KEY in .env",
        );
        return PAYWALL_RESULT.NOT_PRESENTED;
      }

      const result = await purchases.presentPaywall(params || {});
      const isPro = Boolean(result.customerInfo.entitlements.active[PRO_ENTITLEMENT]);
      return isPro ? PAYWALL_RESULT.PURCHASED : PAYWALL_RESULT.NOT_PRESENTED;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (/cancel|dismiss/i.test(errMsg)) {
        return PAYWALL_RESULT.CANCELLED;
      }
      console.error("RevenueCat paywall error:", err);
      return PAYWALL_RESULT.ERROR;
    }
  },
};

/**
 * Present RevenueCat Paywall.
 *
 * In this browser-based Vite application, RevenueCat Web Billing uses @revenuecat/purchases-js.
 * Returns true if purchased or restored, false otherwise.
 */
export async function presentPaywall(): Promise<boolean> {
  const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

  switch (paywallResult) {
    case PAYWALL_RESULT.NOT_PRESENTED:
    case PAYWALL_RESULT.ERROR:
    case PAYWALL_RESULT.CANCELLED:
      return false;
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      return true;
    default:
      return false;
  }
}
