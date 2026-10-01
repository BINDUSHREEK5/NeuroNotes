import { useState, type ReactNode } from "react";
import { C, F } from "../utils/tokens";
import PixelCat from "../components/PixelCat";

interface Slide {
  key: string;
  visual: () => ReactNode;
  headline1: string;
  headline2: string | null;
  headline3: string | null;
  headlineColored?: string;
  sub: string;
  btn: string;
}

const SLIDES: Slide[] = [
  {
    key: "01",
    visual: () => (
      <div className="relative flex w-full items-end justify-center" style={{ height: 200 }}>
        <div className="absolute rounded-full" style={{ width: 120, height: 120, backgroundColor: "#C8D9CB", opacity: 0.6, top: 10, left: "18%" }} />
        <div className="absolute rounded-full" style={{ width: 90, height: 90, backgroundColor: "#D8D0E8", opacity: 0.55, top: 20, left: "45%" }} />
        <div className="absolute rounded-full" style={{ width: 70, height: 70, backgroundColor: "#B8CAB0", opacity: 0.5, top: 60, left: "15%" }} />
        <div className="absolute rounded-full" style={{ width: 100, height: 100, backgroundColor: "#E8D0BC", opacity: 0.52, top: 70, left: "28%" }} />
        <div className="absolute rounded-full" style={{ width: 70, height: 70, backgroundColor: "#EDE4A8", opacity: 0.5, top: 82, left: "50%" }} />
        <div className="absolute" style={{ bottom: 0, right: "29%", zIndex: 10 }}>
          <PixelCat variant="sage" size={58} sparkles />
        </div>
      </div>
    ),
    headline1: "Your brain is not",
    headline2: "broken.",
    headline3: "It just works differently.",
    sub: "NeuroNotes was built for that.",
    btn: "Show me",
  },
  {
    key: "02",
    visual: () => (
      <div className="flex items-center justify-center gap-5" style={{ height: 140 }}>
        <div className="rounded-full flex items-center justify-center" style={{ width: 64, height: 64, backgroundColor: C.sageLight }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="9" y="2" width="10" height="16" rx="5" stroke={C.sage} strokeWidth="2" />
            <path d="M5 14c0 4.97 4.03 9 9 9s9-4.03 9-9" stroke={C.sage} strokeWidth="2" strokeLinecap="round" />
            <line x1="14" y1="23" x2="14" y2="27" stroke={C.sage} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <svg width="24" height="16" viewBox="0 0 24 16" fill="none" aria-hidden="true">
          <path d="M0 8h20M16 4l4 4-4 4" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="rounded-xl p-3" style={{ backgroundColor: C.surface, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", minWidth: 130 }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: C.badgeTask.bg, color: C.badgeTask.text, fontFamily: F.sans }}>
              task
            </span>
            <span className="text-xs" style={{ color: C.soon, fontFamily: F.sans }}>↑ soon</span>
          </div>
          <p className="text-xs font-medium" style={{ fontFamily: F.sans, color: C.text }}>
            Call dentist before Friday
          </p>
        </div>
      </div>
    ),
    headline1: "Capture anything.",
    headline2: null,
    headlineColored: "We'll sort it.",
    headline3: null,
    sub: "Speak, type, or dump it all out at once. The cat will organize it.",
    btn: "Got it",
  },
  {
    key: "03",
    visual: () => (
      <div className="flex gap-3 justify-center" style={{ height: 100 }}>
        <div className="rounded-xl p-3 flex flex-col justify-between" style={{ backgroundColor: C.surfaceMuted, width: 130, border: `1px solid ${C.borderLight}` }}>
          <p className="text-xs" style={{ color: C.textMuted, fontFamily: F.sans }}>Other apps</p>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold" style={{ color: "#D05A5A", fontFamily: F.sans }}>3 OVERDUE</span>
          </div>
        </div>
        <div className="rounded-xl p-3 flex flex-col justify-between" style={{ backgroundColor: C.surface, width: 130, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <p className="text-xs" style={{ color: C.textMuted, fontFamily: F.sans }}>NeuroNotes</p>
          <span className="text-xs px-2 py-1 rounded-full self-start" style={{ backgroundColor: C.soonBg, color: C.soon, fontFamily: F.sans }}>
            ↑ soon
          </span>
        </div>
      </div>
    ),
    headline1: "No red labels.",
    headline2: "No guilt.",
    headline3: 'No "overdue."',
    sub: "Gentle nudges. No shame spiral. The cat approves.",
    btn: "Let's go",
  },
];

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];

  const next = () => {
    if (step < SLIDES.length - 1) setStep((currentStep) => currentStep + 1);
    else onDone();
  };

  return (
    <div className="flex flex-col min-h-screen px-7" style={{ backgroundColor: C.bg }}>
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-10">{slide.visual()}</div>

        <div className="mb-4">
          <h1 className="leading-tight" style={{ fontFamily: F.serif, fontSize: 34, fontWeight: 700, color: C.text }}>
            {slide.headline1}
          </h1>
          {slide.headline2 && (
            <h1 className="leading-tight" style={{ fontFamily: F.serif, fontSize: 34, fontWeight: 700, color: C.text }}>
              {slide.headline2}
            </h1>
          )}
          {slide.headlineColored && (
            <h1 className="leading-tight" style={{ fontFamily: F.serif, fontSize: 34, fontWeight: 700, color: C.sage }}>
              {slide.headlineColored}
            </h1>
          )}
          {slide.headline3 && (
            <h1 className="leading-tight" style={{ fontFamily: F.serif, fontSize: 34, fontWeight: 700, color: C.text }}>
              {slide.headline3}
            </h1>
          )}
        </div>

        <p className="text-sm leading-relaxed" style={{ fontFamily: F.sans, color: C.textSub }}>
          {slide.sub}
        </p>
      </div>

      <div className="pb-10">
        <div className="flex justify-center gap-2 mb-6" aria-label={`Onboarding step ${step + 1} of ${SLIDES.length}`}>
          {SLIDES.map((slideItem, index) => (
            <div key={slideItem.key} className="rounded-full transition-all duration-300"
              style={{ width: index === step ? 20 : 6, height: 6, backgroundColor: index === step ? C.sage : C.borderLight }} />
          ))}
        </div>

        <button type="button" onClick={next}
          className="w-full py-4 rounded-2xl text-base font-medium"
          style={{ fontFamily: F.sans, backgroundColor: C.sage, color: "#FFFFFF" }}>
          {slide.btn}
        </button>
      </div>
    </div>
  );
}
