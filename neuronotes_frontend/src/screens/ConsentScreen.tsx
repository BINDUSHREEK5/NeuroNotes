import { useState } from "react";
import { C, F } from "../utils/tokens";
import { useStore } from "../store/useStore";
import PixelCat from "../components/PixelCat";

export default function ConsentScreen({ onAccept }: { onAccept: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const { setHasConsented } = useStore();

  const handle = () => {
    if (!agreed) return;
    setHasConsented(true);
    onAccept();
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-16 pb-10" style={{ backgroundColor: C.bg }}>
      <div className="mb-6">
        <PixelCat variant="sage" size={56} />
      </div>

      <p className="text-xs font-medium tracking-widest uppercase mb-3"
        style={{ fontFamily: F.sans, color: C.textMuted, letterSpacing: "0.12em" }}>
        BEFORE WE BEGIN
      </p>

      <h1 className="text-4xl mb-3 leading-tight"
        style={{ fontFamily: F.serif, color: C.text, fontWeight: 700 }}>
        A few things to know.
      </h1>

      <p className="text-sm mb-8 leading-relaxed"
        style={{ fontFamily: F.sans, color: C.textSub }}>
        NeuroNotes needs your permission to provide its core features. Your data stays private and yours.
      </p>

      <div className="rounded-2xl p-5 mb-8"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.borderLight}` }}>
        <div className="flex gap-4 mb-5">
          <div className="mt-0.5">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="7" y="1" width="6" height="10" rx="3" stroke={C.sage} strokeWidth="1.5" />
              <path d="M3 9c0 3.866 3.134 7 7 7s7-3.134 7-7" stroke={C.sage} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10" y1="16" x2="10" y2="19" stroke={C.sage} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium mb-1" style={{ fontFamily: F.sans, color: C.text }}>
              Microphone access
            </p>
            <p className="text-xs leading-relaxed" style={{ fontFamily: F.sans, color: C.textSub }}>
              Used only when you capture. Never recorded without your action.
            </p>
          </div>
        </div>

        <div className="mb-5" style={{ height: 1, backgroundColor: C.borderLight }} />

        <div className="flex gap-4">
          <div className="mt-0.5">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <line x1="3" y1="5" x2="17" y2="5" stroke={C.sage} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="10" x2="17" y2="10" stroke={C.sage} strokeWidth="1.5" strokeLinecap="round" />
              <line x1="3" y1="15" x2="11" y2="15" stroke={C.sage} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium mb-1" style={{ fontFamily: F.sans, color: C.text }}>
              Your notes stay yours
            </p>
            <p className="text-xs leading-relaxed" style={{ fontFamily: F.sans, color: C.textSub }}>
              Stored securely. Never shared with third parties.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="flex items-center gap-3 mb-8 text-left"
        onClick={() => setAgreed((value) => !value)}
        aria-pressed={agreed}
      >
        <span className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            borderColor: agreed ? C.sage : C.textMuted,
            backgroundColor: agreed ? C.sage : "transparent",
          }}>
          {agreed && <span className="text-white text-xs font-bold">✓</span>}
        </span>
        <span className="text-sm" style={{ fontFamily: F.sans, color: C.textSub }}>
          I agree to the{" "}
          <a href="https://neuronotes.app/terms" target="_blank" rel="noreferrer"
            className="underline" style={{ color: C.sage }} onClick={(event) => event.stopPropagation()}>
            Terms of Service
          </a>
          {" "}and{" "}
          <a href="https://neuronotes.app/privacy" target="_blank" rel="noreferrer"
            className="underline" style={{ color: C.sage }} onClick={(event) => event.stopPropagation()}>
            Privacy Policy
          </a>
          .
        </span>
      </button>

      <button type="button" onClick={handle}
        className="w-full py-4 rounded-2xl text-base font-medium transition-opacity"
        style={{
          fontFamily: F.sans,
          backgroundColor: agreed ? C.sage : C.textGhost,
          color: "#FFFFFF",
          opacity: agreed ? 1 : 0.7,
        }}>
        Continue
      </button>
    </div>
  );
}
