import { useEffect, useMemo, useRef, useState } from "react";
import { C, F } from "../utils/tokens";
import { useStore } from "../store/useStore";
import PixelCat from "../components/PixelCat";
import { chatService } from "../services";
import type { Screen } from "../App";

const STARTERS = [
  "I'm overwhelmed.",
  "I can't get started.",
  "I had a bad day.",
  "I actually got something done!",
  "I don't know what to do first.",
];

const OPENERS = {
  overwhelmed: "Hey. You're allowed to have messy days here.",
  low: "Low energy is valid. What's going on?",
  okay: "Hey! What's on your mind?",
  energized: "Love the energy. What's feeling exciting?",
};

type ChatMessage = { role: "user" | "assistant"; content: string; failed?: boolean; retrying?: boolean };

export default function CompanionScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const { user, emotionalState } = useStore();
  const state = emotionalState || "okay";
  const avatarKey = (user?.avatar_id || user?.cat_avatar || "sage-cat").replace("-cat", "") as
    | "sage"
    | "lavender"
    | "amber"
    | "cloud"
    | "cocoa"
    | "peach";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingUserMessageRef = useRef<string | null>(null);

  const displayName = useMemo(() => user?.name?.split(" ")[0] || "friend", [user?.name]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const history = await chatService.getHistory();
        if (!cancelled) {
          setMessages(history.length ? history : [{ role: "assistant", content: OPENERS[state] }]);
        }
      } catch {
        if (!cancelled) setMessages([{ role: "assistant", content: OPENERS[state] }]);
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    };

    void loadHistory();
    return () => { cancelled = true; };
  }, [user?.token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages: ChatMessage[] = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setSending(true);
    pendingUserMessageRef.current = trimmed;

    try {
      const reply = await chatService.sendMessage(nextMessages, state);
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      pendingUserMessageRef.current = null;
    } catch (error) {
      // Add failed assistant message with retry option
      setMessages((current) => [...current, {
        role: "assistant",
        content: "I'm having trouble connecting. Want me to try again?",
        failed: true,
      }]);
      pendingUserMessageRef.current = null;
    } finally {
      setSending(false);
    }
  };

  const retryLastMessage = async () => {
    if (!pendingUserMessageRef.current || sending) return;
    
    const lastUserMessage = pendingUserMessageRef.current;
    const nextMessages: ChatMessage[] = [...messages.filter(m => m.role !== "assistant" || !m.failed), { role: "user", content: lastUserMessage }];
    setSending(true);

    try {
      const reply = await chatService.sendMessage(nextMessages, state);
      setMessages((current) => [...current.filter(m => m.role !== "assistant" || !m.failed), { role: "assistant", content: reply }]);
      pendingUserMessageRef.current = null;
    } catch {
      // Keep the failed message
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col" style={{ backgroundColor: C.bg }}>
      <header className="px-5 pb-4 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => setScreen("capture_idle")} className="text-sm" style={{ color: C.textSub, fontFamily: F.sans }}>
            Back
          </button>
          <div className="flex items-center gap-2 rounded-full border px-2.5 py-1.5" style={{ backgroundColor: "rgba(255,255,255,0.55)", borderColor: C.borderLight }}>
            <PixelCat variant={avatarKey} size={22} />
            <span className="text-xs" style={{ color: C.text, fontFamily: F.sans, fontWeight: 600 }}>NeuroNotes</span>
          </div>
        </div>

        <div className="rounded-[28px] border p-4 shadow-sm" style={{ backgroundColor: "#F9F5F0", borderColor: C.borderLight }}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: C.sageLight }}>
              <PixelCat variant={avatarKey} size={28} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: C.textMuted, fontFamily: F.sans, fontWeight: 700 }}>Companion</p>
              <h1 className="text-[26px] leading-none" style={{ color: C.text, fontFamily: F.serif }}>NeuroNotes Companion</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6" style={{ color: C.textSub, fontFamily: F.sans }}>
            You’re allowed to have messy days, {displayName}.
          </p>
        </div>
      </header>

      <section className="flex-1 px-5 pb-4">
        <div className="flex h-full flex-col rounded-[28px] border" style={{ backgroundColor: "rgba(255,255,255,0.52)", borderColor: C.borderLight }}>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length <= 1 && historyLoaded && (
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => void sendMessage(starter)}
                    disabled={sending}
                    className="rounded-full border px-2.5 py-1.5 text-[11px] disabled:opacity-50"
                    style={{ borderColor: C.borderLight, color: C.textSub, fontFamily: F.sans }}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}-${message.failed ? 'failed' : ''}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[82%] rounded-[20px] px-3.5 py-2.5 text-[15px] leading-6"
                  style={{
                    backgroundColor: message.role === "user" ? C.sage : message.failed ? "#FFF3E0" : "#F5F0E8",
                    color: message.role === "user" ? "#FFFFFF" : C.text,
                    fontFamily: F.sans,
                  }}
                >
                  {message.content}
                </div>
                {message.failed && message.role === "assistant" && (
                  <div style={{ marginLeft: 8, marginTop: 4 }}>
                    <button
                      onClick={retryLastMessage}
                      disabled={sending}
                      className="rounded-full px-2.5 py-1.5 text-[11px] disabled:opacity-50"
                      style={{ borderColor: C.sage, color: C.sage, fontFamily: F.sans, background: "transparent" }}
                    >
                      {sending ? "Retrying…" : "Retry"}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {sending && !messages[messages.length - 1]?.failed && (
              <div className="flex justify-start">
                <div className="rounded-[20px] bg-[#F5F0E8] px-3.5 py-2.5" style={{ fontFamily: F.sans, color: C.textSub }}>
                  <span className="inline-block animate-pulse">…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t p-3" style={{ borderColor: C.borderLight }}>
            <div className="flex items-center gap-2 rounded-[18px] border bg-white p-2" style={{ borderColor: C.borderLight }}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void sendMessage(draft);
                  }
                }}
                placeholder="Tell me what's on your mind"
                className="flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none"
                style={{ color: C.text, fontFamily: F.sans }}
              />
              <button
                type="button"
                onClick={() => void sendMessage(draft)}
                disabled={!draft.trim() || sending || !historyLoaded}
                className="rounded-full px-3 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: C.sage, color: "#fff", fontFamily: F.sans }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
