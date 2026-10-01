import type { ReactNode } from "react";
import { C } from "../utils/tokens";
import type { Screen } from "../App";

type Tab = "capture" | "inbox" | "focus" | "settings";

const TABS: { id: Tab; label: string; icon: (active: boolean) => ReactNode }[] = [
  {
    id: "capture",
    label: "Capture",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="9" stroke={active ? C.sage : C.navInactive} strokeWidth="1.5" />
        <circle cx="11" cy="11" r="3" fill={active ? C.sage : C.navInactive} />
        <line x1="11" y1="2" x2="11" y2="5" stroke={active ? C.sage : C.navInactive} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11" y1="17" x2="11" y2="20" stroke={active ? C.sage : C.navInactive} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="2" y1="11" x2="5" y2="11" stroke={active ? C.sage : C.navInactive} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="11" x2="20" y2="11" stroke={active ? C.sage : C.navInactive} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "inbox",
    label: "Inbox",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="16" height="3" rx="1" fill={active ? C.sage : C.navInactive} />
        <rect x="3" y="10" width="16" height="3" rx="1" fill={active ? C.sage : C.navInactive} />
        <rect x="3" y="15" width="10" height="3" rx="1" fill={active ? C.sage : C.navInactive} />
      </svg>
    ),
  },
  {
    id: "focus",
    label: "Focus",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="9" stroke={active ? C.sage : C.navInactive} strokeWidth="1.5" />
        <circle cx="11" cy="11" r="5" stroke={active ? C.sage : C.navInactive} strokeWidth="1.5" />
        <circle cx="11" cy="11" r="2" fill={active ? C.sage : C.navInactive} />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="9" stroke={active ? C.sage : C.navInactive} strokeWidth="1.5" />
        <path d="M11 4v3M11 15v3M4 11h3M15 11h3M5.5 5.5l2 2M14.5 14.5l2 2M14.5 5.5l-2 2M5.5 14.5l2 2" stroke={active ? C.sage : C.navInactive} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav({
  current,
  setScreen,
}: { current: Screen; setScreen: (screen: Screen) => void }) {
  const currentName = current === "inbox_full" || current === "inbox_empty" || current === "inbox"
    ? "inbox"
    : current === "focus_task" || current === "focus_empty" || current === "focus"
      ? "focus"
      : current === "settings"
        ? "settings"
        : "capture";
  const activeTab: Tab = currentName;

  return (
    <nav
      className="flex border-t"
      style={{
        backgroundColor: "rgba(255,255,255,0.88)",
        borderColor: C.borderLight,
        backdropFilter: "blur(10px)",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const targetScreen: Screen = tab.id === "capture" ? "capture_idle" : tab.id === "inbox" ? "inbox_full" : tab.id === "focus" ? "focus_task" : "settings";
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setScreen(targetScreen)}
            className="flex-1 flex flex-col items-center py-3 gap-1.5"
            aria-label={tab.label}
            style={{
              backgroundColor: isActive ? "rgba(107, 143, 113, 0.08)" : "transparent",
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                backgroundColor: isActive ? "rgba(107, 143, 113, 0.14)" : "transparent",
              }}
            >
              {tab.icon(isActive)}
            </div>
            <span
              className="text-[11px]"
              style={{
                fontFamily: "'Manrope', sans-serif",
                color: isActive ? C.sage : C.navInactive,
                fontWeight: isActive ? 700 : 500,
                letterSpacing: "0.02em",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
