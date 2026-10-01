import { useEffect, useState } from "react";
import { C, F } from "../utils/tokens";
import { getOfferings, purchasePackage, restorePurchases, checkProStatus, PAYWALL_RESULT, RevenueCatUI, type Offering, type RevenueCatPackage } from "../services/revenuecat";

type PaywallScreenProps = {
  setScreen: (screen: "capture_idle" | "inbox_full" | "focus_task" | "win" | "paywall" | "capture" | "inbox" | "focus") => void;
};

const FEATURES = [
  "Unlimited captures",
  "Gentle focus nudges",
  "Smart inbox triage",
  "Your companion by your side",
];

export default function PaywallScreen({ setScreen }: PaywallScreenProps) {
  const [offering, setOffering] = useState<Offering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let active = true;
    const loadOfferings = async () => {
      try {
        setLoading(true);
        const currentOffering = await getOfferings();
        if (active) setOffering(currentOffering);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load plans";
        if (active) setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadOfferings();
    return () => { active = false; };
  }, []);

  const handlePurchase = async (rcPackage: RevenueCatPackage) => {
    if (purchasing) return;
    setPurchasing(rcPackage.identifier);
    setError(null);
    try {
      const isPro = await purchasePackage(rcPackage);
      if (isPro) {
        setScreen("capture_idle");
      } else {
        // Purchase was cancelled or failed
        setError("Purchase was not completed. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Purchase failed";
      setError(msg);
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    setError(null);
    try {
      const isPro = await restorePurchases();
      if (isPro) {
        setScreen("capture_idle");
      } else {
        setError("No purchases found to restore.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Restore failed";
      setError(msg);
    } finally {
      setRestoring(false);
    }
  };

  const handleHostedPaywall = async () => {
    setLoading(true);
    try {
      const result = await RevenueCatUI.presentPaywall({ offering: offering || undefined });
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        setScreen("capture_idle");
      } else if (result === PAYWALL_RESULT.CANCELLED) {
        setError("Purchase was cancelled.");
      } else if (result === PAYWALL_RESULT.ERROR) {
        setError("An error occurred. Showing manual plans below.");
        setLoading(false);
      } else if (result === PAYWALL_RESULT.NOT_PRESENTED) {
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Paywall failed";
      setError(msg);
      setLoading(false);
    }
  };

  // Try hosted paywall first on mount
  useEffect(() => {
    if (offering) {
      void handleHostedPaywall();
    }
  }, [offering]);

  if (loading && !offering) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-8" style={{ backgroundColor: C.bg }}>
        <div style={{ textAlign: "center" }}>
          <div className="breathe" style={{ width: 48, height: 48, borderRadius: "50%", background: C.sageLight, margin: "0 auto 16px" }} />
          <p style={{ color: C.textSub, fontFamily: F.sans }}>Loading plans…</p>
        </div>
      </div>
    );
  }

  if (error && !offering) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 py-8" style={{ backgroundColor: C.bg }}>
        <div className="w-full rounded-[28px] border p-6" style={{ backgroundColor: C.surface, borderColor: C.borderLight, textAlign: "center" }}>
          <p style={{ color: C.urgent, fontFamily: F.sans, marginBottom: 16 }}>{error}</p>
          <button onClick={() => setScreen("capture_idle")} style={{ backgroundColor: C.sage, color: "#fff", padding: "12px 24px", borderRadius: 12, border: "none", fontFamily: F.sans }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  const packages = offering?.availablePackages || [];

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-8" style={{ backgroundColor: C.bg }}>
      <div className="w-full rounded-[28px] border p-6 shadow-[0_20px_50px_rgba(33,29,18,0.10)]" style={{ backgroundColor: "#F9F6F1", borderColor: C.borderLight }}>
        <div className="mb-5 flex items-center justify-between">
          <span className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: C.sageLight, color: C.sage, fontFamily: F.sans }}>
            NeuroNotes Pro
          </span>
          <button type="button" onClick={() => setScreen("capture_idle")} className="text-sm" style={{ color: C.textSub, fontFamily: F.sans }}>
            Maybe later
          </button>
        </div>

        <h2 className="text-[40px] leading-[0.98]" style={{ fontFamily: F.serif, color: C.text }}>
          Your brain deserves the full experience.
        </h2>

        <p className="mt-3 text-base leading-7" style={{ color: C.textSub, fontFamily: F.sans }}>
          Keep the mess out of your head and turn it into a calm, useful system.
        </p>

        <ul className="mt-6 space-y-3">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: C.sageLight, color: C.sage, fontWeight: 700 }}>
                ✓
              </span>
              <span style={{ color: C.text, fontFamily: F.sans, fontSize: 15 }}>{feature}</span>
            </li>
          ))}
        </ul>

        {error && (
          <div className="mt-4 p-3 rounded-12" style={{ backgroundColor: "rgba(196,149,106,0.15)", color: C.urgent, fontSize: 13, fontFamily: F.sans, textAlign: "center" }}>
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {packages.map((rcPackage) => {
            const product = rcPackage.webBillingProduct;
            const price = product.price?.formattedPrice || `$${product.currentPrice?.amountMicros ? (product.currentPrice.amountMicros / 1000000).toFixed(2) : "0"}`;
            const period = product.period ? `${product.period.number} ${product.period.unit}` : "month";
            return (
              <button
                key={rcPackage.identifier}
                onClick={() => handlePurchase(rcPackage)}
                disabled={purchasing !== null}
                className="w-full rounded-[16px] border p-4 text-left transition-colors"
                style={{
                  backgroundColor: purchasing === rcPackage.identifier ? C.sageLight : C.surface,
                  borderColor: purchasing === rcPackage.identifier ? C.sage : C.borderLight,
                  cursor: purchasing ? "not-allowed" : "pointer",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: C.textSub, fontFamily: F.sans }}>{product.title || rcPackage.identifier}</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl" style={{ fontFamily: F.serif, color: C.text }}>{price}</span>
                      <span className="text-base" style={{ color: C.textSub, fontFamily: F.sans }}>/{period}</span>
                    </div>
                  </div>
                  {purchasing === rcPackage.identifier && (
                    <span className="inline-block animate-pulse" style={{ color: C.sage }}>⟳</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t" style={{ borderColor: C.borderLight }}>
          <button
            onClick={handleRestore}
            disabled={restoring || !!purchasing}
            className="w-full rounded-2xl px-4 py-3 text-sm font-medium"
            style={{ backgroundColor: "transparent", color: C.sage, border: `1px solid ${C.sage}`, fontFamily: F.sans, cursor: restoring || purchasing ? "not-allowed" : "pointer" }}
          >
            {restoring ? "Restoring…" : "Restore Purchases"}
          </button>
        </div>
      </div>
    </div>
  );
}
