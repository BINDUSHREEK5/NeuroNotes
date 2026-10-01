import { useEffect, useState, useRef } from "react";
import { getFocus, getRandom, markDone, archive } from "../services/api";
import { useStore } from "../store/useStore";
import { colors, WIN_MESSAGES, randomFrom, EMOTIONAL_CONFIG } from "../utils/design";
import { TypeBadge, EnergyBadge, WinBurst } from "../components/ui";
import { uploadVoice, submitText } from "../services/api";
import type { Screen } from "../App";
import type { Capture } from "../store/useStore";

type FocusMode = "loading" | "task" | "done" | "empty" | "roulette" | "timer" | "parking";
type TimerMode = "gentle" | "flow" | "micro";

const TIMER_DURATIONS: Record<TimerMode, number> = {
  gentle: 25 * 60,
  flow: 0,
  micro: 10 * 60,
};

const TIMER_LABELS: Record<TimerMode, { name: string; desc: string; emoji: string }> = {
  gentle: { name: "Gentle", desc: "25 min focus · 5 min break", emoji: "🌿" },
  flow: { name: "Flow", desc: "No timer · just track time", emoji: "🌊" },
  micro: { name: "Micro", desc: "10 min · just get started", emoji: "⚡" },
};

export default function FocusScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const { markDone: storeDone, addCapture, emotionalState, user } = useStore();
  const [mode, setMode] = useState<FocusMode>("loading");
  const [task, setTask] = useState<Capture | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [rerolls, setRerolls] = useState(0);
  const MAX_REROLLS = user?.is_pro ? Number.POSITIVE_INFINITY : 3;

  const [timerMode, setTimerMode] = useState<TimerMode>("gentle");
  const [timerActive, setTimerActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [extended, setExtended] = useState(0);
  const timerRef = useRef<number | null>(null);

  const [parkText, setParkText] = useState("");
  const [parkedCount, setParkedCount] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [parkRecording, setParkRecording] = useState(false);

  useEffect(() => { void load(); }, []);
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const load = async () => {
    setMode("loading");
    try {
      const data = await getFocus(emotionalState ?? undefined);
      if (data.capture) {
        setTask(data.capture);
        setMode("task");
      } else {
        setMode("empty");
      }
    } catch {
      setMode("empty");
    }
  };

  const handleDone = async () => {
    if (!task) return;
    storeDone(task.id);
    try { await markDone(task.id); } catch { /* optimistic */ }
    setCelebrating(true);
    setMode("done");
    window.setTimeout(() => {
      setCelebrating(false);
      setScreen("win");
    }, 1800);
  };

  const handleRoulette = async () => {
    if (rerolls >= MAX_REROLLS) { setScreen("paywall"); return; }
    setMode("loading");
    try {
      const data = await getRandom();
      if (data.capture) {
        setTask(data.capture);
        setMode("task");
        setRerolls((previous) => previous + 1);
      } else {
        setMode("empty");
      }
    } catch {
      setMode("empty");
    }
  };

  const startTimer = () => {
    if (!user?.is_pro) { setScreen("paywall"); return; }
    setElapsed(0);
    setTimerActive(true);
    setMode("timer");
    timerRef.current = window.setInterval(() => setElapsed((previous) => previous + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerActive(false);
  };

  const extendTimer = () => {
    setExtended((previous) => previous + 1);
  };

  const duration = TIMER_DURATIONS[timerMode];
  const isOverTime = duration > 0 && elapsed > duration;

  const formatTime = (value: number) => {
    const seconds = Math.abs(value);
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
  };

  const startParkVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
          const data = await uploadVoice(blob);
          addCapture({ ...data.capture, is_parked: true });
          setParkedCount((previous) => previous + 1);
        } catch {
          // ignore voice parking errors
        }
      };
      mediaRef.current = recorder;
      recorder.start();
      setParkRecording(true);
    } catch {
      // ignore permission issues in this flow
    }
  };

  const stopParkVoice = () => {
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach((track) => track.stop());
    setParkRecording(false);
    setMode("timer");
  };

  const parkTextThought = async () => {
    if (!parkText.trim()) return;
    try {
      const data = await submitText(parkText.trim());
      addCapture({ ...data.capture, is_parked: true });
      setParkedCount((previous) => previous + 1);
      setParkText("");
      setMode("timer");
    } catch {
      // ignore text parking errors
    }
  };

  if (mode === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.bg }}>
        <div className="w-8 h-8 rounded-full animate-pulse" style={{ backgroundColor: colors.sageLight }} />
      </div>
    );
  }

  if (mode === "timer") {
    const circumference = 2 * Math.PI * 80;
    const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 0;

    return (
      <div className="flex flex-col items-center justify-between min-h-screen px-6 pt-14 pb-8" style={{ backgroundColor: colors.bg }}>
        <div className="w-full flex justify-end mb-4">
          <button type="button" onClick={() => setMode("parking")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: colors.lavenderLight, color: colors.lavender }}>
            🅿️ Park a thought
            {parkedCount > 0 && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs text-white"
                style={{ backgroundColor: colors.lavender }}>
                {parkedCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="relative flex items-center justify-center">
            <svg width="200" height="200" className="-rotate-90" aria-label="Focus timer progress">
              <circle cx="100" cy="100" r="80" fill="none" stroke={colors.subtle} strokeWidth="3" />
              <circle cx="100" cy="100" r="80" fill="none" stroke={isOverTime ? colors.amber : colors.sage} strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div className="absolute flex flex-col items-center gap-1">
              <p className="text-3xl font-light tabular-nums" style={{ color: colors.textPrimary }}>
                {timerMode === "flow"
                  ? formatTime(elapsed)
                  : isOverTime
                    ? `+${formatTime(elapsed - duration)}`
                    : formatTime(duration - elapsed)}
              </p>
              <p className="text-xs" style={{ color: colors.textGhost }}>
                {timerMode === "flow" ? "focused" : isOverTime ? "you're in flow ✦" : "remaining"}
              </p>
            </div>
          </div>

          {task && (
            <div className="px-4 py-3 rounded-2xl max-w-xs text-center" style={{ backgroundColor: colors.muted }}>
              <p className="text-sm font-light" style={{ color: colors.textSecondary }}>{task.ai_summary}</p>
            </div>
          )}

          {isOverTime && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-light" style={{ color: colors.amber }}>
                You focused for {formatTime(elapsed)} 🌟
              </p>
              <button type="button" onClick={extendTimer}
                className="px-4 py-2 rounded-xl text-xs font-medium"
                style={{ backgroundColor: colors.amberLight, color: colors.amberDeep }}>
                5 more minutes
              </button>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col gap-3">
          {timerActive ? (
            <>
              <button type="button" onClick={stopTimer}
                className="w-full py-3 rounded-2xl text-sm font-medium"
                style={{ backgroundColor: colors.sageLight, color: colors.sageDeep }}>
                End session
              </button>
              <p className="text-xs text-center" style={{ color: colors.textGhost }}>
                You focused for {formatTime(elapsed)} so far
              </p>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                {(Object.entries(TIMER_LABELS) as [TimerMode, typeof TIMER_LABELS[TimerMode]][]).map(([key, config]) => (
                  <button type="button" key={key} onClick={() => setTimerMode(key)}
                    className="flex-1 py-2 px-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      backgroundColor: timerMode === key ? colors.sage : colors.muted,
                      color: timerMode === key ? "white" : colors.textSecondary,
                    }}>
                    {config.emoji} {config.name}
                  </button>
                ))}
              </div>
              <button type="button" onClick={startTimer}
                className="w-full py-3 rounded-2xl text-white font-medium"
                style={{ backgroundColor: colors.sage }}>
                Start {TIMER_LABELS[timerMode].name} session
              </button>
              <button type="button" onClick={() => setMode("task")}
                className="text-sm text-center" style={{ color: colors.textGhost }}>
                Back to task
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (mode === "parking") {
    return (
      <div className="flex flex-col min-h-screen px-6 pt-14 pb-8 gap-4" style={{ backgroundColor: colors.bg }}>
        <div>
          <h2 className="text-xl font-light mb-1" style={{ color: colors.textPrimary }}>🅿️ Park a thought</h2>
          <p className="text-sm font-light" style={{ color: colors.textSecondary }}>
            Get it out of your head without losing your focus. It'll be waiting in your inbox.
          </p>
        </div>

        <button type="button"
          onMouseDown={startParkVoice}
          onMouseUp={stopParkVoice}
          onTouchStart={startParkVoice}
          onTouchEnd={stopParkVoice}
          className="w-full py-4 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
          style={{
            backgroundColor: parkRecording ? colors.sage : colors.sageLight,
            color: parkRecording ? "white" : colors.sageDeep,
          }}>
          <span>{parkRecording ? "🔴" : "🎙"}</span>
          {parkRecording ? "Release when done" : "Hold to speak"}
        </button>

        <textarea
          className="w-full h-28 p-4 rounded-2xl text-sm resize-none outline-none border font-light"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.subtle,
            color: colors.textPrimary,
            fontFamily: "Inter, sans-serif",
          }}
          placeholder="Or type quickly..."
          value={parkText}
          onChange={(event) => setParkText(event.target.value)}
        />

        <div className="flex gap-3">
          <button type="button" onClick={parkTextThought} disabled={!parkText.trim()}
            className="flex-1 py-3 rounded-2xl text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: colors.sage }}>
            Park it
          </button>
          <button type="button" onClick={() => setMode("timer")}
            className="py-3 px-4 rounded-2xl text-sm"
            style={{ color: colors.textMuted }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (mode === "empty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center gap-6" style={{ backgroundColor: colors.bg }}>
        <span className="text-5xl">🌿</span>
        <div>
          <h2 className="text-xl font-light mb-2" style={{ color: colors.textPrimary }}>Nothing urgent right now.</h2>
          <p className="text-sm font-light" style={{ color: colors.textSecondary }}>
            Your inbox is clear. A good time to capture something new.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button type="button" onClick={() => setScreen("capture_idle")}
            className="w-full py-3 rounded-2xl text-white font-medium"
            style={{ backgroundColor: colors.sage }}>
            Capture something
          </button>
          <button type="button" onClick={startTimer}
            className="w-full py-3 rounded-2xl text-sm font-medium"
            style={{ backgroundColor: colors.sageLight, color: colors.sageDeep }}>
            Start a focus session anyway
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-screen px-8 pt-14 pb-8" style={{ backgroundColor: colors.bg }}>
      {celebrating && <WinBurst />}

      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        <p className="text-xs uppercase tracking-widest" style={{ color: colors.textGhost }}>ONE THING</p>

        {task && (
          <>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <TypeBadge type={task.capture_type} />
              <EnergyBadge level={task.energy_level || "medium"} />
            </div>
            <h2 className="text-2xl font-light leading-relaxed max-w-xs" style={{ color: colors.textPrimary }}>
              {task.ai_summary}
            </h2>
          </>
        )}
      </div>

      <div className="w-full flex flex-col gap-3">
        {mode === "done" ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-4xl">🎉</span>
            <p className="text-sm" style={{ color: colors.textSecondary }}>You did it.</p>
          </div>
        ) : (
          <>
            <button type="button" onClick={handleDone}
              className="w-full py-4 rounded-2xl text-white font-medium text-base transition-all active:scale-95"
              style={{ backgroundColor: colors.sage }}>
              Done ✓
            </button>

            <div className="flex gap-3">
              <button type="button" onClick={() => setMode("timer")}
                className="flex-1 py-3 rounded-2xl text-sm font-medium"
                style={{ backgroundColor: colors.sageLight, color: colors.sageDeep }}>
                ⏱ Focus timer
              </button>
              <button type="button" onClick={handleRoulette}
                className="flex-1 py-3 rounded-2xl text-sm font-medium"
                style={{ backgroundColor: colors.lavenderLight, color: colors.lavender }}>
                🎲 Different task
                {!user?.is_pro && rerolls > 0 && (
                  <span className="ml-1 text-xs opacity-70">({MAX_REROLLS - rerolls} left)</span>
                )}
              </button>
            </div>

            <button type="button" onClick={() => setScreen("inbox_full")}
              className="text-sm text-center" style={{ color: colors.textGhost }}>
              See everything
            </button>
          </>
        )}
      </div>
    </div>
  );
}
