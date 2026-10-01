// NeuroNotes service layer — ready to wire to Supabase + RevenueCat
import {
  getChatHistory,
  login as apiLogin,
  register as apiRegister,
  sendChatMessage,
} from "./api";
import { supabase, type SupabaseUser, type SupabaseSession } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  user_id: string
  display_name: string
  avatar_id: string
  created_at: string
  updated_at: string
}

export interface Capture {
  id: string
  user_id: string
  type: string
  content: string
  urgency: string
  status: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export interface Consent {
  id: string
  user_id: string
  terms_version: string
  privacy_version: string
  accepted_at: string
}

export interface UserSettings {
  user_id: string
  microphone_enabled: boolean
  notifications_enabled: boolean
  theme: "light" | "dark" | "auto"
}

function toFastAPIUser(supabaseUser: SupabaseUser, fastAPIToken: string, name?: string): {
  id: string;
  email: string;
  name: string;
  token: string;
  supabaseToken?: string;
  is_pro: boolean;
  cat_variant: "sage" | "lavender" | "amber" | "cloud" | "cocoa" | "peach";
  daily_captures: number;
  nudge_hour: number;
  cat_avatar?: string;
  avatar_id?: string;
} {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    name: name || supabaseUser.user_metadata.name || supabaseUser.email?.split("@")[0] || "NeuroNotes user",
    token: fastAPIToken,
    supabaseToken: fastAPIToken,
    is_pro: false,
    cat_variant: "sage",
    daily_captures: 0,
    nudge_hour: 9,
    cat_avatar: supabaseUser.user_metadata.avatar_url,
    avatar_id: supabaseUser.user_metadata.avatar_id,
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authService = {
  toAppUser(session: SupabaseSession) {
    if (!session?.user) return null;
    return toFastAPIUser(session.user, session.access_token);
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Check if error is due to unconfirmed email
      if (error.message.includes("Email not confirmed") || error.message.includes("email not confirmed")) {
        throw new Error("EMAIL_NOT_CONFIRMED");
      }
      throw new Error(error.message);
    }

    if (!data.session || !data.user) {
      throw new Error("Authentication failed - no session created");
    }

    // Return Supabase user with access token (no FastAPI token exchange)
    return { 
      user: toFastAPIUser(data.user, data.session.access_token) 
    };
  },

  async resendVerificationEmail(email: string) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw new Error(error.message);
    return { success: true };
  },

  async signUp(
    email: string,
    password: string,
    name?: string,
    consent = { terms: true, privacy: true, analytics: false, microphone: false },
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split("@")[0] || "NeuroNotes user",
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw new Error(error.message);

    if (!data.user) {
      throw new Error("Signup failed - no user created");
    }

    // If email confirmation is required, user will need to verify before they can sign in
    if (data.session) {
      // Exchange Supabase session for FastAPI token
      const fastAPIResponse = await apiRegister(email, password, name || email.split("@")[0], consent);
      return { user: toFastAPIUser(data.user, fastAPIResponse.user.token, name) };
    }

    return { user: null, needsVerification: true };
  },

  async signInWithOAuth(provider: "google") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw new Error(error.message);
    return { success: true };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (event: string, session: SupabaseSession) => void) {
    return supabase.auth.onAuthStateChange(callback as any);
  },
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const profileService = {
  async getProfile(_userId: string): Promise<Profile | null> {
    return null;
  },
  async updateProfile(_userId: string, _data: Partial<Profile>) {},
  async setAvatar(_userId: string, _avatarId: string) {},
};

// ─── Capture ──────────────────────────────────────────────────────────────────

export const captureService = {
  async createCapture(
    _data: Omit<Capture, "id" | "created_at" | "updated_at">,
  ) {},
  async getCaptures(_userId: string): Promise<Capture[]> {
    return [];
  },
  async updateCapture(_id: string, _data: Partial<Capture>) {},
  async deleteCapture(_id: string) {},
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

const COMPANION_RESPONSES: Record<string, string> = {
  overwhelmed:
    "That's a heavy feeling. You don't have to tackle everything right now. What's one thing — just one — that would make today feel a little lighter?",
  "can't get started":
    "Starting is genuinely the hardest part. What if you set a two-minute timer and just open the thing? You don't have to finish it.",
  "bad day":
    "That sounds really hard. Bad days happen to everyone, and they don't say anything about you. What would feel okay to do next?",
  "got something done": "That counts. Seriously. What did you get done?",
  "don't know what to do":
    "Let's make it smaller. What's the one thing that, if you did it today, would feel like enough?",
  tired:
    "Rest isn't a failure. If your body needs to slow down, that's real information. Is there one tiny thing that's safe to set aside for now?",
  anxious:
    "Anxiety has a way of making everything feel urgent at once. You don't have to solve all of it today. What's the smallest possible next step?",
  default:
    "I hear you. That sounds genuinely difficult. What feels like the smallest possible thing you could do right now — even if it seems too small?",
};

function mockCompanionResponse(message: string): string {
  const lower = message.toLowerCase().replace(/[\u2018\u2019]/g, "'");
  for (const [key, response] of Object.entries(COMPANION_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  if (
    lower.includes("good") ||
    lower.includes("done") ||
    lower.includes("finished") ||
    lower.includes("completed")
  ) {
    return "That's real progress. It might feel small to you, but showing up is the hard part. Well done.";
  }
  return COMPANION_RESPONSES.default;
}

export const chatService = {
  async sendMessage(
    messages: { role: "user" | "assistant"; content: string }[],
    emotionalState: string = "okay",
    retries = 2,
  ): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const data = await sendChatMessage(messages, emotionalState);
        return data.reply;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors (e.g., 401, 400)
        if (error instanceof Error) {
          if (error.message.includes("401") || error.message.includes("400") || error.message.includes("PAYWALL")) {
            throw error;
          }
        }

        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.warn(`Chat attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - use fallback
    console.warn("Companion is offline after retries; using a supportive fallback response.", lastError);
    return mockCompanionResponse(messages[messages.length - 1]?.content ?? "");
  },

  async getHistory(): Promise<{ role: "user" | "assistant"; content: string }[]> {
    const data = await getChatHistory();
    return data.messages;
  },
};

// ─── Consent ──────────────────────────────────────────────────────────────────

export const consentService = {
  async recordConsent(_data: Omit<Consent, "id">): Promise<void> {
    localStorage.setItem(
      "neuronotes_consent",
      JSON.stringify({ ..._data, accepted_at: new Date().toISOString() }),
    );
  },
  hasConsented(): boolean {
    return !!localStorage.getItem("neuronotes_consent");
  },
};

// ─── Subscription / RevenueCat ────────────────────────────────────────────────

export const subscriptionService = {
  async getOfferings() {
    return {
      monthly: { id: "monthly", price: "$7.99" },
      yearly: { id: "yearly", price: "$59.99" },
    };
  },
  async purchase(_packageId: string) {
    return { success: true };
  },
  async restorePurchases() {
    return { restored: false };
  },
  async getCustomerStatus() {
    return { entitlements: { pro: { isActive: false } } };
  },
};

// ─── Entitlement ──────────────────────────────────────────────────────────────

export function hasProAccess(): boolean {
  // In production: check subscriptionService.getCustomerStatus() entitlement "pro"
  return false;
}

export {
  PAYWALL_RESULT,
  RevenueCatUI,
  presentPaywall,
} from "./revenuecat";
