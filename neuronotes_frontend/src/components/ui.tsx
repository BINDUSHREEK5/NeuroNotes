import { useState } from "react";
import type { Capture, CaptureType, EnergyLevel } from "../store/useStore";
import { TYPE_CONFIG, ENERGY_CONFIG, URGENCY_LABEL, colors } from "../utils/design";
import { markDone, archive } from "../services/api";
import { useStore } from "../store/useStore";

export function TypeBadge({ type }: { type: CaptureType }) {
  const cfg = TYPE_CONFIG[type];
  return (
    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

export function EnergyBadge({ level }: { level: EnergyLevel }) {
  const cfg = ENERGY_CONFIG[level];
  return (
    <span className="text-xs px-2 py-0.5 rounded-full"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

export function CaptureCard({
  capture,
  onDone,
  onArchive,
  showParked = false,
}: {
  capture: Capture;
  onDone?: () => void;
  onArchive?: () => void;
  showParked?: boolean;
}) {
  const { markDone: storeDone, archiveCapture } = useStore();
  const [gone, setGone] = useState(false);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleDone = async () => {
    storeDone(capture.id);
    try { await markDone(capture.id); } catch { /* optimistic update */ }
    onDone?.();
  };

  const handleArchive = () => {
    setGone(true);
    window.setTimeout(() => {
      archiveCapture(capture.id);
      void archive(capture.id).catch(() => {});
      onArchive?.();
    }, 280);
  };

  if (gone) return null;

  return (
    <div
      className="rounded-2xl bg-white border border-stone-100 shadow-sm overflow-hidden transition-all duration-300"
      style={{ opacity: capture.is_done ? 0.4 : 1 }}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={capture.capture_type} />
            <EnergyBadge level={capture.energy_level || "medium"} />
            {capture.urgency !== "low" && (
              <span className="text-xs font-medium" style={{ color: colors.amber }}>
                {URGENCY_LABEL[capture.urgency]}
              </span>
            )}
            {capture.is_parked && showParked && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: colors.lavenderLight, color: colors.lavender }}>
                🅿️ parked
              </span>
            )}
          </div>
          <span className="text-xs flex-shrink-0" style={{ color: colors.textGhost }}>
            {timeAgo(capture.created_at)}
          </span>
        </div>

        <p className="text-sm leading-relaxed mb-3 font-light" style={{ color: colors.textPrimary }}>
          {capture.is_done
            ? <span className="line-through" style={{ color: colors.textMuted }}>{capture.ai_summary}</span>
            : capture.ai_summary}
        </p>

        {!capture.is_done && (
          <div className="flex gap-2">
            <button type="button" onClick={handleDone}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
              style={{ backgroundColor: colors.sageLight, color: colors.sageDeep }}>
              Done ✓
            </button>
            <button type="button" onClick={handleArchive}
              className="py-2 px-3 rounded-xl text-xs transition-colors"
              style={{ color: colors.textMuted }}>
              Archive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function WinBurst() {
  const dots = Array.from({ length: 22 });
  const confettiColors = [colors.sage, colors.lavender, colors.amber, colors.sageLight, colors.peachLight];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {dots.map((_, index) => {
        const x = 10 + Math.random() * 80;
        const size = 5 + Math.random() * 9;
        const delay = Math.random() * 0.5;
        const duration = 0.9 + Math.random() * 0.6;
        return (
          <div key={index} className="absolute rounded-full"
            style={{
              left: `${x}%`, top: "-8px",
              width: size, height: size,
              backgroundColor: confettiColors[index % confettiColors.length],
              animation: `confettiFall ${duration}s ease-in ${delay}s forwards`,
            }} />
        );
      })}
      <style>{`@keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(540deg); opacity: 0; }
      }`}</style>
    </div>
  );
}

export function NudgeBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mx-4 mt-3 px-4 py-3 rounded-2xl flex items-center justify-between gap-3"
      style={{ backgroundColor: colors.sageFaint, border: `1px solid ${colors.sageLight}` }}>
      <p className="text-sm font-light flex-1" style={{ color: colors.sageDeep }}>{message}</p>
      <button type="button" onClick={onDismiss} className="text-xs flex-shrink-0" style={{ color: colors.sageMid }}>
        ✕
      </button>
    </div>
  );
}

export function ProGate({
  message,
  onUpgrade,
  onDismiss,
}: { message: string; onUpgrade: () => void; onDismiss: () => void }) {
  return (
    <div className="mx-4 my-3 p-4 rounded-2xl"
      style={{ backgroundColor: colors.sageFaint, border: `1.5px solid ${colors.sageLight}` }}>
      <p className="text-sm font-light mb-3" style={{ color: colors.sageDeep }}>{message}</p>
      <div className="flex gap-2">
        <button type="button" onClick={onUpgrade}
          className="flex-1 py-2 rounded-xl text-xs font-medium text-white"
          style={{ backgroundColor: colors.sage }}>
          Try 7 days free
        </button>
        <button type="button" onClick={onDismiss}
          className="py-2 px-3 rounded-xl text-xs"
          style={{ color: colors.textMuted }}>
          Not now
        </button>
      </div>
    </div>
  );
}

export function FilterPills<T extends string>({
  options,
  active,
  onSelect,
}: { options: { value: T; label: string }[]; active: T; onSelect: (value: T) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-5">
      {options.map((option) => (
        <button type="button" key={option.value} onClick={() => onSelect(option.value)}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          style={{
            backgroundColor: active === option.value ? colors.sage : colors.muted,
            color: active === option.value ? "white" : colors.textSecondary,
          }}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ConsistencyDots({ days }: { days: string[] }) {
  const last14: string[] = [];
  for (let index = 13; index >= 0; index--) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    last14.push(date.toISOString().split("T")[0]);
  }
  const count = last14.filter((date) => days.includes(date)).length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs" style={{ color: colors.textSecondary }}>
        You showed up {count} of the last 14 days 🌿
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {last14.map((date) => (
          <div key={date} className="w-4 h-4 rounded-full"
            style={{ backgroundColor: days.includes(date) ? colors.sage : colors.subtle }} />
        ))}
      </div>
    </div>
  );
}
