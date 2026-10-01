import { useStore } from "../store/useStore";
import type { EmotionalState } from "../store/useStore";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function headers(json = false) {
  const user = useStore.getState().user;
  const token = user?.supabaseToken || user?.token;
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res: Response) {
  if (res.status === 402) throw new Error("PAYWALL");
  if (!res.ok) {
    const body = await res.text();
    let message = `Request failed (${res.status})`;
    if (body.trim()) {
      try {
        const error: unknown = JSON.parse(body);
        if (error && typeof error === "object" && "detail" in error && typeof error.detail === "string") {
          message = error.detail;
        } else {
          message = body;
        }
      } catch {
        message = body;
      }
    }
    throw new Error(message);
  }
  return res.json();
}

// Auth
export const register = (
  email: string,
  password: string,
  name: string,
  consent: {
    terms: boolean;
    privacy: boolean;
    analytics: boolean;
    microphone: boolean;
  },
) =>
  fetch(`${BASE}/auth/register`, {
    method: "POST", headers: headers(true),
    body: JSON.stringify({
      email,
      password,
      name,
      consent_terms: consent.terms,
      consent_privacy: consent.privacy,
      consent_analytics: consent.analytics,
      consent_mic: consent.microphone,
    }),
  }).then(handle);

export const login = (email: string, password: string) =>
  fetch(`${BASE}/auth/login`, {
    method: "POST", headers: headers(true),
    body: JSON.stringify({ email, password }),
  }).then(handle);

// Captures
export const uploadVoice = (blob: Blob) => {
  const form = new FormData();
  form.append("audio", blob, "capture.webm");
  return fetch(`${BASE}/captures/voice`, {
    method: "POST", headers: headers(), body: form,
  }).then(handle);
};

export const submitText = (text: string) =>
  fetch(`${BASE}/captures/text`, {
    method: "POST", headers: headers(true),
    body: JSON.stringify({ text }),
  }).then(handle);

export const brainDump = (blob: Blob) => {
  const form = new FormData();
  form.append("audio", blob, "braindump.webm");
  return fetch(`${BASE}/captures/brain-dump`, {
    method: "POST", headers: headers(), body: form,
  }).then(handle);
};

export const brainDumpText = (text: string) =>
  fetch(`${BASE}/captures/brain-dump-text`, {
    method: "POST", headers: headers(true),
    body: JSON.stringify({ text }),
  }).then(handle);

export const getInbox = (energy?: string, type?: string) => {
  const params = new URLSearchParams();
  if (energy) params.append("energy", energy);
  if (type) params.append("type", type);
  const query = params.toString();
  return fetch(`${BASE}/captures/inbox${query ? `?${query}` : ""}`, {
    headers: headers(),
  }).then(handle);
};

export const getFocus = (state?: EmotionalState) => {
  const params = state ? `?emotional_state=${state}` : "";
  return fetch(`${BASE}/captures/focus${params}`, { headers: headers() }).then(handle);
};

export const markDone = (id: string) =>
  fetch(`${BASE}/captures/${id}/done`, {
    method: "PATCH", headers: headers(),
  }).then(handle);

export const archive = (id: string) =>
  fetch(`${BASE}/captures/${id}/archive`, {
    method: "PATCH", headers: headers(),
  }).then(handle);

export const getRandom = () =>
  fetch(`${BASE}/captures/random`, { headers: headers() }).then(handle);

export const getParked = () =>
  fetch(`${BASE}/captures/parked`, { headers: headers() }).then(handle);

// Consistency and reports
export const getConsistency = () =>
  fetch(`${BASE}/stats/consistency`, { headers: headers() }).then(handle);

export const getWeeklyReport = () =>
  fetch(`${BASE}/stats/weekly-report`, { headers: headers() }).then(handle);

// Nudge
export const getNudge = () =>
  fetch(`${BASE}/nudges/next`, { headers: headers() }).then(handle);

export const sendChatMessage = (
  messages: { role: "user" | "assistant"; content: string }[],
  emotionalState: string,
) =>
  fetch(`${BASE}/chat/emotional`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ messages, emotional_state: emotionalState }),
  }).then(handle);

export const getChatHistory = () =>
  fetch(`${BASE}/chat/history`, { headers: headers() }).then(handle);

// Billing
export const getBillingStatus = () =>
  fetch(`${BASE}/billing/status`, { headers: headers() }).then(handle);

export const upgradePro = (plan: string) =>
  fetch(`${BASE}/billing/upgrade`, {
    method: "POST", headers: headers(true),
    body: JSON.stringify({ plan }),
  }).then(handle);

// Compatibility aliases for existing screens.
export const uploadVoiceCapture = uploadVoice;
export const submitTextCapture = submitText;
export const getFocusTask = getFocus;
export const markCaptureDone = markDone;
export const archiveCapture = archive;
export const upgradeToProMock = () => upgradePro("pro_monthly");
