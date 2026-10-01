import { useState, useEffect, useRef, useCallback } from "react";
import { PixelCat, type CatState } from "./components/PixelCat";
import { authService, chatService, consentService } from "./services/index";
import CompanionScreen from "./screens/CompanionScreen";
import { useStore } from "./store/useStore";
import type { SupabaseSession } from "./lib/supabase";
import {
  checkProStatus,
  getOfferings,
  getSubscriptionManagementURL,
  initRevenueCat,
  purchasePackage,
  restorePurchases,
  presentPaywall,
  RevenueCatUI,
  PAYWALL_RESULT,
  type Offering,
  type RevenueCatPackage,
} from "./services/revenuecat";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Screen =
  | "consent"
  | "onboarding1" | "onboarding2" | "onboarding3"
  | "auth_login" | "auth_register" | "auth_callback" | "auth_check_email"
  | "capture" | "capture_idle" | "capture_recording" | "capture_processing" | "capture_result" | "capture_text"
  | "mic_permission"
  | "brain_dump" | "brain_dump_result"
  | "inbox" | "inbox_full" | "inbox_empty"
  | "focus" | "focus_task" | "focus_empty"
  | "timer"
  | "stats"
  | "roulette"
  | "companion"
  | "profile"
  | "win" | "paywall" | "settings";

type Tab = "capture" | "inbox" | "focus" | "settings";
type CaptureType = "task" | "note" | "idea" | "feeling";
type Urgency = "low" | "medium" | "high";
type Energy = "high" | "medium" | "low" | "micro";
type Mood = "overwhelmed" | "low" | "okay" | "energized";

interface Card {
  id: number; type: CaptureType; urgency: Urgency; energy: Energy;
  text: string; time: string; done: boolean; archived: boolean;
}

interface SavedCapture {
  ai_summary?: string;
  raw_transcript?: string;
  capture_type?: CaptureType;
  urgency?: Urgency;
  energy_level?: Energy;
  is_done?: boolean;
  is_archived?: boolean;
}

function toCard(capture: SavedCapture, id = Date.now()): Card {
  return {
    id,
    type: capture.capture_type ?? "note",
    urgency: capture.urgency ?? "low",
    energy: capture.energy_level ?? "medium",
    text: capture.ai_summary || capture.raw_transcript || "Capture saved",
    time: "just now",
    done: Boolean(capture.is_done),
    archived: Boolean(capture.is_archived),
  };
}

interface ChatMsg { id: number; role: "user" | "assistant"; content: string; }

function restoreAppUser(session: SupabaseSession): boolean {
  const sessionUser = authService.toAppUser(session);
  if (!sessionUser) return false;

  useStore.setState((state) => ({
    user: state.user?.id === sessionUser.id
      ? {
          ...state.user,
          email: sessionUser.email,
          token: sessionUser.token,
          supabaseToken: sessionUser.supabaseToken,
        }
      : sessionUser,
  }));
  return true;
}

// ─── Night mode ───────────────────────────────────────────────────────────────

function useNightMode() {
  const [night, setNight] = useState(() => { const h = new Date().getHours(); return h >= 21 || h < 6; });
  useEffect(() => {
    const check = () => { const h = new Date().getHours(); setNight(h >= 21 || h < 6); };
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);
  return night;
}

// ─── Themes ───────────────────────────────────────────────────────────────────

const DAY_T = {
  bg:"#F7F5F2", surface:"#FFFFFF", muted:"#F0EDE8", subtle:"#E8E4DF", border:"#F0EDE8",
  tp:"#2C2C2C", ts:"#7A7570", tm:"#B0A9A2", tg:"#D4CEC9",
  sage:"#7B9E87", sageDp:"#4A7A5A", sageMid:"#A8C5B0", sageLt:"#D4E4D9", sageFnt:"#EDF5EF",
  amber:"#C4956A", amberLt:"#F0D5B8", amberFnt:"#FBF0E4",
  lavender:"#9B8EC4", lavLt:"#E8E4F0",
  peachLt:"#FEF3C7", peachTx:"#8B5E52",
};

const NIGHT_T = {
  bg:"#1C1810", surface:"#252119", muted:"#2D2820", subtle:"#3A342E", border:"#302A24",
  tp:"#EDE5DA", ts:"#9A9088", tm:"#6A6258", tg:"#4A433D",
  sage:"#8EAF9A", sageDp:"#6A9478", sageMid:"#6A9478",
  sageLt:"rgba(142,175,154,0.18)", sageFnt:"rgba(142,175,154,0.07)",
  amber:"#C4956A", amberLt:"rgba(240,213,184,0.18)", amberFnt:"rgba(251,240,228,0.10)",
  lavender:"#9B8EC4", lavLt:"rgba(232,228,240,0.12)",
  peachLt:"rgba(254,243,199,0.10)", peachTx:"#C4956A",
};

// ─── Fonts ────────────────────────────────────────────────────────────────────

const SERIF  = "'DM Serif Display', serif";
const SANS   = "'Manrope', sans-serif";

// ─── Data ─────────────────────────────────────────────────────────────────────

const INITIAL_CARDS: Card[] = [
  { id:1, type:"task",    urgency:"high",   energy:"high",   text:"Call the dentist before Friday",                                           time:"2h ago",    done:false, archived:false },
  { id:2, type:"task",    urgency:"medium", energy:"medium", text:"Email Sarah about the project update",                                     time:"4h ago",    done:false, archived:false },
  { id:3, type:"note",    urgency:"low",    energy:"low",    text:"Look into that book about executive function — someone mentioned it",       time:"5h ago",    done:false, archived:false },
  { id:4, type:"idea",    urgency:"low",    energy:"low",    text:"What if the nudge learned my patterns and adjusted timing automatically?",  time:"Yesterday", done:false, archived:false },
  { id:5, type:"feeling", urgency:"medium", energy:"micro",  text:"Feeling overwhelmed today — everything at once, can't find where to start", time:"Yesterday", done:false, archived:false },
];

const TYPE_COLOR: Record<CaptureType, { bg: string; fg: string }> = {
  task:    { bg: "#D4E4D9", fg: "#4A7A5A" },
  note:    { bg: "#E8E4F0", fg: "#6B5FA0" },
  idea:    { bg: "#FEF3C7", fg: "#8B5E52" },
  feeling: { bg: "#FBF0E4", fg: "#9B6A3A" },
};

const ENERGY_LABEL: Record<Energy, string> = {
  high:"🔋 high energy", medium:"⚡ medium", low:"🌿 low energy", micro:"🌿 5 min",
};

const MOCK_HISTORY: { mood: "calm"|"active"|"intense"|"rest"|null; doodle: string }[] = [
  { mood:"active",  doodle:"✦" }, { mood:"calm",    doodle:"♡" }, { mood:"rest",    doodle:"~"  },
  { mood:"active",  doodle:"☀" }, { mood:"active",  doodle:"≈" }, { mood:null,      doodle:""   },
  { mood:"calm",    doodle:"♡" }, { mood:"intense", doodle:"↯" }, { mood:"active",  doodle:"✦"  },
  { mood:"rest",    doodle:"~" }, { mood:"active",  doodle:"☀" }, { mood:"calm",    doodle:"♡"  },
  { mood:"intense", doodle:"↯" }, { mood:"active",  doodle:"✦" },
];

const MOOD_TILE_COLOR: Record<"calm"|"active"|"intense"|"rest", string> = {
  calm:"#D4E4D9", active:"#A8C5B0", intense:"#F0D5B8", rest:"#E8E4F0",
};

const DAY_LABELS = ["M","T","W","T","F","S","S"];

// ─── Cat characters ───────────────────────────────────────────────────────────

interface CatCharacter { id: string; name: string; color: string; pro: boolean; }

const CAT_CHARACTERS: CatCharacter[] = [
  { id:"sage-cat",     name:"Sage",     color:"#4A7A5A", pro:false },
  { id:"lavender-cat", name:"Lavender", color:"#7B6FC4", pro:false },
  { id:"amber-cat",    name:"Amber",    color:"#457B9D", pro:true  },
  { id:"cloud-cat",    name:"Cloud",    color:"#1f4571", pro:true  },
  { id:"cocoa-cat",    name:"Cocoa",    color:"#8a794e", pro:true  },
  { id:"peach-cat",    name:"Peach",    color:"#64314c", pro:true  },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
@keyframes breathe    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.038)} }
@keyframes ringPing   { 0%{transform:scale(.88);opacity:.13} 100%{transform:scale(1.55);opacity:0} }
@keyframes ringPing2  { 0%{transform:scale(.88);opacity:.07} 100%{transform:scale(1.75);opacity:0} }
@keyframes fadeUp     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn     { from{opacity:0} to{opacity:1} }
@keyframes slideUp    { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
@keyframes confettiFall { from{opacity:0;transform:translateY(-20px) scale(.5)} to{opacity:.72;transform:translateY(0) scale(1)} }
@keyframes spin3dot   { 0%,80%,100%{opacity:.2} 40%{opacity:1} }
@keyframes waveBar    { 0%,100%{height:6px} 50%{height:22px} }
@keyframes typingDot  { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
.breathe   { animation: breathe  3.2s ease-in-out infinite; }
.ring1     { animation: ringPing  2.1s ease-out infinite; }
.ring2     { animation: ringPing2 2.1s ease-out infinite .45s; }
.fade-up   { animation: fadeUp  .22s ease-out both; }
.fade-in   { animation: fadeIn  .18s ease-out both; }
.slide-up  { animation: slideUp .28s ease-out both; }

/* ── Responsive shell ─────────────────────────────────────────────────── */
.nn-shell-outer {
  width: 100%;
  min-height: 100dvh;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Mobile (< 640 px): fill the whole screen, no rounded frame */
.nn-shell-inner {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  border-radius: 0;
  box-shadow: none;
}

/* Tablet / desktop (>= 640 px): centred phone frame */
@media (min-width: 640px) {
  .nn-shell-inner {
    width: 390px;
    height: min(844px, 96dvh);
    border-radius: 44px;
    box-shadow: 0 32px 96px rgba(44,44,44,.24),
                0 8px 24px rgba(44,44,44,.12),
                inset 0 0 0 1px rgba(255,255,255,.10);
  }
}

/* Large desktop (>= 900 px): slightly taller to use the space */
@media (min-width: 900px) {
  .nn-shell-inner {
    width: 414px;
    height: min(896px, 96dvh);
  }
}
`;

// ─── Shared helpers ───────────────────────────────────────────────────────────

function FadeScreen({ id, children }: { id: string; children: React.ReactNode }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setVis(true)); return () => cancelAnimationFrame(r); }, []);
  return (
    <div key={id} className="absolute inset-0"
      style={{ opacity: vis ? 1 : 0, transition: "opacity .20s ease-out" }}>
      {children}
    </div>
  );
}

function StatusBar({ night }: { night: boolean }) {
  const T = night ? NIGHT_T : DAY_T;
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", height:44, flexShrink:0 }}>
      <span style={{ fontSize:13, fontWeight:500, color:T.ts, fontFamily:SANS }}>9:41</span>
      {night && <span style={{ fontSize:10, fontWeight:500, color:T.tg, letterSpacing:1, fontFamily:SANS }}>NIGHT BRAIN 🌙</span>}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x=".5" y=".5" width="21" height="11" rx="3.5" stroke={T.tm}/>
          <rect x="2" y="2" width="16" height="8" rx="2" fill={T.tm}/>
          <path d="M23 4v4a2 2 0 000-4z" fill={T.tm}/>
        </svg>
      </div>
    </div>
  );
}

function BottomNav({ tab, onTab, night }: { tab: Tab; onTab: (t: Tab) => void; night: boolean }) {
  const T = night ? NIGHT_T : DAY_T;
  const items = [
    { id:"capture" as Tab, label:"Capture",
      icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="5" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/></svg> },
    { id:"inbox"   as Tab, label:"Inbox",
      icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 7.5h16l-2 8H5L3 7.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M3 7.5L7 3h8l4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { id:"focus"   as Tab, label:"Focus",
      icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="11" r="3" fill="currentColor"/></svg> },
    { id:"settings" as Tab, label:"Settings",
      icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 4v3M11 15v3M4 11h3M15 11h3M5.5 5.5l2 2M14.5 14.5l2 2M14.5 5.5l-2 2M5.5 14.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ];
  return (
    <div style={{ position:"absolute", bottom:0, left:0, right:0, height:83, background:T.surface, borderTop:`1px solid ${T.border}`, display:"flex", alignItems:"flex-start", paddingTop:14, justifyContent:"space-around" }}>
      {items.map(item => (
        <button key={item.id} type="button" aria-label={item.label} aria-current={tab===item.id ? "page" : undefined} onClick={() => onTab(item.id)}
          style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, opacity: tab===item.id ? 1 : 0.3, transition:"opacity .15s", background:"none", border:"none", cursor:"pointer", color: tab===item.id ? DAY_T.sage : T.ts }}>
          {item.icon}
          <span style={{ fontSize:11, fontWeight:500, color:T.ts, lineHeight:"14px", fontFamily:SANS }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function TypeBadge({ type, night }: { type: CaptureType; night: boolean }) {
  const c = TYPE_COLOR[type];
  const bg = night ? "rgba(212,228,217,0.15)" : c.bg;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", height:22, padding:"0 10px", borderRadius:100, background:bg, color: night ? DAY_T.tm : c.fg, fontSize:11, fontWeight:600, fontFamily:SANS }}>
      {type}
    </span>
  );
}

function UrgencyChip({ level, night }: { level: Urgency; night: boolean }) {
  if (level === "low") return null;
  return <span style={{ fontSize:11, fontWeight:600, color: night ? NIGHT_T.amber : DAY_T.amber, fontFamily:SANS }}>{level==="high" ? "↑ urgent" : "↑ soon"}</span>;
}

function EnergyTag({ energy, night }: { energy: Energy; night: boolean }) {
  const T = night ? NIGHT_T : DAY_T;
  return <span style={{ fontSize:10, fontWeight:500, color:T.tm, fontFamily:SANS }}>{ENERGY_LABEL[energy]}</span>;
}

function Dots({ step, total=3 }: { step: number; total?: number }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{ width:i===step?8:6, height:i===step?8:6, borderRadius:99, background:i===step?"#7B9E87":"#E8E4DF", transition:"all .2s" }}/>
      ))}
    </div>
  );
}

// ─── Line icons for Paywall ───────────────────────────────────────────────────

function Icon({ name, color, size=18 }: { name: string; color?: string; size?: number }) {
  const s = color ?? DAY_T.sage;
  const sw = "1.5";
  const icons: Record<string, React.ReactNode> = {
    mic:      <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><rect x="5.5" y="1.5" width="7" height="10" rx="3.5" stroke={s} strokeWidth={sw}/><path d="M2 9c0 3.866 3.134 7 7 7s7-3.134 7-7" stroke={s} strokeWidth={sw} strokeLinecap="round"/><path d="M9 16v1.5" stroke={s} strokeWidth={sw} strokeLinecap="round"/></svg>,
    organize: <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h8M3 13h10" stroke={s} strokeWidth={sw} strokeLinecap="round"/></svg>,
    bell:     <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><path d="M9 1.5a6 6 0 016 6v3l1.5 2H1.5L3 10.5v-3a6 6 0 016-6z" stroke={s} strokeWidth={sw} strokeLinejoin="round"/><path d="M7 14.5a2 2 0 004 0" stroke={s} strokeWidth={sw}/></svg>,
    timer:    <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><circle cx="9" cy="10" r="6.5" stroke={s} strokeWidth={sw}/><path d="M9 7v3.5l2.5 2" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 1.5h5" stroke={s} strokeWidth={sw} strokeLinecap="round"/></svg>,
    dice:     <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><rect x="1.5" y="1.5" width="15" height="15" rx="3" stroke={s} strokeWidth={sw}/><circle cx="6" cy="6" r="1" fill={s}/><circle cx="12" cy="6" r="1" fill={s}/><circle cx="9" cy="9" r="1" fill={s}/><circle cx="6" cy="12" r="1" fill={s}/><circle cx="12" cy="12" r="1" fill={s}/></svg>,
    replay:   <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><path d="M3.5 9A5.5 5.5 0 1 0 5 5.5" stroke={s} strokeWidth={sw} strokeLinecap="round"/><path d="M3.5 2v3.5H7" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/><path d="M7.5 6.5l3 2.5-3 2.5V6.5z" fill={s}/></svg>,
    heart:    <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><path d="M9 15S2 10.5 2 5.5A3.5 3.5 0 018.65 4.3L9 5l.35-.7A3.5 3.5 0 0116 5.5C16 10.5 9 15 9 15z" stroke={s} strokeWidth={sw} strokeLinejoin="round"/></svg>,
    check:    <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><path d="M3 9l4.5 4.5 7.5-9" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>,
    arrow:    <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><path d="M3 9h12M11 5l4 4-4 4" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>,
    user:     <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke={s} strokeWidth={sw}/><path d="M2 16c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={s} strokeWidth={sw} strokeLinecap="round"/></svg>,
    back:     <svg width={size} height={size} viewBox="0 0 18 18" fill="none"><path d="M11 4L7 9l4 5" stroke={s} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/></svg>,
  };
  return <>{icons[name] ?? null}</>;
}

// ─── Consent ──────────────────────────────────────────────────────────────────

function Consent({ onAccept }: { onAccept: ()=>void }) {
  const T = DAY_T;
  const [checked, setChecked] = useState(false);
  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={false} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"0 32px 40px", justifyContent:"center" }}>
        <div style={{ marginBottom:32, textAlign:"center" }}>
          <PixelCat size={48} state="idle" />
        </div>
        <p style={{ fontSize:11, fontWeight:600, color:T.ts, letterSpacing:2, fontFamily:SANS, textAlign:"center", marginBottom:12 }}>BEFORE WE BEGIN</p>
        <p style={{ fontFamily:SERIF, fontSize:30, lineHeight:"36px", color:T.tp, textAlign:"center", marginBottom:12 }}>A few things to know.</p>
        <p style={{ fontSize:14, fontWeight:400, color:T.ts, fontFamily:SANS, textAlign:"center", lineHeight:"22px", marginBottom:40 }}>NeuroNotes needs your permission to provide its core features. Your data stays private and yours.</p>
        <div style={{ background:T.surface, borderRadius:16, padding:20, marginBottom:24 }}>
          <div style={{ display:"flex", gap:14, marginBottom:16 }}>
            <div style={{ flexShrink:0, marginTop:2 }}><Icon name="mic" color={T.sage} /></div>
            <div>
              <p style={{ fontSize:14, fontWeight:600, color:T.tp, fontFamily:SANS, marginBottom:2 }}>Microphone access</p>
              <p style={{ fontSize:12, fontWeight:400, color:T.ts, fontFamily:SANS, lineHeight:"18px" }}>Used only when you capture. Never recorded without your action.</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:14 }}>
            <div style={{ flexShrink:0, marginTop:2 }}><Icon name="organize" color={T.sage} /></div>
            <div>
              <p style={{ fontSize:14, fontWeight:600, color:T.tp, fontFamily:SANS, marginBottom:2 }}>Your notes stay yours</p>
              <p style={{ fontSize:12, fontWeight:400, color:T.ts, fontFamily:SANS, lineHeight:"18px" }}>Stored securely. Never shared with third parties.</p>
            </div>
          </div>
        </div>
        <label style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:32, cursor:"pointer" }}>
          <div
            onClick={() => setChecked(c => !c)}
            style={{ flexShrink:0, marginTop:2, width:20, height:20, borderRadius:6, border:`2px solid ${checked ? T.sage : T.subtle}`, background: checked ? T.sage : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", cursor:"pointer" }}>
            {checked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span style={{ fontSize:13, fontWeight:400, color:T.ts, fontFamily:SANS, lineHeight:"20px", flex:1 }}>
            I agree to the{" "}
            <a href="#" style={{ color:T.sage, textDecoration:"underline" }}>Terms of Service</a> and{" "}
            <a href="#" style={{ color:T.sage, textDecoration:"underline" }}>Privacy Policy</a>.
          </span>
        </label>
        <button
          disabled={!checked}
          onClick={() => { consentService.recordConsent({ user_id:"", terms_version:"1.0", privacy_version:"1.0", accepted_at:"" }); onAccept(); }}
          style={{ width:"100%", height:56, borderRadius:14, background: checked ? T.sage : T.subtle, color: checked ? "#FFF" : T.tm, fontSize:16, fontWeight:600, border:"none", cursor: checked ? "pointer" : "default", fontFamily:SANS, transition:"all .2s", boxShadow: checked ? "0 8px 32px rgba(123,158,135,.20)" : "none" }}>
          Continue
        </button>
      </div>
    </div>
  );
}

// ─── Mic permission ───────────────────────────────────────────────────────────

function MicPermission({ night, onAllow, onSkip }: { night: boolean; onAllow: ()=>void; onSkip: ()=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  const [state, setState] = useState<"idle"|"denied"|"unavailable">("idle");

  async function handleAllow() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      onAllow();
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.name === "NotAllowedError") setState("denied");
        else setState("unavailable");
      }
    }
  }

  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 32px" }}>
        <div style={{ width:80, height:80, borderRadius:24, background:T.sageLt, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:28 }}>
          <Icon name="mic" color={T.sageDp} size={32} />
        </div>
        <p style={{ fontFamily:SERIF, fontSize:28, lineHeight:"36px", color:T.tp, textAlign:"center", marginBottom:12 }}>Ready to capture?</p>
        <p style={{ fontSize:15, fontWeight:400, color:T.ts, fontFamily:SANS, textAlign:"center", lineHeight:"24px", marginBottom:8, maxWidth:280 }}>
          NeuroNotes uses your microphone to turn your thoughts into notes.
        </p>
        {state === "denied" && (
          <p style={{ fontSize:13, fontWeight:400, color:T.amber, fontFamily:SANS, textAlign:"center", marginTop:12, lineHeight:"20px" }}>
            Microphone access was denied. Please enable it in your browser settings and try again.
          </p>
        )}
        {state === "unavailable" && (
          <p style={{ fontSize:13, fontWeight:400, color:T.amber, fontFamily:SANS, textAlign:"center", marginTop:12, lineHeight:"20px" }}>
            Microphone not available. You can still use text capture.
          </p>
        )}
        <div style={{ display:"flex", flexDirection:"column", width:"100%", gap:12, marginTop:36 }}>
          <button onClick={handleAllow} style={{ width:"100%", height:52, borderRadius:12, background:T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)" }}>
            Allow microphone
          </button>
          <button onClick={onSkip} style={{ width:"100%", height:44, borderRadius:12, background:"transparent", color:T.tm, fontSize:14, fontWeight:500, border:"none", cursor:"pointer", fontFamily:SANS }}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cookie banner ────────────────────────────────────────────────────────────

function CookieBanner({ night, onAccept, onSettings }: { night: boolean; onAccept: ()=>void; onSettings: ()=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  return (
    <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:300, background:T.surface, borderTop:`1px solid ${T.border}`, padding:"16px 20px 28px" }}>
      <p style={{ fontSize:13, fontWeight:400, color:T.ts, fontFamily:SANS, lineHeight:"20px", marginBottom:12 }}>
        NeuroNotes uses essential cookies to keep the app working.
      </p>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onAccept} style={{ flex:1, height:40, borderRadius:10, background:T.sage, color:"#FFF", fontSize:13, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS }}>Accept</button>
        <button onClick={onSettings} style={{ flex:1, height:40, borderRadius:10, background:T.muted, color:T.ts, fontSize:13, fontWeight:500, border:"none", cursor:"pointer", fontFamily:SANS }}>Privacy settings</button>
      </div>
    </div>
  );
}

// ─── Check-in modal ───────────────────────────────────────────────────────────

function CheckInModal({ night, onSelect, onSkip }: { night: boolean; onSelect: (m: Mood) => void; onSkip: () => void }) {
  const T = night ? NIGHT_T : DAY_T;
  const moods: { id: Mood; emoji: string; label: string }[] = [
    { id:"overwhelmed", emoji:"😤", label:"Overwhelmed" }, { id:"low",      emoji:"😴", label:"Low energy" },
    { id:"okay",        emoji:"😐", label:"Okay"        }, { id:"energized",emoji:"⚡", label:"Energized"  },
  ];
  return (
    <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.28)", display:"flex", alignItems:"flex-end", zIndex:200 }}>
      <div className="slide-up" style={{ width:"100%", background:T.surface, borderRadius:"24px 24px 0 0", padding:"28px 24px 40px" }}>
        <p style={{ fontFamily:SERIF, fontSize:24, color:T.tp, textAlign:"center", marginBottom:6 }}>How are you feeling?</p>
        <p style={{ fontSize:13, fontWeight:400, color:T.ts, fontFamily:SANS, textAlign:"center", marginBottom:24 }}>The cat will sort your inbox accordingly.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {moods.map(m => (
            <button key={m.id} onClick={() => onSelect(m.id)} style={{ height:72, borderRadius:16, background:T.muted, border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, transition:"transform .1s" }}
              onMouseDown={e => e.currentTarget.style.transform="scale(.96)"}
              onMouseUp={e => e.currentTarget.style.transform="scale(1)"}>
              <span style={{ fontSize:26 }}>{m.emoji}</span>
              <span style={{ fontSize:12, fontWeight:600, color:T.ts, fontFamily:SANS }}>{m.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onSkip} style={{ marginTop:20, width:"100%", fontSize:13, fontWeight:500, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:40, fontFamily:SANS }}>Skip for now</button>
      </div>
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

function Onboarding1({ onNext }: { onNext: ()=>void }) {
  const T = DAY_T;
  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={false} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 32px" }}>
        <div style={{ position:"relative", width:240, height:200, marginBottom:44, flexShrink:0 }}>
          {[{t:0,l:24,w:128,h:128,c:"#D4E4D9",o:.72},{t:20,l:null,r:12,w:100,h:100,c:"#E8E4F0",o:.65},{t:null,b:0,l:48,w:84,h:84,c:"#F0D5B8",o:.62},{t:null,b:16,r:36,w:56,h:56,c:"#FEF3C7",o:.70},{t:64,l:0,w:40,h:40,c:"#A8C5B0",o:.52}].map((s,i)=>(
            <div key={i} style={{ position:"absolute", top:s.t??undefined, left:s.l??undefined, right:(s as {r?:number}).r??undefined, bottom:(s as {b?:number}).b??undefined, width:s.w, height:s.h, borderRadius:"50%", background:s.c, opacity:s.o }}/>
          ))}
          <div style={{ position:"absolute", bottom:8, right:24 }}><PixelCat size={42} state="idle" /></div>
        </div>
        <p style={{ fontFamily:SERIF, fontSize:36, lineHeight:"42px", color:T.tp, textAlign:"center" }}>Your brain is not broken.</p>
        <p style={{ fontFamily:SERIF, fontSize:30, lineHeight:"36px", color:T.tp, textAlign:"center", marginTop:8 }}>It just works differently.</p>
        <p style={{ fontSize:16, fontWeight:400, color:T.ts, textAlign:"center", lineHeight:"26px", marginTop:16, padding:"0 8px", fontFamily:SANS }}>NeuroNotes was built for that.</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingBottom:48, gap:24 }}>
        <Dots step={0} />
        <button onClick={onNext} style={{ width:280, height:52, borderRadius:12, background:T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)" }}>Show me</button>
      </div>
    </div>
  );
}

function Onboarding2({ onNext }: { onNext: ()=>void }) {
  const T = DAY_T;
  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={false} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 32px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:44 }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:T.sageLt, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 32px rgba(123,158,135,.20)", flexShrink:0 }}>
            <Icon name="mic" color={T.sageDp} size={28} />
          </div>
          <svg width="28" height="14" viewBox="0 0 28 14" fill="none" style={{ flexShrink:0 }}>
            <path d="M0 7h24M24 7l-6-5.5M24 7l-6 5.5" stroke={T.sageLt} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ background:T.surface, borderRadius:16, padding:12, boxShadow:"0 2px 12px rgba(44,44,44,0.06)", flexShrink:0 }}>
            <div style={{ display:"flex", gap:6, marginBottom:8 }}>
              <span style={{ height:20, padding:"0 8px", borderRadius:100, background:T.sageLt, color:T.sageDp, fontSize:10, fontWeight:600, display:"inline-flex", alignItems:"center", fontFamily:SANS }}>task</span>
              <span style={{ fontSize:10, fontWeight:600, color:T.amber, fontFamily:SANS }}>↑ soon</span>
            </div>
            <p style={{ fontSize:11, fontWeight:400, color:T.tp, lineHeight:"16px", width:94, fontFamily:SANS }}>Call dentist before Friday</p>
          </div>
        </div>
        <p style={{ fontFamily:SERIF, fontSize:36, lineHeight:"42px", color:T.tp, textAlign:"center" }}>Capture anything.</p>
        <p style={{ fontFamily:SERIF, fontSize:30, lineHeight:"36px", color:T.sage, textAlign:"center", marginTop:4 }}>We'll sort it.</p>
        <p style={{ fontSize:15, fontWeight:400, color:T.ts, textAlign:"center", lineHeight:"24px", marginTop:16, padding:"0 8px", fontFamily:SANS }}>Speak, type, or dump it all out at once. The cat will organize it.</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingBottom:48, gap:24 }}>
        <Dots step={1} />
        <button onClick={onNext} style={{ width:280, height:52, borderRadius:12, background:T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)" }}>Got it</button>
      </div>
    </div>
  );
}

function Onboarding3({ onNext }: { onNext: ()=>void }) {
  const T = DAY_T;
  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={false} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 32px" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <p style={{ fontFamily:SERIF, fontSize:36, lineHeight:"42px", color:T.tp }}>No red labels.</p>
          <p style={{ fontFamily:SERIF, fontSize:30, lineHeight:"36px", color:T.tp }}>No guilt.</p>
          <p style={{ fontFamily:SERIF, fontSize:30, lineHeight:"36px", color:T.tp }}>No "overdue."</p>
        </div>
        <div style={{ display:"flex", gap:12, width:"100%" }}>
          <div style={{ flex:1, background:T.muted, borderRadius:16, padding:16, position:"relative", overflow:"hidden", opacity:.72 }}>
            <p style={{ fontSize:10, fontWeight:600, color:T.tm, marginBottom:10, fontFamily:SANS }}>Other apps</p>
            <div style={{ background:"#FFE8E8", borderRadius:8, padding:"6px 10px", width:"fit-content" }}>
              <span style={{ fontSize:11, fontWeight:600, color:"#C0392B", fontFamily:SANS }}>3 OVERDUE</span>
            </div>
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", pointerEvents:"none" }}>
              <div style={{ width:"150%", height:1.5, background:T.tm, transform:"rotate(12deg)", opacity:.5 }}/>
            </div>
          </div>
          <div style={{ flex:1, background:T.surface, borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(44,44,44,0.06)" }}>
            <p style={{ fontSize:10, fontWeight:600, color:T.tm, marginBottom:10, fontFamily:SANS }}>NeuroNotes</p>
            <div style={{ background:T.amberFnt, borderRadius:8, padding:"6px 10px", width:"fit-content" }}>
              <span style={{ fontSize:11, fontWeight:600, color:T.amber, fontFamily:SANS }}>↑ soon</span>
            </div>
          </div>
        </div>
        <p style={{ fontSize:15, fontWeight:400, color:T.ts, textAlign:"center", lineHeight:"24px", marginTop:24, padding:"0 16px", fontFamily:SANS }}>Gentle nudges. No shame spiral. The cat approves.</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingBottom:48, gap:24 }}>
        <Dots step={2} />
        <button onClick={onNext} style={{ width:280, height:52, borderRadius:12, background:T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)" }}>Let's go</button>
      </div>
    </div>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function inputSt(focused: boolean, night: boolean, borderColor?: string): React.CSSProperties {
  const T = night ? NIGHT_T : DAY_T;
  const effectiveBorderColor = borderColor || (focused ? T.sage : T.subtle);
  return { width:"100%", height:52, borderRadius:12, borderWidth: "1.5px", borderStyle: "solid", borderColor: effectiveBorderColor, background:T.surface, padding:"0 16px", fontSize:15, fontWeight:400, fontFamily:SANS, color:T.tp, outline:"none", transition:"border-color .15s", boxSizing:"border-box" };
}

function AuthLogin({ night, onLogin, onSwitch }: { night: boolean; onLogin: ()=>void; onSwitch: ()=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  const [f1, sf1] = useState(false);
  const [f2, sf2] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const validateEmail = (e: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowResend(false);

    const newEmailError = !email ? "Email is required" : !validateEmail(email) ? "Invalid email format" : "";
    const newPasswordError = !password ? "Password is required" : "";

    setEmailError(newEmailError);
    setPasswordError(newPasswordError);

    if (newEmailError || newPasswordError) return;

    setLoading(true);
    try {
      const { authService } = await import("./services/index");
      const userData = await authService.signIn(email, password);
      if (userData?.user) {
        const { useStore } = await import("./store/useStore");
        useStore.getState().setUser(userData.user);
      }
      onLogin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      if (msg === "EMAIL_NOT_CONFIRMED") {
        setError("Please verify your email before signing in.");
        setShowResend(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setLoading(true);
    try {
      const { authService } = await import("./services/index");
      await authService.resendVerificationEmail(email);
      setError("Verification email sent! Please check your inbox.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend verification email";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const { authService } = await import("./services/index");
      await authService.signInWithOAuth("google");
      // OAuth redirects to Google, so we won't reach here unless there's an error
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign in failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 24px 0", overflowY:"auto" }}>
        <div style={{ width:72, height:72, borderRadius:20, background:T.sageLt, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16, flexShrink:0 }}>
          <PixelCat size={44} state="happy" night={night} />
        </div>
        <p style={{ fontFamily:SERIF, fontSize:28, color:T.tp }}>NeuroNotes</p>
        <p style={{ fontSize:13, fontWeight:500, color:T.ts, marginTop:8, marginBottom:36, fontFamily:SANS }}>Finally built for your brain.</p>
        <form id="auth-login-form" onSubmit={handleSubmit} style={{ width:"100%", display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
              onFocus={() => sf1(true)}
              onBlur={() => sf1(false)}
              style={{ ...inputSt(f1, night, emailError ? (night ? NIGHT_T.amber : DAY_T.amber) : undefined), color: T.tp }}
              disabled={loading}
            />
            {emailError && <span style={{ fontSize:11, color: night ? NIGHT_T.amber : DAY_T.amber, fontFamily: SANS }}>{emailError}</span>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(""); }}
                onFocus={() => sf2(true)}
                onBlur={() => sf2(false)}
                style={{ ...inputSt(f2, night, passwordError ? (night ? NIGHT_T.amber : DAY_T.amber) : undefined), color: T.tp, paddingRight: 48 }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.tm,
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M17.5 17.5L2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M1 12.2C1 7.03 5.03 3 10 3c1.78 0 3.43.57 4.76 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14 8.7c.56 1.38 1.35 2.65 2.44 3.7C13.43 17 11.78 18 10 18c-4.97 0-9-4.03-9-9 0-.76.1-1.5.29-2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M1 12.2C1 7.03 5.03 3 10 3c1.78 0 3.43.57 4.76 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14 8.7c.56 1.38 1.35 2.65 2.44 3.7C13.43 17 11.78 18 10 18c-4.97 0-9-4.03-9-9 0-.76.1-1.5.29-2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
            {passwordError && <span style={{ fontSize:11, color: night ? NIGHT_T.amber : DAY_T.amber, fontFamily: SANS }}>{passwordError}</span>}
          </div>
        </form>
        {error && (
          <div style={{ width:"100%", fontSize:13, color: night ? NIGHT_T.amber : DAY_T.amber, fontFamily: SANS, textAlign:"center", marginBottom:12 }}>
            {error}
            {showResend && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={handleResendVerification}
                  disabled={loading}
                  style={{
                    background: "none",
                    border: "none",
                    color: T.sage,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: SANS,
                    cursor: loading ? "not-allowed" : "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {loading ? "Sending…" : "Resend verification email"}
                </button>
              </div>
            )}
          </div>
        )}
        <div style={{ width:"100%", marginTop:20 }}>
          <button
            type="submit"
            form="auth-login-form"
            disabled={loading}
            style={{ width:"100%", height:52, borderRadius:12, background: loading ? T.sageMid : T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor: loading ? "not-allowed" : "pointer", fontFamily:SANS, boxShadow: loading ? "none" : "0 8px 32px rgba(123,158,135,.20)", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, margin:"20px 0", width:"100%" }}>
          <div style={{ flex:1, height:1, background:T.subtle }}/><span style={{ fontSize:11, color:T.tg, fontFamily:SANS }}>or</span><div style={{ flex:1, height:1, background:T.subtle }}/>
        </div>
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{ width:"100%", height:52, borderRadius:12, border:`1.5px solid ${T.subtle}`, background:T.surface, display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontSize:13, fontWeight:500, color:T.ts, cursor: loading ? "not-allowed" : "pointer", fontFamily:SANS, opacity: loading ? 0.7 : 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.433 17.64 12.125 17.64 9.2z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
      </div>
      <div style={{ padding:"16px 0 32px", textAlign:"center" }}>
        <button onClick={onSwitch} style={{ fontSize:13, fontWeight:500, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>No account? Sign up</button>
      </div>
    </div>
  );
}

function AuthRegister({ night, onRegister, onSwitch, onCheckEmail }: { night: boolean; onRegister: ()=>void; onSwitch: ()=>void; onCheckEmail: ()=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  const [f1, sf1] = useState(false);
  const [f2, sf2] = useState(false);
  const [f3, sf3] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (e: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const newNameError = !name.trim() ? "Name is required" : "";
    const newEmailError = !email ? "Email is required" : !validateEmail(email) ? "Invalid email format" : "";
    const newPasswordError = !password ? "Password is required" : password.length < 8 ? "Password must be at least 8 characters" : "";

    setNameError(newNameError);
    setEmailError(newEmailError);
    setPasswordError(newPasswordError);

    if (newNameError || newEmailError || newPasswordError) return;

    setLoading(true);
    try {
      const { authService } = await import("./services/index");
      const result = await authService.signUp(email, password, name, { terms: true, privacy: true, analytics: false, microphone: false });
      
      if (result.needsVerification) {
        onCheckEmail();
      } else if (result.user) {
        const { useStore } = await import("./store/useStore");
        useStore.getState().setUser(result.user);
        onRegister();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 24px 0", overflowY:"auto" }}>
        <div style={{ width:72, height:72, borderRadius:20, background:T.sageLt, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16, flexShrink:0 }}>
          <PixelCat size={44} state="watching" night={night} />
        </div>
        <p style={{ fontFamily:SERIF, fontSize:28, color:T.tp }}>NeuroNotes</p>
        <p style={{ fontSize:13, fontWeight:500, color:T.ts, marginTop:8, marginBottom:36, fontFamily:SANS }}>Create your account.</p>
        <form id="auth-register-form" onSubmit={handleSubmit} style={{ width:"100%", display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => { setName(e.target.value); if (nameError) setNameError(""); }}
              onFocus={() => sf1(true)}
              onBlur={() => sf1(false)}
              style={{ ...inputSt(f1, night, nameError ? (night ? NIGHT_T.amber : DAY_T.amber) : undefined), color: T.tp }}
              disabled={loading}
            />
            {nameError && <span style={{ fontSize:11, color: night ? NIGHT_T.amber : DAY_T.amber, fontFamily: SANS }}>{nameError}</span>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
              onFocus={() => sf2(true)}
              onBlur={() => sf2(false)}
              style={{ ...inputSt(f2, night, emailError ? (night ? NIGHT_T.amber : DAY_T.amber) : undefined), color: T.tp }}
              disabled={loading}
            />
            {emailError && <span style={{ fontSize:11, color: night ? NIGHT_T.amber : DAY_T.amber, fontFamily: SANS }}>{emailError}</span>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(""); }}
                onFocus={() => sf3(true)}
                onBlur={() => sf3(false)}
                style={{ ...inputSt(f3, night, passwordError ? (night ? NIGHT_T.amber : DAY_T.amber) : undefined), color: T.tp, paddingRight: 48 }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.tm,
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M17.5 17.5L2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M1 12.2C1 7.03 5.03 3 10 3c1.78 0 3.43.57 4.76 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14 8.7c.56 1.38 1.35 2.65 2.44 3.7C13.43 17 11.78 18 10 18c-4.97 0-9-4.03-9-9 0-.76.1-1.5.29-2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M1 12.2C1 7.03 5.03 3 10 3c1.78 0 3.43.57 4.76 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14 8.7c.56 1.38 1.35 2.65 2.44 3.7C13.43 17 11.78 18 10 18c-4.97 0-9-4.03-9-9 0-.76.1-1.5.29-2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
            {passwordError && <span style={{ fontSize:11, color: night ? NIGHT_T.amber : DAY_T.amber, fontFamily: SANS }}>{passwordError}</span>}
          </div>
        </form>
        {error && <div style={{ width:"100%", fontSize:13, color: night ? NIGHT_T.amber : DAY_T.amber, fontFamily: SANS, textAlign:"center", marginBottom:12 }}>{error}</div>}
        <div style={{ width:"100%", marginTop:20 }}>
          <button
            type="submit"
            form="auth-register-form"
            disabled={loading}
            style={{ width:"100%", height:52, borderRadius:12, background: loading ? T.sageMid : T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor: loading ? "not-allowed" : "pointer", fontFamily:SANS, boxShadow: loading ? "none" : "0 8px 32px rgba(123,158,135,.20)", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </div>
      </div>
      <div style={{ padding:"16px 0 32px", textAlign:"center" }}>
        <button onClick={onSwitch} style={{ fontSize:13, fontWeight:500, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>Already have an account? Sign in</button>
      </div>
    </div>
  );
}
 
// ─── Auth Callback ──────────────────────────────────────────────────────────────

function AuthCallback({ night, onContinue }: { night: boolean; onContinue: ()=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  const [status, setStatus] = useState<"loading" | "verified" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let active = true;

    const handleCallback = async () => {
      try {
        const session = await authService.getSession();
        
        if (!active) return;

        if (session?.user) {
          restoreAppUser(session);
          // Check if email is confirmed
          const user = session.user;
          const emailConfirmed = user.email_confirmed_at || user.confirmed_at;
          
          if (emailConfirmed) {
            setStatus("verified");
          } else {
            // Email not yet confirmed - this shouldn't happen at callback, but handle gracefully
            setStatus("error");
            setErrorMessage("Email verification is still pending. Please check your inbox and click the verification link.");
          }
        } else {
          // No session - check if there was an error in the URL
          const urlParams = new URLSearchParams(window.location.search);
          const error = urlParams.get("error");
          const errorDescription = urlParams.get("error_description");
          
          if (error) {
            setStatus("error");
            setErrorMessage(errorDescription || `Verification failed: ${error}`);
          } else {
            // Might be a case where user clicked an expired/invalid link
            setStatus("error");
            setErrorMessage("This verification link appears to be invalid or has expired. Please request a new verification email from the sign-in screen.");
          }
        }
      } catch (err: unknown) {
        if (!active) return;
        console.error("Auth callback error:", err);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred during verification.");
      }
    };

    void handleCallback();
    return () => { active = false; };
  }, []);

  if (status === "loading") {
    return (
      <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
        <StatusBar night={night} />
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
          <div style={{ width:64, height:64, borderRadius:20, background:T.sageLt, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24 }}>
            <PixelCat size={40} state="thinking" night={night} />
          </div>
          <p style={{ fontFamily:SERIF, fontSize:28, color:T.tp, textAlign:"center", marginBottom:12 }}>Verifying your email…</p>
          <p style={{ fontSize:15, fontWeight:400, color:T.ts, textAlign:"center", fontFamily:SANS }}>This should only take a moment.</p>
        </div>
      </div>
    );
  }

  if (status === "verified") {
    return (
      <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
        <StatusBar night={night} />
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 24px 0", overflowY:"auto" }}>
          <div style={{ width:72, height:72, borderRadius:20, background:T.sageLt, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16, flexShrink:0 }}>
            <PixelCat size={44} state="happy" night={night} />
          </div>
          <p style={{ fontFamily:SERIF, fontSize:28, color:T.tp }}>Email verified!</p>
          <p style={{ fontSize:15, fontWeight:400, color:T.ts, marginTop:8, marginBottom:36, fontFamily:SANS, textAlign:"center" }}>Your account is ready. You can now sign in.</p>
          <button
            onClick={onContinue}
            style={{ width:"100%", height:52, borderRadius:12, background:T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)" }}
          >
            Continue to sign in
          </button>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 24px 0", overflowY:"auto" }}>
        <div style={{ width:72, height:72, borderRadius:20, background:T.peachLt || T.sageLt, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16, flexShrink:0 }}>
          <PixelCat size={44} state="thinking" night={night} />
        </div>
        <p style={{ fontFamily:SERIF, fontSize:28, color:T.tp }}>Verification failed</p>
        <p style={{ fontSize:15, fontWeight:400, color:T.ts, marginTop:8, marginBottom:36, fontFamily:SANS, textAlign:"center" }}>{errorMessage}</p>
        <button
          onClick={onContinue}
          style={{ width:"100%", height:52, borderRadius:12, background:T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)" }}
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}

// ─── Auth Check Email ──────────────────────────────────────────────────────────────────

function AuthCheckEmail({ night, onContinue }: { night: boolean; onContinue: ()=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  
  return (
    <div style={{"width":"100%", "height":"100%", "background":T.bg, "display":"flex", "flexDirection":"column"}}>
      <StatusBar night={night} />
      <div style={{"flex":1, "display":"flex", "flexDirection":"column", "alignItems":"center", "padding":"16px 24px 0", "overflowY":"auto"}}>
        <div style={{"width":72, "height":72, "borderRadius":20, "background":T.sageLt, "display":"flex", "alignItems":"center", "justifyContent":"center", "marginBottom":16, "flexShrink":0}}>
          <PixelCat size={44} state="happy" night={night} />
        </div>
        <p style={{"fontFamily":"SERIF", "fontSize":28, "color":T.tp}}>Check your email</p>
        <p style={{"fontSize":15, "fontWeight":400, "color":T.ts, "marginTop":8, "marginBottom":36, "fontFamily":"SANS", "textAlign":"center"}}>
          We've sent a verification link to your email address. Please open your inbox and click the link to verify your account.
        </p>
        <p style={{"fontSize":13, "fontWeight":400, "color":T.tg, "marginBottom":24, "fontFamily":"SANS", "textAlign":"center"}}>
          Didn't receive it? Check your spam folder or wait a few minutes.
        </p>
        <button
          onClick={onContinue}
          style={{"width":"100%", "height":52, "borderRadius":12, "background":T.sage, "color":"#FFF", "fontSize":16, "fontWeight":600, "border":"none", "cursor":"pointer", "fontFamily":"SANS", "boxShadow":"0 8px 32px rgba(123,158,135,.20)"}}
        >
          I've verified my email
        </button>
      </div>
    </div>
  );
}

// ─── Capture ──────────────────────────────────────────────────────────────────

function CaptureIdle({ night, captureCount, onHold, onTextMode, onBrainDump, onTab }: {
  night: boolean; captureCount: number; onHold: ()=>void; onTextMode: ()=>void;
  onBrainDump: ()=>void; onTab: (t:Tab)=>void;
}) {
  const T = night ? NIGHT_T : DAY_T;
  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ display:"flex", justifyContent:"flex-end", padding:"0 24px", height:20, flexShrink:0 }}>
        {captureCount < 10 && <span style={{ fontSize:11, fontWeight:500, color:T.tg, fontFamily:SANS }}>{captureCount} / 10 today</span>}
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
        <p style={{ fontSize:18, fontWeight:400, color:T.ts, marginBottom:56, textAlign:"center", padding:"0 32px", fontFamily:SANS }}>
          {night ? "Night brain mode. The cat is up too." : "What's on your mind?"}
        </p>
        <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div className="breathe" style={{ position:"absolute", width:228, height:228, borderRadius:"50%", background:T.sageLt, opacity:.20, pointerEvents:"none" }}/>
          <button className="breathe"
            style={{ position:"relative", width:176, height:176, borderRadius:"50%", background:T.sageLt, border:"none", cursor:"pointer", boxShadow:"0 8px 32px rgba(123,158,135,.20)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1, transition:"transform .1s" }}
            onTouchStart={onHold}
            onMouseDown={e => { onHold(); e.currentTarget.style.transform="scale(.95)"; }}
            onMouseUp={e => e.currentTarget.style.transform="scale(1)"}>
            <Icon name="mic" color={T.sageDp} size={56} />
          </button>
        </div>
        <p style={{ fontSize:11, fontWeight:500, color:T.tg, marginTop:36, fontFamily:SANS }}>Hold to speak</p>
        <div style={{ position:"absolute", bottom:16, right:20, opacity:.7 }}>
          <PixelCat size={36} state="idle" night={night} />
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingBottom:100, gap:12, flexShrink:0 }}>
        <button onClick={onBrainDump} style={{ height:40, padding:"0 20px", borderRadius:10, background:T.muted, color:T.ts, fontSize:13, fontWeight:600, border:`1px solid ${T.subtle}`, cursor:"pointer", fontFamily:SANS }}>
          Brain Dump Mode
        </button>
        <button onClick={onTextMode} style={{ fontSize:13, fontWeight:500, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:36, fontFamily:SANS }}>
          Prefer to type instead
        </button>
      </div>
      <BottomNav tab="capture" onTab={onTab} night={night} />
    </div>
  );
}

function CaptureRecording({ night, onRelease, onError }: { night: boolean; onRelease: (blob: Blob) => void; onError: (msg: string) => void }) {
  const T = night ? NIGHT_T : DAY_T;
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          if (blob.size > 1000) { // Minimum ~1000 bytes to avoid empty recordings
            onRelease(blob);
          } else {
            onError("Recording too short. Please speak for at least a moment.");
          }
        };

        mediaRecorder.start(100); // Collect data every 100ms
        setRecording(true);
      } catch (err: unknown) {
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError("Microphone permission denied. Please enable it in browser settings.");
          } else if (err.name === "NotFoundError") {
            setError("No microphone found. Please connect a microphone and try again.");
          } else if (err.name === "NotReadableError") {
            setError("Microphone is in use by another application.");
          } else {
            setError(`Microphone error: ${err.message}`);
          }
        } else {
          setError("Failed to start recording");
        }
      }
    };

    startRecording();

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [onRelease, onError]);

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setRecording(false);
  };

  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <p style={{ fontSize:18, fontWeight:600, color:T.sage, marginBottom:56, fontFamily:SANS }}>
          {recording ? "Listening…" : "Starting…"}
        </p>
        {error && (
          <div style={{ marginBottom: 24, padding: "12px 16px", background: "rgba(196,149,106,0.15)", borderRadius: 12, color: T.amber, fontSize: 13, fontFamily: SANS, textAlign: "center", maxWidth: 300 }}>
            {error}
          </div>
        )}
        <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div className={recording ? "ring1" : ""} style={{ position:"absolute", width:240, height:240, borderRadius:"50%", background:T.sage, pointerEvents:"none", opacity: recording ? 1 : 0 }}/>
          <div className={recording ? "ring2" : ""} style={{ position:"absolute", width:208, height:208, borderRadius:"50%", background:T.sage, pointerEvents:"none", opacity: recording ? 1 : 0 }}/>
          <button 
            onMouseUp={handleStop} 
            onTouchEnd={handleStop}
            onMouseLeave={handleStop}
            style={{ position:"relative", width:176, height:176, borderRadius:"50%", background: recording ? T.sage : T.sageLt, border:"none", cursor:"pointer", boxShadow:"0 8px 32px rgba(123,158,135,.20)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1, transition: "background 0.2s" }}>
            <Icon name="mic" color={recording ? "#FFF" : T.sageDp} size={56} />
          </button>
        </div>
        <p style={{ fontSize:11, fontWeight:500, color:T.tg, marginTop:36, fontFamily:SANS }}>
          {recording ? "Release when done" : "Initializing microphone…"}
        </p>
      </div>
    </div>
  );
}

function CaptureProcessing({ night, onTab }: { night: boolean; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:28 }}>
        <PixelCat size={72} state="thinking" night={night} />
        <p style={{ fontSize:13, fontWeight:500, color:T.tm, fontFamily:SANS }}>thimkning…</p>
        <div style={{ display:"flex", gap:8 }}>
          {[0,.18,.36].map((d,i) => (
            <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:T.sageMid, animation:`spin3dot 1.2s ${d}s ease-in-out infinite` }}/>
          ))}
        </div>
      </div>
      <BottomNav tab="capture" onTab={onTab} night={night} />
    </div>
  );
}

function CaptureResult({ night, capture, onCapture, onInbox, onTab }: { night: boolean; capture: any; onCapture: ()=>void; onInbox: ()=>void; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  const c = capture?.capture || capture;
  const type = (c?.capture_type || c?.type || "task") as "task" | "note" | "idea" | "feeling";
  const urgency = (c?.urgency || "low") as "low" | "medium" | "high";
  const energy = (c?.energy_level || c?.energy || "medium") as "high" | "medium" | "low" | "micro";
  const summary = c?.ai_summary || c?.summary || c?.text || "Voice capture saved";
  
  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 24px 0" }}>
        <p style={{ fontSize:13, fontWeight:500, color:T.ts, marginBottom:20, textAlign:"center", fontFamily:SANS }}>
          {night ? "Saved. Review it tomorrow morning 🌙" : "Saved to your inbox 🌿"}
        </p>
        <div className="fade-up" style={{ width:"100%", background:T.surface, borderRadius:16, padding:20, boxShadow:"0 2px 12px rgba(44,44,44,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <TypeBadge type={type} night={night} />
            {urgency !== "low" && <UrgencyChip level={urgency} night={night} />}
          </div>
          <p style={{ fontSize:16, fontWeight:400, color:T.tp, lineHeight:"26px", marginBottom:8, fontFamily:SANS }}>{summary}</p>
          <EnergyTag energy={energy} night={night} />
        </div>
        <button onClick={onCapture} style={{ width:"100%", height:52, borderRadius:12, background:T.sageLt, color:T.sageDp, fontSize:15, fontWeight:600, border:"none", cursor:"pointer", marginTop:20, fontFamily:SANS }}>Capture another</button>
        <button onClick={onInbox} style={{ fontSize:13, fontWeight:500, color:T.tm, background:"none", border:"none", cursor:"pointer", marginTop:16, minHeight:44, fontFamily:SANS }}>See inbox</button>
        <div style={{ marginTop:"auto", paddingBottom:32 }}>
          <PixelCat size={42} state="happy" night={night} />
        </div>
      </div>
      <BottomNav tab="capture" onTab={onTab} night={night} />
    </div>
  );
}

function CaptureText({ night, onSave, onBack }: { night: boolean; onSave: (text: string)=>Promise<void>; onBack: ()=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const trimmedText = text.trim();
    if (!trimmedText || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave(trimmedText);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save text capture.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 24px", flexShrink:0 }}>
        <button onClick={onBack} style={{ fontSize:13, fontWeight:500, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>Cancel</button>
        <button onClick={() => void save()} disabled={!text.trim() || saving} style={{ fontSize:13, fontWeight:600, color: text.trim() && !saving ? T.sage : T.tg, background:"none", border:"none", cursor: text.trim() && !saving ? "pointer" : "default", minHeight:44, fontFamily:SANS }}>{saving ? "Saving…" : "Save"}</button>
      </div>
      {error && <p role="alert" style={{ padding:"0 24px", color:T.amber, fontSize:13, fontFamily:SANS }}>{error}</p>}
      <div style={{ flex:1, padding:"0 24px 24px" }}>
        <textarea autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="What's on your mind?" disabled={saving} style={{ width:"100%", height:"100%", background:"transparent", resize:"none", outline:"none", border:"none", fontSize:16, fontWeight:400, fontFamily:SANS, color:T.tp, lineHeight:"26px" }}/>
      </div>
    </div>
  );
}

// ─── Brain Dump ───────────────────────────────────────────────────────────────

function BrainDump({ night, onBack, onTab, onSubmit }: { night: boolean; onBack: ()=>void; onTab: (t:Tab)=>void; onSubmit: (text: string)=>Promise<void> }) {
  const T = night ? NIGHT_T : DAY_T;
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const trimmedText = text.trim();
    if (!trimmedText || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSubmit(trimmedText);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not organize this brain dump. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ display:"flex", alignItems:"center", padding:"0 24px", flexShrink:0 }}>
        <button onClick={onBack} style={{ fontSize:13, fontWeight:500, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>← Back</button>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 32px" }}>
        <PixelCat size={64} state="idle" night={night} />
        <p style={{ fontFamily:SERIF, fontSize:26, lineHeight:"34px", color:T.tp, textAlign:"center", marginTop:20 }}>
          Brain Dump Mode
        </p>
        <p style={{ fontSize:13, fontWeight:400, color:T.ts, textAlign:"center", marginTop:8, lineHeight:"22px", maxWidth:280, fontFamily:SANS }}>
          Write everything on your mind. The cat will sort it into tasks, notes, ideas, and feelings.
        </p>
        <div style={{ width:"100%", maxWidth:360, marginTop:24 }}>
          <textarea
            aria-label="Brain dump"
            value={text}
            onChange={event => setText(event.target.value)}
            placeholder="Everything on your mind, all in one place…"
            disabled={saving}
            style={{ width:"100%", minHeight:150, resize:"vertical", border:`1.5px solid ${T.subtle}`, borderRadius:12, background:T.surface, padding:14, fontSize:15, lineHeight:"24px", fontFamily:SANS, color:T.tp, outline:"none" }}
          />
          {error && <p role="alert" style={{ marginTop:8, color:T.amber, fontSize:13, fontFamily:SANS }}>{error}</p>}
          <button
            onClick={() => void submit()}
            disabled={!text.trim() || saving}
            style={{ width:"100%", height:52, marginTop:12, borderRadius:12, background:text.trim() && !saving ? T.sage : T.muted, color:text.trim() && !saving ? "#FFF" : T.tm, fontSize:16, fontWeight:600, border:"none", cursor:text.trim() && !saving ? "pointer" : "default", fontFamily:SANS, boxShadow:text.trim() && !saving ? "0 8px 32px rgba(123,158,135,.20)" : "none" }}
          >
            {saving ? "Organizing…" : "Sort my thoughts"}
          </button>
        </div>
      </div>
    </div>
    <BottomNav tab="capture" onTab={onTab} night={night} />
    </>
  );
}

function BrainDumpResult({ night, cards, onInbox, onAgain, onTab }: { night: boolean; cards: Card[]; onInbox: ()=>void; onAgain: ()=>void; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  return (
    <>
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ flex:1, overflowY:"auto", padding:"8px 24px 32px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <PixelCat size={36} state="happy" night={night} />
          <p style={{ fontSize:16, fontWeight:600, color:T.tp, fontFamily:SANS }}>Found {cards.length} {cards.length === 1 ? "thing" : "things"} 🌿</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {cards.map((card, i) => (
            <div key={card.id} className="fade-in" style={{ background:T.surface, borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(44,44,44,0.06)", animationDelay:`${i*.12}s` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <TypeBadge type={card.type} night={night} /><UrgencyChip level={card.urgency} night={night} /><EnergyTag energy={card.energy} night={night} />
              </div>
              <p style={{ fontSize:15, fontWeight:400, color:T.tp, lineHeight:"24px", fontFamily:SANS }}>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"0 24px 40px", gap:12, flexShrink:0 }}>
        <button onClick={onInbox} style={{ width:"100%", height:52, borderRadius:12, background:T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)" }}>See all in inbox</button>
        <button onClick={onAgain} style={{ fontSize:13, fontWeight:500, color:T.tm, background:"none", border:"none", cursor:"pointer", minHeight:40, fontFamily:SANS }}>Capture another brain dump</button>
      </div>
    </div>
    <BottomNav tab="capture" onTab={onTab} night={night} />
    </>
  );
}

// ─── Inbox ────────────────────────────────────────────────────────────────────

function InboxFull({ night, cards, mood, onCardDone, onCardArchive, onRoulette, onStats, onTab }: {
  night: boolean; cards: Card[]; mood: Mood|null;
  onCardDone: (id:number)=>void; onCardArchive: (id:number)=>void;
  onRoulette: ()=>void; onStats: ()=>void; onTab: (t:Tab)=>void;
}) {
  const T = night ? NIGHT_T : DAY_T;
  const [filter, setFilter] = useState<"all"|CaptureType>("all");

  let visible = cards.filter(c => !c.done && !c.archived);
  if (mood === "overwhelmed") visible = visible.slice(0,1);
  else if (mood === "low")    visible = visible.filter(c => c.energy==="micro"||c.energy==="low");
  else if (mood === "energized") visible = visible.filter(c => c.energy==="high"||c.urgency==="high");
  if (filter !== "all") visible = visible.filter(c => c.type===filter);

  const moodMsg: Record<Mood, string> = {
    overwhelmed:"One thing at a time. The cat says so.", low:"Only the easy stuff. You've got this.",
    okay:"Your full inbox.", energized:"High-priority first. Let's go.",
  };

  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ padding:"4px 24px 10px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontFamily:SERIF, fontSize:28, color:T.tp, lineHeight:"36px" }}>Your inbox</p>
            <p style={{ fontSize:13, fontWeight:500, color:T.ts, marginTop:2, fontFamily:SANS }}>{visible.length} {visible.length===1?"thing":"things"} waiting</p>
          </div>
          <button onClick={onStats} style={{ marginTop:6, display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", cursor:"pointer" }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 18V10M8 18V6M13 18V10M18 18V3" stroke={T.sage} strokeWidth="1.5" strokeLinecap="round"/></svg>
            <span style={{ fontSize:10, fontWeight:500, color:T.sage, fontFamily:SANS }}>Stats</span>
          </button>
        </div>
        {mood && <p style={{ fontSize:11, fontWeight:500, color:T.tm, marginTop:6, fontStyle:"italic", fontFamily:SANS }}>{moodMsg[mood]}</p>}
      </div>
      <div style={{ display:"flex", gap:8, padding:"0 24px 10px", overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
        {(["all","task","note","idea","feeling"] as ("all"|CaptureType)[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flexShrink:0, height:28, padding:"0 12px", borderRadius:100, border:"none", cursor:"pointer", background: filter===f ? T.sage : T.muted, color: filter===f ? "#FFF" : T.ts, fontSize:11, fontWeight:600, fontFamily:SANS, transition:"all .15s" }}>{f}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"4px 24px 100px", display:"flex", flexDirection:"column", gap:12 }}>
        <button onClick={onRoulette} style={{ width:"100%", height:44, borderRadius:12, border:`1.5px dashed ${T.subtle}`, background:"transparent", color:T.tm, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:SANS, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Icon name="dice" color={T.tm} size={16} /> Surprise me — pick one task
        </button>
        {visible.map((card, i) => (
          <div key={card.id} className="fade-in" style={{ background:T.surface, borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(44,44,44,0.06)", animationDelay:`${i*.05}s` }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}><TypeBadge type={card.type} night={night} /><UrgencyChip level={card.urgency} night={night} /></div>
              <span style={{ fontSize:11, fontWeight:500, color:T.tg, fontFamily:SANS }}>{card.time}</span>
            </div>
            <p style={{ fontSize:15, fontWeight:400, color:T.tp, lineHeight:"24px", marginBottom:8, display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden", fontFamily:SANS }}>{card.text}</p>
            <EnergyTag energy={card.energy} night={night} />
            <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:12 }}>
              <button onClick={() => onCardDone(card.id)} style={{ flex:1, height:36, borderRadius:8, background:T.sageLt, color:T.sageDp, fontSize:13, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS }}>Done ✓</button>
              <button onClick={() => onCardArchive(card.id)} style={{ fontSize:13, fontWeight:500, color:T.tm, background:"none", border:"none", cursor:"pointer", minHeight:36, fontFamily:SANS }}>Archive</button>
            </div>
          </div>
        ))}
        {visible.length===0 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 0", gap:12 }}>
            <PixelCat size={48} state="happy" night={night} />
            <p style={{ fontSize:13, fontWeight:400, color:T.tm, fontFamily:SANS }}>The cat approves of your cleared inbox.</p>
          </div>
        )}
      </div>
      <BottomNav tab="inbox" onTab={onTab} night={night} />
    </div>
  );
}

function InboxEmpty({ night, onTab }: { night: boolean; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ padding:"4px 24px 16px", flexShrink:0 }}>
        <p style={{ fontFamily:SERIF, fontSize:28, color:T.tp }}>Your inbox</p>
        <p style={{ fontSize:13, fontWeight:500, color:T.ts, marginTop:4, fontFamily:SANS }}>All clear 🌿</p>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, paddingBottom:83 }}>
        <PixelCat size={64} state="happy" night={night} />
        <p style={{ fontFamily:SERIF, fontSize:22, color:T.tp }}>Your mind is clear.</p>
        <p style={{ fontSize:13, fontWeight:400, color:T.ts, textAlign:"center", lineHeight:"22px", padding:"0 40px", fontFamily:SANS }}>The cat approves. Nothing waiting.</p>
        <button onClick={() => onTab("capture")} style={{ marginTop:12, height:52, padding:"0 32px", borderRadius:12, background:T.sageLt, color:T.sageDp, fontSize:15, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS }}>Capture something</button>
      </div>
      <BottomNav tab="inbox" onTab={onTab} night={night} />
    </div>
  );
}

// ─── Focus ────────────────────────────────────────────────────────────────────

function FocusHasTask({ night, task, onDone, onTimer, onTab }: { night: boolean; task: Card; onDone: ()=>void; onTimer: ()=>void; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 40px" }}>
        <p style={{ fontSize:11, fontWeight:600, color:T.tg, letterSpacing:3, marginBottom:20, fontFamily:SANS }}>ONE THING</p>
        <p style={{ fontFamily:SERIF, fontSize:28, color:T.tp, textAlign:"center", maxWidth:300, lineHeight:"38px" }}>{task.text}</p>
        <p style={{ fontSize:10, fontWeight:500, color:T.tg, marginTop:12, fontStyle:"italic", fontFamily:SANS }}>(the cat is watching)</p>
        <div style={{ marginTop:12 }}><PixelCat size={40} state="watching" night={night} /></div>
        <button onClick={onDone} style={{ marginTop:48, width:280, height:56, borderRadius:14, background:T.sage, color:"#FFF", fontSize:20, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)", transition:"transform .1s" }}
          onMouseDown={e=>e.currentTarget.style.transform="scale(.97)"}
          onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}>Done ✓</button>
        <button onClick={onTimer} style={{ marginTop:16, height:44, padding:"0 20px", borderRadius:10, background:T.muted, color:T.ts, fontSize:13, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, display:"flex", alignItems:"center", gap:8 }}>
          <Icon name="timer" color={T.ts} size={16} /> Start Hyperfocus Timer
        </button>
      </div>
      <div style={{ display:"flex", justifyContent:"center", paddingBottom:100 }}>
        <button onClick={() => onTab("inbox")} style={{ fontSize:13, fontWeight:500, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>See everything</button>
      </div>
      <BottomNav tab="focus" onTab={onTab} night={night} />
    </div>
  );
}

function FocusEmpty({ night, onTab }: { night: boolean; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 40px", paddingBottom:83 }}>
        <p style={{ fontSize:11, fontWeight:600, color:T.tg, letterSpacing:3, marginBottom:20, fontFamily:SANS }}>ONE THING</p>
        <PixelCat size={56} state="sleeping" night={night} />
        <p style={{ fontFamily:SERIF, fontSize:26, color:T.tp, textAlign:"center", lineHeight:"36px", marginTop:20 }}>Nothing to focus on.</p>
        <p style={{ fontSize:13, fontWeight:400, color:T.ts, textAlign:"center", lineHeight:"22px", marginTop:12, fontFamily:SANS }}>Add something to your inbox first.</p>
        <button onClick={() => onTab("capture")} style={{ marginTop:24, height:52, padding:"0 32px", borderRadius:12, background:T.sageLt, color:T.sageDp, fontSize:15, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS }}>Capture something</button>
      </div>
      <BottomNav tab="focus" onTab={onTab} night={night} />
    </div>
  );
}

// ─── Roulette ─────────────────────────────────────────────────────────────────

function Roulette({ night, cards, onFocus, onBack, onTab }: { night: boolean; cards: Card[]; onFocus: (c:Card)=>void; onBack: ()=>void; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  const eligible = cards.filter(c => !c.done && !c.archived);
  const [rerolls, setRerolls] = useState(0);
  const [idx, setIdx] = useState(() => Math.floor(Math.random()*eligible.length));
  const card = eligible[idx % eligible.length];

  function reroll() {
    if (rerolls >= 3) return;
    setIdx(i => (i + 1 + Math.floor(Math.random()*(eligible.length-1))) % eligible.length);
    setRerolls(r => r+1);
  }

  if (!card) return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <PixelCat size={56} state="sleeping" night={night} />
      <p style={{ marginTop:16, fontSize:16, fontWeight:400, color:T.ts, fontFamily:SANS }}>No tasks to roll.</p>
      <button onClick={onBack} style={{ marginTop:24, fontSize:13, fontWeight:500, color:T.tg, background:"none", border:"none", cursor:"pointer", fontFamily:SANS }}>← Back</button>
    </div>
  );

  return (
    <>
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ display:"flex", alignItems:"center", padding:"0 24px", flexShrink:0 }}>
        <button onClick={onBack} style={{ fontSize:13, fontWeight:500, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>← Back</button>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 40px" }}>
        <p style={{ fontSize:11, fontWeight:600, color:T.tg, letterSpacing:3, marginBottom:16, fontFamily:SANS }}>ROULETTE</p>
        <PixelCat size={48} state="idle" night={night} />
        <div className="fade-in" key={idx} style={{ width:"100%", background:T.surface, borderRadius:20, padding:24, boxShadow:"0 2px 12px rgba(44,44,44,0.06)", textAlign:"center", marginTop:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:16 }}>
            <TypeBadge type={card.type} night={night} /><UrgencyChip level={card.urgency} night={night} />
          </div>
          <p style={{ fontFamily:SERIF, fontSize:22, color:T.tp, lineHeight:"32px" }}>{card.text}</p>
          <div style={{ marginTop:8 }}><EnergyTag energy={card.energy} night={night} /></div>
        </div>
        <button onClick={() => onFocus(card)} style={{ marginTop:32, width:280, height:52, borderRadius:12, background:T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)" }}>Do this one</button>
        {rerolls < 3 ? (
          <button onClick={reroll} style={{ marginTop:12, fontSize:13, fontWeight:500, color:T.tm, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>
            Not this one → ({3-rerolls} rerolls left)
          </button>
        ) : (
          <p style={{ marginTop:12, fontSize:12, fontWeight:400, color:T.tg, fontStyle:"italic", fontFamily:SANS }}>The cat has decided. This is the one.</p>
        )}
      </div>
    </div>
    <BottomNav tab="inbox" onTab={onTab} night={night} />
    </>
  );
}

// ─── Timer ────────────────────────────────────────────────────────────────────

type TimerMode = "micro"|"gentle"|"flow";
const TIMER_DURATIONS: Record<TimerMode, number> = { micro:10*60, gentle:25*60, flow:0 };

function Timer({ night, onDone, onBack, onTab }: { night: boolean; onDone: ()=>void; onBack: ()=>void; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  const [mode, setMode] = useState<TimerMode>("gentle");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const total = TIMER_DURATIONS[mode];
  const timeLeft = mode==="flow" ? null : Math.max(0, total-elapsed);
  const displaySecs = mode==="flow" ? elapsed : (timeLeft??0);
  const mins = Math.floor(displaySecs/60);
  const ss = String(displaySecs%60).padStart(2,"0");
  const pct = mode==="flow" ? Math.min(elapsed/(40*60),1) : (total>0 ? (total-(timeLeft??0))/total : 0);

  function start() {
    setRunning(true); setElapsed(0); setDone(false);
    intervalRef.current = setInterval(() => {
      setElapsed(e => {
        const next = e+1;
        if (mode!=="flow" && next>=total) { clearInterval(intervalRef.current!); setRunning(false); setDone(true); }
        return next;
      });
    }, 1000);
  }
  function addFive() { setElapsed(e => Math.max(0,e-5*60)); setDone(false); start(); }
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const catState: CatState = done ? "happy" : running ? "watching" : "idle";

  return (
    <>
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ display:"flex", alignItems:"center", padding:"0 24px", flexShrink:0 }}>
        <button onClick={onBack} style={{ fontSize:13, fontWeight:500, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>← Back</button>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 32px" }}>
        {!running && !done && (
          <div style={{ display:"flex", gap:10, marginBottom:36 }}>
            {(["micro","gentle","flow"] as TimerMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ height:34, padding:"0 14px", borderRadius:10, border:"none", cursor:"pointer", background: mode===m ? T.sage : T.muted, color: mode===m ? "#FFF" : T.ts, fontSize:12, fontWeight:600, fontFamily:SANS, transition:"all .15s" }}>
                {m==="micro" ? "10m" : m==="gentle" ? "25m" : "Flow ∞"}
              </button>
            ))}
          </div>
        )}
        <PixelCat size={56} state={catState} night={night} />
        {done ? (
          <div className="fade-up" style={{ textAlign:"center", marginTop:20 }}>
            <p style={{ fontFamily:SERIF, fontSize:24, color:T.tp }}>You focused for {Math.floor(elapsed/60)} minutes 🌿</p>
            <p style={{ fontSize:13, fontWeight:400, color:T.ts, marginTop:8, fontFamily:SANS }}>The cat brought you a leaf.</p>
          </div>
        ) : (
          <>
            <div style={{ position:"relative", width:160, height:160, margin:"28px 0 20px" }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="68" fill="none" stroke={T.subtle} strokeWidth="5"/>
                <circle cx="80" cy="80" r="68" fill="none" stroke={T.sage} strokeWidth="5" strokeDasharray={`${2*Math.PI*68}`} strokeDashoffset={`${2*Math.PI*68*(1-pct)}`} strokeLinecap="round" transform="rotate(-90 80 80)" style={{ transition: running?"stroke-dashoffset 1s linear":"none" }}/>
              </svg>
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:32, fontWeight:600, color:T.tp, fontFamily:SANS }}>{mins}:{ss}</span>
                <span style={{ fontSize:10, fontWeight:500, color:T.tm, marginTop:2, fontFamily:SANS }}>{mode==="flow" ? "elapsed" : "remaining"}</span>
              </div>
            </div>
            <p style={{ fontSize:12, fontWeight:400, color:T.tg, fontStyle:"italic", marginBottom:24, fontFamily:SANS }}>
              {running ? "hyperfocus is not a bug" : `${mode==="micro"?"10-minute":mode==="gentle"?"25-minute":"flow"} session`}
            </p>
          </>
        )}
        {!running && !done && (
          <button onClick={start} style={{ width:280, height:52, borderRadius:12, background:T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)" }}>Start</button>
        )}
        {done && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, marginTop:24 }}>
            <button onClick={addFive} style={{ width:280, height:52, borderRadius:12, background:T.sageLt, color:T.sageDp, fontSize:15, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS }}>5 more minutes</button>
            <button onClick={onDone} style={{ width:280, height:52, borderRadius:12, background:T.sage, color:"#FFF", fontSize:15, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)" }}>I'm done 🌿</button>
          </div>
        )}
        {running && (
          <button onClick={() => { clearInterval(intervalRef.current!); setRunning(false); setDone(true); }} style={{ marginTop:16, fontSize:13, fontWeight:500, color:T.tm, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>End session</button>
        )}
      </div>
    </div>
    <BottomNav tab="focus" onTab={onTab} night={night} />
    </>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function Stats({ night, onBack, onTab }: { night: boolean; onBack: ()=>void; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  const daysWithCaptures = MOCK_HISTORY.filter(d => d.mood!==null).length;
  return (
    <>
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ display:"flex", alignItems:"center", padding:"0 24px", flexShrink:0, gap:8 }}>
        <button onClick={onBack} style={{ fontSize:18, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>←</button>
        <p style={{ fontFamily:SERIF, fontSize:26, color:T.tp }}>Your patterns</p>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"0 24px 32px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <PixelCat size={36} state="idle" night={night} />
          <div>
            <p style={{ fontSize:15, fontWeight:400, color:T.tp, fontFamily:SANS }}>You showed up {daysWithCaptures} of 14 days 🌿</p>
            <p style={{ fontSize:11, fontWeight:500, color:T.tm, fontFamily:SANS }}>No streak. Just presence.</p>
          </div>
        </div>
        <div style={{ background:T.surface, borderRadius:20, padding:20, boxShadow:"0 2px 12px rgba(44,44,44,0.06)", marginBottom:24 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:6 }}>
            {DAY_LABELS.map((d,i) => <div key={i} style={{ textAlign:"center", fontSize:10, fontWeight:600, color:T.tm, fontFamily:SANS }}>{d}</div>)}
          </div>
          {[0,1].map(week => (
            <div key={week} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:6 }}>
              {MOCK_HISTORY.slice(week*7,week*7+7).map((day,i) => (
                <div key={i} style={{ aspectRatio:"1", borderRadius:10, background: day.mood?(night?`${MOOD_TILE_COLOR[day.mood]}22`:MOOD_TILE_COLOR[day.mood]):T.muted, display:"flex", alignItems:"center", justifyContent:"center", opacity:day.mood?1:0.5, border:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:10, color:night?T.tm:"#5A5050", lineHeight:1 }}>{day.doodle}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:12 }}>
            {Object.entries(MOOD_TILE_COLOR).map(([name, color]) => (
              <div key={name} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:3, background:night?`${color}44`:color }}/>
                <span style={{ fontSize:10, fontWeight:500, color:T.tm, fontFamily:SANS }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize:13, fontWeight:600, color:T.ts, marginBottom:12, fontFamily:SANS }}>Insights</p>
        {[
          { icon:"🌿", text:"You capture most on Tuesday mornings." },
          { icon:"🧠", text:"Mostly tasks this week — your action brain is active." },
          { icon:"♡",  text:"You showed up. That's what matters." },
        ].map((ins,i) => (
          <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:16 }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{ins.icon}</span>
            <p style={{ fontSize:14, fontWeight:400, color:T.tp, lineHeight:"22px", fontFamily:SANS }}>{ins.text}</p>
          </div>
        ))}
      </div>
    </div>
    <BottomNav tab="focus" onTab={onTab} night={night} />
    </>
  );
}

// ─── Win ──────────────────────────────────────────────────────────────────────

const CONFETTI_DATA = [
  {c:"#D4E4D9",x:"14%",y:"7%",s:10,d:.0},{c:"#9B8EC4",x:"72%",y:"11%",s:8,d:.08},
  {c:"#F0D5B8",x:"42%",y:"17%",s:7,d:.16},{c:"#FEF3C7",x:"56%",y:"5%",s:9,d:.05},
  {c:"#A8C5B0",x:"22%",y:"22%",s:6,d:.12},{c:"#E8E4F0",x:"86%",y:"14%",s:8,d:.20},
  {c:"#FBF0E4",x:"62%",y:"28%",s:10,d:.03},{c:"#D4E4D9",x:"9%",y:"32%",s:7,d:.18},
  {c:"#FEF3C7",x:"33%",y:"9%",s:6,d:.10},{c:"#9B8EC4",x:"79%",y:"24%",s:7,d:.14},
  {c:"#F0D5B8",x:"49%",y:"35%",s:8,d:.07},{c:"#A8C5B0",x:"91%",y:"4%",s:6,d:.22},
];

function Win({ night, doneCount, onCapture, onInbox, onTab }: { night: boolean; doneCount: number; onCapture: ()=>void; onInbox: ()=>void; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  return (
    <>
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <StatusBar night={night} />
      {CONFETTI_DATA.map((c,i) => (
        <div key={i} style={{ position:"absolute", borderRadius:"50%", background:night?`${c.c}55`:c.c, left:c.x, top:c.y, width:c.s, height:c.s, animation:`confettiFall .5s ${c.d}s ease-out both`, opacity:.72 }}/>
      ))}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div className="fade-up" style={{ animationDelay:".05s" }}><PixelCat size={72} state="happy" night={night} /></div>
        <p className="fade-up" style={{ fontFamily:SERIF, fontSize:32, color:T.tp, marginTop:16, animationDelay:".15s" }}>You did the thing.</p>
        <p className="fade-up" style={{ fontSize:13, fontWeight:500, color:T.ts, marginTop:8, fontFamily:SANS, animationDelay:".22s" }}>{doneCount} {doneCount===1?"thing":"things"} done today</p>
        <p className="fade-up" style={{ fontSize:11, fontWeight:400, color:T.tg, fontStyle:"italic", marginTop:4, fontFamily:SANS, animationDelay:".26s" }}>The cat saw everything. The cat is proud.</p>
        <div className="fade-up" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12, marginTop:48, animationDelay:".32s" }}>
          <button onClick={onCapture} style={{ width:280, height:52, borderRadius:12, background:T.sage, color:"#FFF", fontSize:15, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.20)" }}>Capture another</button>
          <button onClick={onInbox} style={{ width:280, height:52, borderRadius:12, background:T.sageLt, color:T.sageDp, fontSize:15, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS }}>What's next?</button>
        </div>
      </div>
    </div>
      <BottomNav tab="capture" onTab={onTab} night={night} />
    </>
  );
}

// ─── Paywall (premium redesign) ───────────────────────────────────────────────

const PAYWALL_FEATURES: { icon: string; title: string; desc: string }[] = [
  { icon:"mic",      title:"Capture without limits",  desc:"Capture thoughts whenever they appear."      },
  { icon:"organize", title:"Smart organization",      desc:"Let NeuroNotes sort the mess."               },
  { icon:"bell",     title:"Gentle nudge timing",     desc:"Reminders that work with your patterns."     },
  { icon:"timer",    title:"Hyperfocus Timer",        desc:"Make starting easier."                       },
  { icon:"dice",     title:"Task Roulette",           desc:"When choosing is the hard part."             },
  { icon:"replay",   title:"Capture Replay",          desc:"Revisit what your brain captured."           },
];

function Paywall({ night, onPurchased, onFree, onTab }: { night: boolean; onPurchased: ()=>void; onFree: ()=>void; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  const [plan, setPlan] = useState<"monthly"|"yearly">("yearly");
  const [offering, setOffering] = useState<Offering | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getOfferings()
      .then((currentOffering) => {
        if (!active) return;
        setOffering(currentOffering);
        const hasYearly = currentOffering.availablePackages.some((pkg) =>
          /annual|yearly/i.test(`${pkg.packageType} ${pkg.identifier}`),
        );
        if (!hasYearly) setPlan("monthly");
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load subscription plans.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const availablePackages = offering?.availablePackages ?? [];
  const monthlyPackage = availablePackages.find((pkg) =>
    /monthly/i.test(`${pkg.packageType} ${pkg.identifier}`),
  );
  const yearlyPackage = availablePackages.find((pkg) =>
    /annual|yearly/i.test(`${pkg.packageType} ${pkg.identifier}`),
  );
  const selectedPackage: RevenueCatPackage | undefined = plan === "monthly" ? monthlyPackage : yearlyPackage;
  const monthlyPrice = monthlyPackage?.webBillingProduct.price.formattedPrice;
  const yearlyPrice = yearlyPackage?.webBillingProduct.price.formattedPrice;

  const startPurchase = async () => {
    if (!selectedPackage || purchasing) return;
    setPurchasing(true);
    setError("");
    try {
      if (await purchasePackage(selectedPackage)) onPurchased();
      else setError("The purchase completed, but the NeuroNotes Pro entitlement is not active yet.");
    } catch {
      setError("The purchase could not be completed. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const restore = async () => {
    setRestoring(true);
    setError("");
    try {
      if (await restorePurchases()) onPurchased();
      else setError("No active NeuroNotes Pro subscription was found for this account.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column", overflowY:"auto" }}>
      <StatusBar night={night} />
      <div style={{ display:"flex", flexDirection:"column", padding:"0 28px 44px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
          <PixelCat size={28} state="idle" night={night} />
          <span style={{ fontSize:11, fontWeight:600, letterSpacing:2, color:T.ts, fontFamily:SANS }}>NEURONOTES PRO</span>
        </div>
        {/* Hero copy */}
        <p style={{ fontFamily:SERIF, fontSize:32, lineHeight:"40px", color:T.tp, marginBottom:8 }}>Your brain deserves the full experience.</p>
        <p style={{ fontSize:14, fontWeight:400, color:T.ts, fontFamily:SANS, marginBottom:28 }}>Try free for 7 days. No charge today.</p>
        {/* Feature list */}
        <div style={{ display:"flex", flexDirection:"column", gap:0, marginBottom:28 }}>
          {PAYWALL_FEATURES.map((f, i) => (
            <div key={f.icon}>
              <div style={{ display:"flex", gap:14, alignItems:"flex-start", paddingBottom:16, paddingTop:i>0?16:0 }}>
                <div style={{ flexShrink:0, marginTop:2 }}><Icon name={f.icon} color={T.sage} size={18} /></div>
                <div>
                  <p style={{ fontSize:15, fontWeight:600, color:T.tp, fontFamily:SANS, marginBottom:2 }}>{f.title}</p>
                  <p style={{ fontSize:12, fontWeight:400, color:T.ts, fontFamily:SANS, lineHeight:"18px" }}>{f.desc}</p>
                </div>
              </div>
              {i < PAYWALL_FEATURES.length-1 && <div style={{ height:1, background:T.subtle }}/>}
            </div>
          ))}
        </div>
        {/* Plan selector */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
          {/* Monthly */}
          <button onClick={() => setPlan("monthly")} style={{ width:"100%", padding:"16px 18px", borderRadius:14, border:`2px solid ${plan==="monthly" ? T.sage : T.subtle}`, background: plan==="monthly" ? T.sageFnt : T.surface, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all .15s", textAlign:"left" }}>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:T.tp, fontFamily:SANS }}>Monthly</p>
              <p style={{ fontSize:11, fontWeight:500, color:T.ts, fontFamily:SANS, marginTop:2 }}>Billed monthly</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:18, fontWeight:600, color:T.tp, fontFamily:SANS }}>{monthlyPrice ?? "Unavailable"}</p>
              <p style={{ fontSize:11, fontWeight:500, color:T.tm, fontFamily:SANS }}>/ month</p>
            </div>
          </button>
          {/* Yearly (dominant) */}
          <button onClick={() => setPlan("yearly")} style={{ position:"relative", width:"100%", padding:"18px 18px", borderRadius:14, border:`2px solid ${plan==="yearly" ? T.sage : T.subtle}`, background: plan==="yearly" ? T.sageFnt : T.surface, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all .15s", textAlign:"left", boxShadow: plan==="yearly" ? "0 2px 16px rgba(123,158,135,.12)" : "none" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                <p style={{ fontSize:13, fontWeight:600, color:T.tp, fontFamily:SANS }}>Yearly</p>
                <span style={{ fontSize:10, fontWeight:600, color:T.sageDp, background:T.sageLt, padding:"2px 8px", borderRadius:99, fontFamily:SANS }}>Best value</span>
              </div>
              <p style={{ fontSize:11, fontWeight:500, color:T.sage, fontFamily:SANS }}>{yearlyPackage ? "Yearly plan" : "Yearly plan unavailable"}</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:18, fontWeight:600, color:T.tp, fontFamily:SANS }}>{yearlyPrice ?? "Unavailable"}</p>
              <p style={{ fontSize:11, fontWeight:500, color:T.tm, fontFamily:SANS }}>/ year</p>
            </div>
          </button>
        </div>
        {/* CTA */}
        {error && <p role="alert" style={{ fontSize:12, color:T.amber, fontFamily:SANS, textAlign:"center", marginBottom:10 }}>{error}</p>}
        <button onClick={() => void startPurchase()} disabled={loading || purchasing || !selectedPackage} style={{ width:"100%", height:56, borderRadius:14, background:T.sage, color:"#FFF", fontSize:16, fontWeight:600, border:"none", cursor:loading || purchasing || !selectedPackage ? "default" : "pointer", opacity:loading || purchasing || !selectedPackage ? 0.65 : 1, fontFamily:SANS, boxShadow:"0 8px 32px rgba(123,158,135,.22)", marginBottom:10 }}>
          {loading ? "Loading plans…" : purchasing ? "Processing…" : selectedPackage ? "Continue to checkout" : "Plan unavailable"}
        </button>
        <button onClick={() => void restore()} disabled={restoring || loading} style={{ fontSize:13, fontWeight:500, color:T.ts, background:"none", border:"none", cursor:"pointer", minHeight:40, fontFamily:SANS, textAlign:"center", alignSelf:"center" }}>
          {restoring ? "Checking subscription…" : "Restore purchases"}
        </button>
        <p style={{ fontSize:11, lineHeight:"18px", color:T.tm, textAlign:"center", fontFamily:SANS, marginTop:8 }}>
          By continuing, you agree to our{" "}
          <a href="https://neuronotes.app/terms" target="_blank" rel="noreferrer" style={{ color:T.sage, textDecoration:"underline" }}>Terms of Service</a>
          {" "}and{" "}
          <a href="https://neuronotes.app/privacy" target="_blank" rel="noreferrer" style={{ color:T.sage, textDecoration:"underline" }}>Privacy Policy</a>.
        </p>
        <button onClick={onFree} style={{ fontSize:13, fontWeight:500, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS, textAlign:"center" }}>Stay on free plan</button>
      </div>
    </div>
  );
}

// ─── AI Companion ─────────────────────────────────────────────────────────────

const STARTERS = [
  "I'm overwhelmed.", "I can't get started.", "I had a bad day.",
  "I actually got something done!", "I don't know what to do first.",
];

function Companion({ night, avatarColor, feeling, onBack, onTab }: { night: boolean; avatarColor: string; feeling: Mood | null; onBack: ()=>void; onTab: (t:Tab)=>void }) {
  const T = night ? NIGHT_T : DAY_T;
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id:0, role:"assistant", content:"Hey. You're allowed to have messy days here." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(1);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
  
    const userMsg: ChatMsg = {
      id: msgId.current++,
      role: "user",
      content: text.trim(),
    };
  
    const updatedMessages = [...messages, userMsg];
  
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
  
    try {
      const reply = await chatService.sendMessage(
        updatedMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        feeling ?? "okay"
      );
  
      setMessages(m => [
        ...m,
        {
          id: msgId.current++,
          role: "assistant",
          content: reply,
        },
      ]);
    } catch (error) {
      console.error("Companion error:", error);
  
      setMessages(m => [
        ...m,
        {
          id: msgId.current++,
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Give me a moment and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, feeling]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  return (
    <>
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"0 24px 12px", flexShrink:0, borderBottom:`1px solid ${T.border}` }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", padding:0, marginRight:4 }}>
          <Icon name="back" color={T.tm} />
        </button>
        <div style={{ width:36, height:36, borderRadius:12, background:T.sageLt, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <PixelCat size={26} state="idle" night={night} bodyColorOverride={avatarColor} />
        </div>
        <div>
          <p style={{ fontSize:14, fontWeight:600, color:T.tp, fontFamily:SANS, lineHeight:"18px" }}>NeuroNotes Companion</p>
          <p style={{ fontSize:11, fontWeight:400, color:T.tm, fontFamily:SANS }}>You're allowed to have messy days.</p>
        </div>
      </div>
      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 8px", display:"flex", flexDirection:"column", gap:12 }}>
        {messages.length===1 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, margin:"8px 0 4px" }}>
            {STARTERS.map(s => (
              <button key={s} onClick={() => send(s)} style={{ height:36, padding:"0 14px", borderRadius:100, border:`1.5px solid ${T.subtle}`, background:T.surface, color:T.ts, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:SANS, flexShrink:0 }}>{s}</button>
            ))}
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ display:"flex", justifyContent: msg.role==="user" ? "flex-end" : "flex-start" }}>
            {msg.role==="assistant" && (
              <div style={{ width:28, height:28, borderRadius:10, background:T.sageLt, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginRight:8, marginTop:4 }}>
                <PixelCat size={20} state="idle" night={night} bodyColorOverride={avatarColor} />
              </div>
            )}
            <div style={{
              maxWidth:"72%", padding:"10px 14px", borderRadius: msg.role==="user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role==="user" ? T.sage : T.surface,
              color: msg.role==="user" ? "#FFF" : T.tp,
              boxShadow: msg.role==="assistant" ? "0 1px 8px rgba(44,44,44,.06)" : "none",
            }}>
              <p style={{ fontSize:15, fontWeight:400, lineHeight:"24px", fontFamily:SANS }}>{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:10, background:T.sageLt, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <PixelCat size={20} state="thinking" night={night} bodyColorOverride={avatarColor} />
            </div>
            <div style={{ background:T.surface, borderRadius:"16px 16px 16px 4px", padding:"10px 16px", display:"flex", gap:4, boxShadow:"0 1px 8px rgba(44,44,44,.06)" }}>
              {[0,.2,.4].map((d,i) => (
                <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:T.sageMid, animation:`typingDot 1s ${d}s ease-in-out infinite` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      {/* Input */}
      <div style={{ padding:"10px 16px 24px", borderTop:`1px solid ${T.border}`, display:"flex", gap:10, flexShrink:0, background:T.bg }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && send(input)}
          placeholder="What's on your mind?"
          style={{ flex:1, height:46, borderRadius:12, border:`1.5px solid ${T.subtle}`, background:T.surface, padding:"0 14px", fontSize:15, fontWeight:400, fontFamily:SANS, color:T.tp, outline:"none" }}/>
        <button onClick={() => send(input)} disabled={!input.trim()||loading}
          style={{ width:46, height:46, borderRadius:12, background:input.trim()&&!loading ? T.sage : T.muted, border:"none", cursor:input.trim()&&!loading?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background .15s" }}>
          <Icon name="arrow" color={input.trim()&&!loading?"#FFF":T.tm} size={16} />
        </button>
      </div>
    </div>
    <BottomNav tab="settings" onTab={onTab} night={night} />
    </>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function Profile({ night, displayName, selectedCat, isPro, onSelectCat, onSaveName, onPaywall, onBack, onTab }: {
  night: boolean; displayName: string; selectedCat: string; isPro: boolean;
  onSelectCat: (id:string)=>void; onSaveName: (n:string)=>void; onPaywall: ()=>void; onBack: ()=>void; onTab: (t:Tab)=>void;
}) {
  const T = night ? NIGHT_T : DAY_T;
  const [name, setName] = useState(displayName);
  const selectedChar = CAT_CHARACTERS.find(c => c.id===selectedCat) ?? CAT_CHARACTERS[0];

  return (
    <>
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"0 24px", flexShrink:0 }}>
        <button onClick={onBack} style={{ fontSize:18, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:44 }}>←</button>
        <p style={{ fontFamily:SERIF, fontSize:26, color:T.tp }}>Your space</p>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"0 24px 40px" }}>
        {/* Selected cat hero */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:32, marginTop:8 }}>
          <div style={{ width:80, height:80, borderRadius:24, background:T.sageLt, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8 }}>
            <PixelCat size={54} state="idle" night={night} bodyColorOverride={selectedChar.color} />
          </div>
          <p style={{ fontSize:13, fontWeight:600, color:T.ts, fontFamily:SANS }}>{selectedChar.name} Cat</p>
        </div>
        {/* Name input */}
        <p style={{ fontSize:11, fontWeight:600, color:T.ts, letterSpacing:1, fontFamily:SANS, marginBottom:8 }}>DISPLAY NAME</p>
        <div style={{ display:"flex", gap:10, marginBottom:32 }}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{ flex:1, height:48, borderRadius:12, border:`1.5px solid ${T.subtle}`, background:T.surface, padding:"0 14px", fontSize:15, fontWeight:400, fontFamily:SANS, color:T.tp, outline:"none" }}/>
          <button onClick={() => onSaveName(name)} style={{ height:48, padding:"0 16px", borderRadius:12, background:T.sageLt, color:T.sageDp, fontSize:13, fontWeight:600, border:"none", cursor:"pointer", fontFamily:SANS }}>Save</button>
        </div>
        {/* Cat selector */}
        <p style={{ fontSize:11, fontWeight:600, color:T.ts, letterSpacing:1, fontFamily:SANS, marginBottom:12 }}>CHOOSE YOUR COMPANION</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {CAT_CHARACTERS.map(cat => {
            const locked = cat.pro && !isPro;
            const active = selectedCat===cat.id;
            return (
              <button key={cat.id} onClick={() => locked ? onPaywall() : onSelectCat(cat.id)}
                style={{ position:"relative", height:90, borderRadius:16, border:`2px solid ${active?T.sage:T.subtle}`, background:active?T.sageFnt:T.surface, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, transition:"all .15s", opacity:locked?0.7:1 }}>
                <PixelCat size={36} state="idle" night={night} bodyColorOverride={cat.color} />
                <span style={{ fontSize:11, fontWeight:600, color:T.ts, fontFamily:SANS }}>{cat.name}</span>
                {locked && (
                  <div style={{ position:"absolute", top:6, right:6, background:T.amberLt, borderRadius:6, padding:"2px 5px" }}>
                    <span style={{ fontSize:9, fontWeight:600, color:T.amber, fontFamily:SANS }}>Pro</span>
                  </div>
                )}
                {active && (
                  <div style={{ position:"absolute", bottom:6, right:6 }}>
                    <Icon name="check" color={T.sage} size={14} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {!isPro && (
          <button onClick={onPaywall} style={{ width:"100%", marginTop:20, height:44, borderRadius:12, border:`1.5px solid ${T.subtle}`, background:T.surface, color:T.sage, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:SANS, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            Unlock all companions with Pro
          </button>
        )}
      </div>
    </div>
    <BottomNav tab="settings" onTab={onTab} night={night} />
    </>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function Settings({ night, isPro, onPaywall, onManageSubscription, onProfile, onCompanion, onBack, onTab }: {
  night: boolean; isPro: boolean; onPaywall: ()=>void; onManageSubscription: ()=>void;
  onProfile: ()=>void; onCompanion: ()=>void; onBack: ()=>void; onTab: (t:Tab)=>void;
}) {
  const T = night ? NIGHT_T : DAY_T;
  const [remind, setRemind] = useState("Morning · 9am");
  const [quiet, setQuiet] = useState("10pm – 8am");
  function cycle<V>(arr: V[], v: V) { return arr[(arr.indexOf(v)+1) % arr.length]; }
  const remindOpts = ["Morning · 9am","Afternoon · 2pm","Evening · 6pm"];
  const quietOpts  = ["10pm – 8am","11pm – 7am","No quiet hours"];
  const row: React.CSSProperties = { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", height:56 };
  const menuItem = (label: string, onClick: ()=>void, accent=false) => (
    <button onClick={onClick} style={{ ...row as React.CSSProperties, width:"100%", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
      <span style={{ fontSize:15, fontWeight:400, color: accent ? T.sage : T.tp, fontFamily:SANS }}>{label}</span>
      <Icon name="arrow" color={T.tg} size={16} />
    </button>
  );

  return (
    <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", flexDirection:"column" }}>
      <StatusBar night={night} />
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"0 24px", flexShrink:0 }}>
        <button onClick={onBack} style={{ fontSize:18, color:T.tg, background:"none", border:"none", cursor:"pointer", minHeight:44 }}>←</button>
        <p style={{ fontFamily:SERIF, fontSize:26, color:T.tp }}>Settings</p>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"0 24px 32px" }}>
        <p style={{ fontSize:11, fontWeight:600, color:T.ts, letterSpacing:1, margin:"20px 0 8px", fontFamily:SANS }}>ACCOUNT</p>
        <div style={{ background:T.surface, borderRadius:16, boxShadow:"0 2px 12px rgba(44,44,44,0.06)", overflow:"hidden" }}>
          <div style={{ ...row, borderBottom:`1px solid ${T.border}` }}>{menuItem("Your space", onProfile)}</div>
          <div>{menuItem("NeuroNotes Companion", onCompanion, true)}</div>
        </div>
        <p style={{ fontSize:11, fontWeight:600, color:T.ts, letterSpacing:1, margin:"28px 0 8px", fontFamily:SANS }}>NUDGES</p>
        <div style={{ background:T.surface, borderRadius:16, boxShadow:"0 2px 12px rgba(44,44,44,0.06)", overflow:"hidden" }}>
          <div style={{ ...row, borderBottom:`1px solid ${T.border}` }}>
            <span style={{ fontSize:15, fontWeight:400, color:T.tp, fontFamily:SANS }}>Remind me at</span>
            <button onClick={() => setRemind(v=>cycle(remindOpts,v))} style={{ fontSize:14, fontWeight:500, color:T.sage, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>{remind}</button>
          </div>
          <div style={row}>
            <span style={{ fontSize:15, fontWeight:400, color:T.tp, fontFamily:SANS }}>Quiet hours</span>
            <button onClick={() => setQuiet(v=>cycle(quietOpts,v))} style={{ fontSize:14, fontWeight:500, color:T.sage, background:"none", border:"none", cursor:"pointer", minHeight:44, fontFamily:SANS }}>{quiet}</button>
          </div>
        </div>
        <p style={{ fontSize:11, fontWeight:600, color:T.ts, letterSpacing:1, margin:"28px 0 8px", fontFamily:SANS }}>SUBSCRIPTION</p>
        <div style={{ background:T.surface, borderRadius:16, boxShadow:"0 2px 12px rgba(44,44,44,0.06)", overflow:"hidden" }}>
          <div>{menuItem(isPro ? "Manage subscription" : "NeuroNotes Pro", isPro ? onManageSubscription : onPaywall, true)}</div>
        </div>
        <p style={{ fontSize:11, fontWeight:600, color:T.ts, letterSpacing:1, margin:"28px 0 8px", fontFamily:SANS }}>ACCOUNT</p>
        <div style={{ background:T.surface, borderRadius:16, boxShadow:"0 2px 12px rgba(44,44,44,0.06)", overflow:"hidden" }}>
          <div style={row}>
            <span style={{ fontSize:15, fontWeight:400, color:T.tm, fontFamily:SANS }}>hello@neuronotes.app</span>
          </div>
          <div style={{ borderTop:`1px solid ${T.border}` }}>
            <button 
              onClick={async () => {
                const { authService } = await import("./services/index");
                await authService.signOut();
                onBack();
              }}
              style={{ ...row as React.CSSProperties, width:"100%", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
              <span style={{ fontSize:15, fontWeight:400, color:T.ts, fontFamily:SANS }}>Sign out</span>
            </button>
          </div>
        </div>
        <div style={{ marginTop:32, display:"flex", justifyContent:"center" }}>
          <PixelCat size={40} state="idle" night={night} />
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const night = useNightMode();
  const T     = night ? NIGHT_T : DAY_T;
  const appUserId = useStore((state) => state.user?.id);
  const isAuthCallbackPath = window.location.pathname.replace(/\/+$/, "") === "/auth/callback";

  const [screen, setScreen]       = useState<Screen>(() => isAuthCallbackPath ? "auth_callback" : "consent");
  const [cards,  setCards]        = useState<Card[]>([]);
  const [brainDumpResults, setBrainDumpResults] = useState<Card[]>([]);
  const [captureCount, setCC]     = useState(0);
  const [doneCount, setDC]        = useState(0);
  const [showCheckin, setCI]      = useState(false);
  const [mood, setMood]           = useState<Mood|null>(null);
  const [showCookie, setShowCookie] = useState(true);
  const [isPro, setIsPro]         = useState(false);
  const [selectedCat, setSelectedCat] = useState("sage-cat");
  const [displayName, setDisplayName] = useState("You");
  const [authLoading, setAuthLoading] = useState(true);
  const [latestCapture, setLatestCapture] = useState<any>(null);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const initAuth = async () => {
      try {
        const { data } = authService.onAuthStateChange((event, session) => {
          if (!active) return;

          if (session?.user) {
            restoreAppUser(session);
          } else if (event === "SIGNED_OUT") {
            useStore.getState().setUser(null);
            setScreen("auth_login");
          }
        });
        subscription = data.subscription;

        const session = await authService.getSession();
        if (active && session?.user) {
          restoreAppUser(session);
        }
      } catch (error) {
        console.warn("Auth initialization failed:", error);
      } finally {
        if (active) setAuthLoading(false);
      }
    };

    void initAuth();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Show loading screen while auth initializes
  if (authLoading) {
    // Just a marker - actual loading screen rendered in return
  }

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    const initRevenueCatAndListen = async () => {
      try {
        const initialized = await initRevenueCat();
        if (!active) return;

        if (initialized) {
          const status = await checkProStatus();
          if (active) setIsPro(status);

          // Set up listener for real-time entitlement changes
          const { listenForUpdates } = await import("./services/revenuecat");
          unsubscribe = listenForUpdates((isPro) => {
            if (active) setIsPro(isPro);
          });
        } else {
          if (active) setIsPro(false);
        }
      } catch (error) {
        console.warn("RevenueCat initialization failed:", error);
        if (active) setIsPro(false);
      }
    };

    // Clear pro status if no user (logged out)
    if (!appUserId) {
      setIsPro(false);
    }

    void initRevenueCatAndListen();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [appUserId]);

  // Load captures when user logs in
  useEffect(() => {
    if (!appUserId) {
      setCards([]);
      setCC(0);
      setDC(0);
      return;
    }

    let active = true;
    const loadCaptures = async () => {
      try {
        const { getInbox } = await import("./services/api");
        const result = await getInbox();
        if (active && Array.isArray(result)) {
          setCards(result);
          setCC(result.filter((c: any) => !c.done && !c.archived).length);
          setDC(result.filter((c: any) => c.done).length);
        }
      } catch (error) {
        console.warn("Failed to load captures:", error);
      }
    };
    void loadCaptures();
    return () => { active = false; };
  }, [appUserId]);

  const avatarColor = CAT_CHARACTERS.find(c => c.id===selectedCat)?.color ?? CAT_CHARACTERS[0].color;
  const activeTask  = cards.find(c => !c.done && !c.archived && c.type==="task");
  const inboxCount  = cards.filter(c => !c.done && !c.archived).length;

  function nav(t: Tab) {
    if (t==="capture") { setScreen("capture_idle"); }
    else if (t==="inbox") setScreen(inboxCount>0 ? "inbox_full" : "inbox_empty");
    else if (t==="focus") setScreen(activeTask ? "focus_task" : "focus_empty");
    else setScreen("settings");
  }

  function ensureCaptureAuthentication() {
    const user = useStore.getState().user;
    if (user?.supabaseToken || user?.token) return true;
    setScreen("auth_login");
    return false;
  }

  function handleDone(id: number) {
    setCards(cs => cs.map(c => c.id===id ? {...c,done:true} : c));
    setDC(d => d+1); setScreen("win");
  }

  function handleRelease(blob: Blob) {
    if (!ensureCaptureAuthentication()) return;
    setScreen("capture_processing");
    // Upload to backend
    (async () => {
      try {
        const { uploadVoice } = await import("./services/api");
        const result = await uploadVoice(blob);
        const capture = result.capture || result;
        setLatestCapture(capture);
        setCards(cs => [toCard(capture), ...cs]);
        setCC(n => n+1);
        setScreen("capture_result");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to process voice capture";
        console.error("Voice capture failed:", err);
        setScreen("capture_idle");
        // Show error somehow - could use a toast or navigate to error screen
        alert(msg);
      }
    })();
  }

  async function handleTextCapture(text: string) {
    if (!ensureCaptureAuthentication()) {
      throw new Error("Please sign in before saving a capture.");
    }
    const { submitText } = await import("./services/api");
    const result = await submitText(text);
    const capture = result.capture || result;
    setLatestCapture(capture);
    setCards(cs => [toCard(capture), ...cs]);
    setCC(n => n+1);
    setScreen("capture_result");
  }

  async function handleBrainDumpSubmit(text: string) {
    try {
      const { brainDumpText } = await import("./services/api");
      const result = await brainDumpText(text);
      if (!Array.isArray(result.captures) || result.captures.length === 0) {
        throw new Error("The brain dump returned no captures. Please try again.");
      }

      const savedCards = result.captures.map((capture: SavedCapture, index: number) =>
        toCard(capture, Date.now() + index),
      );
      setBrainDumpResults(savedCards);
      setCards(current => [...savedCards, ...current]);
      setScreen("brain_dump_result");
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "PAYWALL") {
        setScreen("paywall");
        return;
      }
      throw error;
    }
  }

  function handleRoulette() {
    const eligible = cards.filter(c => !c.done && !c.archived && c.type==="task");
    if (eligible.length === 0) return;
    setScreen("roulette");
  }

  async function handleManageSubscription() {
    const managementWindow = window.open("about:blank", "_blank");
    try {
      const managementURL = await getSubscriptionManagementURL();
      if (!managementURL) {
        managementWindow?.close();
        void handlePaywall();
        return;
      }

      const destination = new URL(managementURL);
      if (destination.protocol !== "https:") {
        throw new Error("RevenueCat returned an invalid subscription management URL.");
      }

      if (managementWindow) managementWindow.location.replace(destination.href);
      else window.location.assign(destination.href);
    } catch (error) {
      managementWindow?.close();
      console.error("Could not open subscription management:", error);
    }
  }

  async function handlePaywall() {
    const paywallResult = await RevenueCatUI.presentPaywall();
    
    if (paywallResult === PAYWALL_RESULT.PURCHASED || paywallResult === PAYWALL_RESULT.RESTORED) {
      setIsPro(true);
      setScreen("capture_idle");
    } else if (paywallResult === PAYWALL_RESULT.NOT_PRESENTED || paywallResult === PAYWALL_RESULT.ERROR) {
      // Fallback to custom paywall if hosted UI is not configured or fails
      setScreen("paywall");
    }
  }

  const shownCheckin = useRef(false);
  const s = screen;

  useEffect(() => {
    if (s==="capture_idle" && !shownCheckin.current) {
      shownCheckin.current = true;
      const t = setTimeout(() => setCI(true), 500);
      return () => clearTimeout(t);
    }
  }, [s]);

  if (authLoading) {
    return (
      <div style={{ width:"100%", height:"100%", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <PixelCat size={48} state="idle" night={night} />
      </div>
    );
  }

  return (
    <div className="nn-shell-outer" style={{ background: night ? "#0E0C0A" : "#D5D0CA" }}>
      <style>{GLOBAL_CSS}</style>
      <div className="nn-shell-inner" style={{ fontFamily: SANS, background: T.bg }}>
        <FadeScreen id={s}>
          {s==="consent"            && <Consent      onAccept={() => setScreen("onboarding1")} />}
          {s==="onboarding1"        && <Onboarding1  onNext={() => setScreen("onboarding2")} />}
          {s==="onboarding2"        && <Onboarding2  onNext={() => setScreen("onboarding3")} />}
          {s==="onboarding3"        && <Onboarding3  onNext={() => setScreen("auth_register")} />}
          {s==="auth_login"         && <AuthLogin     night={night} onLogin={() => setScreen("capture_idle")} onSwitch={() => setScreen("auth_register")} />}
          {s==="auth_register"      && <AuthRegister  night={night} onRegister={() => setScreen("capture_idle")} onSwitch={() => setScreen("auth_login")} onCheckEmail={() => setScreen("auth_check_email")} />}
          {s==="auth_callback"      && <AuthCallback  night={night} onContinue={() => setScreen("auth_login")} />}
          {s==="auth_check_email"   && <AuthCheckEmail  night={night} onContinue={() => setScreen("auth_login")} />}
          {s==="capture_idle"       && <CaptureIdle   night={night} captureCount={captureCount} onHold={() => { if (ensureCaptureAuthentication()) setScreen("mic_permission"); }} onTextMode={() => { if (ensureCaptureAuthentication()) setScreen("capture_text"); }} onBrainDump={() => setScreen("brain_dump")} onTab={nav} />}
          {s==="mic_permission"     && <MicPermission night={night} onAllow={() => setScreen("capture_recording")} onSkip={() => setScreen("capture_idle")} />}
          {s==="capture_recording"  && <CaptureRecording night={night} onRelease={handleRelease} onError={msg => alert(msg)} />}
          {s==="capture_processing" && <CaptureProcessing night={night} onTab={nav} />}
          {s==="capture_result"     && <CaptureResult night={night} capture={latestCapture} onCapture={() => { setLatestCapture(null); setScreen("capture_idle"); }} onInbox={() => { setLatestCapture(null); setScreen("inbox_full"); }} onTab={nav} />}
          {s==="capture_text"       && <CaptureText   night={night} onSave={handleTextCapture} onBack={() => setScreen("capture_idle")} />}
          {s==="brain_dump"         && <BrainDump     night={night} onBack={() => setScreen("capture_idle")} onTab={nav} onSubmit={handleBrainDumpSubmit} />}
          {s==="brain_dump_result"  && <BrainDumpResult night={night} cards={brainDumpResults} onInbox={() => setScreen("inbox_full")} onAgain={() => setScreen("brain_dump")} onTab={nav} />}
          {s==="inbox_full"         && <InboxFull     night={night} cards={cards} mood={mood} onCardDone={handleDone} onCardArchive={id=>setCards(cs=>cs.map(c=>c.id===id?{...c,archived:true}:c))} onRoulette={handleRoulette} onStats={()=>setScreen("stats")} onTab={nav} />}
          {s==="inbox_empty"        && <InboxEmpty    night={night} onTab={nav} />}
          {s==="focus_task"         && activeTask && <FocusHasTask night={night} task={activeTask} onDone={() => handleDone(activeTask.id)} onTimer={() => setScreen("timer")} onTab={nav} />}
          {s==="focus_empty"        && <FocusEmpty    night={night} onTab={nav} />}
          {s==="roulette"           && <Roulette      night={night} cards={cards} onFocus={card => { void card; setScreen("focus_task"); }} onBack={() => setScreen("inbox_full")} onTab={nav} />}
          {s==="timer"              && <Timer         night={night} onDone={() => setScreen("focus_task")} onBack={() => setScreen("focus_task")} onTab={nav} />}
          {s==="stats"              && <Stats         night={night} onBack={() => setScreen("inbox_full")} onTab={nav} />}
          {s==="companion"          && <CompanionScreen setScreen={setScreen} />}
          {s==="profile"            && <Profile       night={night} displayName={displayName} selectedCat={selectedCat} isPro={isPro} onSelectCat={setSelectedCat} onSaveName={setDisplayName} onPaywall={handlePaywall} onBack={() => setScreen("settings")} onTab={nav} />}
          {s==="win"                && <Win           night={night} doneCount={doneCount} onCapture={() => setScreen("capture_idle")} onInbox={() => setScreen("inbox_full")} onTab={nav} />}
          {s==="paywall"            && <Paywall       night={night} onPurchased={() => { setIsPro(true); setScreen("capture_idle"); }} onFree={() => setScreen("capture_idle")} onTab={nav} />}
          {s==="settings"           && <Settings      night={night} isPro={isPro} onPaywall={handlePaywall} onManageSubscription={() => void handleManageSubscription()} onProfile={() => setScreen("profile")} onCompanion={() => setScreen("companion")} onBack={() => setScreen("capture_idle")} onTab={nav} />}
        </FadeScreen>

        {/* Check-in modal */}
        {showCheckin && s==="capture_idle" && (
          <CheckInModal night={night} onSelect={m => {setMood(m);setCI(false);setScreen("companion");}} onSkip={() => setCI(false)} />)}

        {/* Cookie banner */}
        {showCookie && !["consent","onboarding1","onboarding2","onboarding3","auth_login","auth_register"].includes(s) && (
          <CookieBanner night={night} onAccept={() => setShowCookie(false)} onSettings={() => setShowCookie(false)} />
        )}
      </div>
    </div>
  );
}
