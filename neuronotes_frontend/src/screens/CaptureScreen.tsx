import { useState, useRef, useEffect } from "react";
import { uploadVoice, submitText } from "../services/api";
import { useStore } from "../store/useStore";
import { colors, GREETINGS, EMOTIONAL_CONFIG, randomFrom } from "../utils/design";
import { WinBurst } from "../components/ui";
import PixelCat from "../components/PixelCat";
import type { Screen } from "../App";
import type { EmotionalState } from "../store/useStore";

type Mode = "checkin" | "idle" | "recording" | "processing" | "result" | "text";

const FREE_LIMIT = 10;

export default function CaptureScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const {
    addCapture,
    user,
    todayCount,
    emotionalState,
    setEmotionalState,
    celebrateId,
    setCelebrate,
    recordToday,
  } = useStore();
  const [mode, setMode] = useState<Mode>(() => emotionalState ? "idle" : "checkin");
  const [result, setResult] = useState<any>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const [submittingText, setSubmittingText] = useState(false);
  const greeting = randomFrom(GREETINGS);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const atLimit = !user?.is_pro && todayCount >= FREE_LIMIT;

  useEffect(() => {
    if (!celebrateId) return;
    setCelebrating(true);
    const timer = window.setTimeout(() => {
      setCelebrating(false);
      setCelebrate(null);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [celebrateId, setCelebrate]);

  const handleCheckin = (state: EmotionalState) => {
    setEmotionalState(state);
    setMode("idle");
  };

  const startRec = async () => {
    if (atLimit) { setScreen("paywall"); return; }
    setError("");
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = handleStop;
      mediaRef.current = recorder;
      recorder.start();
      setMode("recording");
    } catch {
      setError("Microphone needed. Use text mode below.");
    }
  };

  const stopRec = () => {
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach((track) => track.stop());
    setMode("processing");
  };

  const handleStop = async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    try {
      const data = await uploadVoice(blob);
      addCapture(data.capture);
      recordToday();
      setResult(data.capture);
      setMode("result");
    } catch (exception: any) {
      if (exception.message === "PAYWALL") { setScreen("paywall"); return; }
      setError("Hmm, that didn't save. Try again?");
      setMode("idle");
    }
  };

  const handleText = async () => {
    if (!text.trim()) return;
    if (atLimit) { setScreen("paywall"); return; }
    setSubmittingText(true);
    setError("");
    try {
      const data = await submitText(text.trim());
      addCapture(data.capture);
      recordToday();
      setText("");
      setResult(data.capture);
      setMode("result");
    } catch (exception: any) {
      if (exception.message === "PAYWALL") { setScreen("paywall"); return; }
      setError("Hmm, that didn't save. Try again?");
    } finally {
      setSubmittingText(false);
    }
  };

  if (mode === "checkin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-8"
        style={{ backgroundColor: colors.bg }}>
        <div className="text-center">
          <p className="text-xl font-light mb-2" style={{ color: colors.textPrimary }}>
            How are you feeling right now?
          </p>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            I'll show you tasks that match your energy
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {(Object.entries(EMOTIONAL_CONFIG) as [Exclude<EmotionalState, null>, typeof EMOTIONAL_CONFIG[keyof typeof EMOTIONAL_CONFIG]][])
            .map(([key, config]) => (
              <button type="button" key={key} onClick={() => handleCheckin(key)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95"
                style={{ backgroundColor: config.bg }}>
                <span className="text-3xl">{config.emoji}</span>
                <span className="text-xs font-medium" style={{ color: config.text }}>{config.label}</span>
              </button>
            ))}
        </div>

        <button type="button" onClick={() => setMode("idle")}
          className="text-sm" style={{ color: colors.textGhost }}>
          Skip for now
        </button>
      </div>
    );
  }

  if (mode === "result" && result) {
    const typeColors: Record<string, { bg: string; text: string }> = {
      task: { bg: colors.sageLight, text: colors.sageDeep },
      note: { bg: colors.muted, text: colors.textSecondary },
      idea: { bg: colors.lavenderLight, text: colors.lavender },
      feeling: { bg: colors.peachLight, text: colors.peachText },
    };
    const typeColor = typeColors[result.capture_type] || typeColors.note;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6"
        style={{ backgroundColor: colors.bg }}>
        {celebrating && <WinBurst />}
        <p className="text-sm" style={{ color: colors.textSecondary }}>Saved to your inbox 🌿</p>

        <div className="w-full max-w-sm rounded-2xl p-5 bg-white border shadow-sm"
          style={{ borderColor: colors.subtle }}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: typeColor.bg, color: typeColor.text }}>
              {result.capture_type}
            </span>
            {result.urgency !== "low" && (
              <span className="text-xs" style={{ color: colors.amber }}>
                {result.urgency === "high" ? "↑ soon" : "· sometime"}
              </span>
            )}
          </div>
          <p className="text-base leading-relaxed font-light" style={{ color: colors.textPrimary }}>
            {result.ai_summary}
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <button type="button" onClick={() => { setMode("idle"); setResult(null); }}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: colors.sageLight, color: colors.sageDeep }}>
            Capture another
          </button>
          <button type="button" onClick={() => setScreen("inbox_full")}
            className="w-full py-3 rounded-xl text-sm"
            style={{ color: colors.textMuted }}>
            See inbox
          </button>
        </div>
      </div>
    );
  }

  if (mode === "text") {
    return (
      <div className="flex flex-col min-h-screen px-6 pt-20 gap-4"
        style={{ backgroundColor: colors.bg }}>
        <p className="text-lg font-light" style={{ color: colors.textSecondary }}>
          What's in your head?
        </p>
        <textarea
          className="w-full h-44 p-4 rounded-2xl text-sm leading-relaxed resize-none outline-none border"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.subtle,
            color: colors.textPrimary,
            fontFamily: "Inter, sans-serif",
          }}
          placeholder="Don't organize it. Just get it out."
          value={text}
          onChange={(event) => setText(event.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-center" style={{ color: colors.amber }}>{error}</p>}
        <button type="button" onClick={handleText} disabled={!text.trim() || submittingText}
          className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-40"
          style={{ backgroundColor: colors.sage }}>
          {submittingText ? "Saving..." : "Save this"}
        </button>
        <button type="button" onClick={() => setMode("idle")}
          className="text-sm text-center" style={{ color: colors.textGhost }}>
          Back to voice
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-screen px-6 pt-14 pb-6"
      style={{ backgroundColor: colors.bg }}>
      {celebrating && <WinBurst />}

      <div className="w-full flex flex-col items-center gap-1">
        <PixelCat size={54} sparkles={mode === "processing"} className="mb-1.5" />
        {emotionalState && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-base">{EMOTIONAL_CONFIG[emotionalState]?.emoji}</span>
            <span className="text-xs" style={{ color: colors.textMuted }}>
              {EMOTIONAL_CONFIG[emotionalState]?.label} mode
            </span>
            <button type="button" onClick={() => setMode("checkin")}
              className="text-xs ml-1" style={{ color: colors.textGhost }}>
              change
            </button>
          </div>
        )}
        <p className="text-base font-light" style={{ color: colors.textSecondary }}>
          {mode === "recording" ? "Listening..." : greeting}
        </p>
        {!user?.is_pro && (
          <p className="text-xs" style={{ color: colors.textGhost }}>
            {todayCount}/{FREE_LIMIT} today
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-6">
        {mode === "processing" ? (
          <div className="w-44 h-44 rounded-full flex items-center justify-center"
            style={{ backgroundColor: colors.sageLight }}>
            <div className="w-8 h-8 rounded-full animate-pulse"
              style={{ backgroundColor: colors.sage }} />
          </div>
        ) : (
          <button type="button"
            onMouseDown={startRec}
            onMouseUp={mode === "recording" ? stopRec : undefined}
            onTouchStart={startRec}
            onTouchEnd={mode === "recording" ? stopRec : undefined}
            className="w-44 h-44 rounded-full flex items-center justify-center select-none transition-all duration-200"
            style={{
              backgroundColor: mode === "recording" ? colors.sage : colors.sageLight,
              transform: mode === "recording" ? "scale(0.95)" : "scale(1)",
              boxShadow: mode === "recording"
                ? `0 0 0 18px ${colors.sage}18, 0 0 0 36px ${colors.sage}08`
                : `0 8px 40px ${colors.sage}33`,
            }}>
            <span className="text-5xl select-none">🎙</span>
          </button>
        )}

        <p className="text-xs" style={{ color: colors.textGhost }}>
          {mode === "recording" ? "Release when done" : "Hold to speak"}
        </p>
        {error && <p className="text-sm text-center" style={{ color: colors.amber }}>{error}</p>}
      </div>

      {mode === "idle" && (
        <button type="button" onClick={() => setMode("text")}
          className="text-sm" style={{ color: colors.textGhost }}>
          Prefer to type instead
        </button>
      )}
    </div>
  );
}
