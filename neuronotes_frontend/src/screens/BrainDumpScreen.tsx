import { useState, useRef, useEffect } from "react";
import { brainDump, brainDumpText } from "../services/api";
import { useStore } from "../store/useStore";
import { colors } from "../utils/design";
import { TypeBadge, EnergyBadge, WinBurst } from "../components/ui";
import type { Screen } from "../App";
import type { Capture } from "../store/useStore";

const FREE_DUMPS_PER_DAY = 3;
const DUMP_DURATION = 120;

type Mode = "intro" | "recording" | "processing" | "results" | "text";

export default function BrainDumpScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const { addCaptures, user, recordToday } = useStore();
  const [mode, setMode] = useState<Mode>("intro");
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState<Capture[]>([]);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState("");
  const [dumpsUsed] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const atFreeLimit = !user?.is_pro && dumpsUsed >= FREE_DUMPS_PER_DAY;

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
  };

  const stopDump = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
      mediaRef.current.stream.getTracks().forEach((track) => track.stop());
      setMode("processing");
    }
  };

  const startDump = async () => {
    if (atFreeLimit) { setScreen("paywall"); return; }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = handleDumpStop;
      mediaRef.current = recorder;
      recorder.start();
      setMode("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((previous) => {
          if (previous >= DUMP_DURATION - 1) {
            stopDump();
            return DUMP_DURATION;
          }
          return previous + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone needed. Use text mode instead.");
    }
  };

  const handleDumpStop = async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    try {
      const data = await brainDump(blob);
      addCaptures(data.captures);
      recordToday();
      setResults(data.captures);
      setMode("results");
    } catch (exception: any) {
      if (exception.message === "PAYWALL") { setScreen("paywall"); return; }
      setError("Hmm, that didn't save. Try again?");
      setMode("intro");
    }
  };

  const handleTextDump = async () => {
    if (!textInput.trim()) return;
    if (atFreeLimit) { setScreen("paywall"); return; }
    setMode("processing");
    try {
      const data = await brainDumpText(textInput.trim());
      addCaptures(data.captures);
      recordToday();
      setTextInput("");
      setResults(data.captures);
      setMode("results");
    } catch (exception: any) {
      if (exception.message === "PAYWALL") { setScreen("paywall"); return; }
      setError("Hmm, something went wrong. Try again?");
      setMode("text");
    }
  };

  if (mode === "intro") {
    return (
      <div className="flex flex-col min-h-screen px-6 pt-16 pb-8" style={{ backgroundColor: colors.bg }}>
        <div className="flex-1 flex flex-col justify-center gap-8">
          <div>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
              style={{ backgroundColor: colors.sageLight }}>🌊</div>
            <h1 className="text-2xl font-light mb-2" style={{ color: colors.textPrimary }}>
              Brain Dump Mode
            </h1>
            <p className="text-base font-light leading-relaxed" style={{ color: colors.textSecondary }}>
              Talk for up to 2 minutes. Say everything that's in your head.
              Don't organize - we'll do that for you.
            </p>
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ backgroundColor: colors.muted }}>
            <p className="text-xs font-medium" style={{ color: colors.textSecondary }}>How it works</p>
            {[
              ["🎙", "Speak freely for up to 2 minutes"],
              ["🧠", "AI splits it into individual captures"],
              ["📥", "Everything lands neatly in your inbox"],
            ].map(([emoji, text]) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-lg">{emoji}</span>
                <p className="text-sm font-light" style={{ color: colors.textPrimary }}>{text}</p>
              </div>
            ))}
          </div>

          {!user?.is_pro && (
            <p className="text-xs text-center" style={{ color: colors.textGhost }}>
              {FREE_DUMPS_PER_DAY - dumpsUsed} brain dumps remaining today -{" "}
              <button type="button" onClick={() => setScreen("paywall")} className="underline" style={{ color: colors.sage }}>
                Go unlimited with Pro
              </button>
            </p>
          )}
          {error && <p className="text-sm text-center" style={{ color: colors.amber }}>{error}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <button type="button" onClick={startDump}
            className="w-full py-4 rounded-2xl text-white font-medium text-base transition-all active:scale-95"
            style={{ backgroundColor: colors.sage }}>
            Start brain dump 🎙
          </button>
          <button type="button" onClick={() => setMode("text")}
            className="w-full py-3 rounded-2xl text-sm font-medium"
            style={{ backgroundColor: colors.sageLight, color: colors.sageDeep }}>
            Type instead
          </button>
        </div>
      </div>
    );
  }

  if (mode === "recording") {
    const progress = elapsed / DUMP_DURATION;
    const circumference = 2 * Math.PI * 80;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-8" style={{ backgroundColor: colors.bg }}>
        <div className="relative flex items-center justify-center">
          <svg width="200" height="200" className="-rotate-90" aria-label="Recording progress">
            <circle cx="100" cy="100" r="80" fill="none" stroke={colors.subtle} strokeWidth="4" />
            <circle cx="100" cy="100" r="80" fill="none" stroke={colors.sage} strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.sageLight, animation: "gentlePulse 2s ease-in-out infinite" }}>
              <span className="text-2xl">🎙</span>
            </div>
            <p className="text-xl font-light tabular-nums" style={{ color: colors.textPrimary }}>
              {formatTime(elapsed)}
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg font-light" style={{ color: colors.textSecondary }}>Just talk.</p>
          <p className="text-sm mt-1" style={{ color: colors.textGhost }}>Don't organize - we'll do that.</p>
        </div>

        <button type="button" onClick={stopDump}
          className="px-8 py-3 rounded-2xl text-sm font-medium"
          style={{ backgroundColor: colors.sageLight, color: colors.sageDeep }}>
          I'm done
        </button>

        <style>{`@keyframes gentlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }`}</style>
      </div>
    );
  }

  if (mode === "processing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6" style={{ backgroundColor: colors.bg }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: colors.sageLight }}>
            <span className="text-2xl animate-spin" style={{ animationDuration: "3s" }}>🧠</span>
          </div>
          <p className="text-base font-light" style={{ color: colors.textSecondary }}>Sorting your thoughts...</p>
          <p className="text-sm" style={{ color: colors.textGhost }}>This takes about 10 seconds</p>
        </div>
      </div>
    );
  }

  if (mode === "text") {
    return (
      <div className="flex flex-col min-h-screen px-6 pt-16 pb-8 gap-4" style={{ backgroundColor: colors.bg }}>
        <div>
          <h1 className="text-xl font-light mb-1" style={{ color: colors.textPrimary }}>Text brain dump</h1>
          <p className="text-sm font-light" style={{ color: colors.textSecondary }}>
            Write everything in your head. Stream of consciousness is perfect.
          </p>
        </div>

        <textarea
          className="flex-1 w-full min-h-64 p-4 rounded-2xl text-sm leading-relaxed resize-none outline-none border"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.subtle,
            color: colors.textPrimary,
            fontFamily: "Inter, sans-serif",
          }}
          placeholder="call dentist, reply to sarah, what if the app had a timer, feeling overwhelmed today, need to buy milk..."
          value={textInput}
          onChange={(event) => setTextInput(event.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-center" style={{ color: colors.amber }}>{error}</p>}
        <div className="flex flex-col gap-3">
          <button type="button" onClick={handleTextDump} disabled={!textInput.trim()}
            className="w-full py-4 rounded-2xl text-white font-medium disabled:opacity-40"
            style={{ backgroundColor: colors.sage }}>
            Sort my thoughts
          </button>
          <button type="button" onClick={() => setMode("intro")}
            className="text-sm text-center" style={{ color: colors.textGhost }}>
            Back to voice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-14 pb-8" style={{ backgroundColor: colors.bg }}>
      <WinBurst />
      <div className="mb-5">
        <h1 className="text-2xl font-light mb-1" style={{ color: colors.textPrimary }}>
          We found {results.length} things 🧠
        </h1>
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          All saved to your inbox. Here's what came out:
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {results.map((capture, index) => (
          <div key={capture.id} className="rounded-2xl p-4 bg-white border shadow-sm"
            style={{ borderColor: colors.subtle, animation: `slideUp 0.3s ease-out ${index * 80}ms both` }}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <TypeBadge type={capture.capture_type} />
              <EnergyBadge level={capture.energy_level || "medium"} />
            </div>
            <p className="text-sm leading-relaxed font-light" style={{ color: colors.textPrimary }}>
              {capture.ai_summary}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <button type="button" onClick={() => setScreen("inbox_full")}
          className="w-full py-3 rounded-2xl text-white font-medium"
          style={{ backgroundColor: colors.sage }}>
          Go to inbox
        </button>
        <button type="button" onClick={() => setMode("intro")}
          className="w-full py-3 rounded-2xl text-sm font-medium"
          style={{ backgroundColor: colors.sageLight, color: colors.sageDeep }}>
          Another dump
        </button>
      </div>

      <style>{`@keyframes slideUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }`}</style>
    </div>
  );
}
