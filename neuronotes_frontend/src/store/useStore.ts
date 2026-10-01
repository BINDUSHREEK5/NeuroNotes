import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CaptureType = "task" | "note" | "idea" | "feeling";
export type Urgency = "low" | "medium" | "high" | "urgent";
export type EnergyLevel = "high" | "medium" | "low" | "micro";
export type CatVariant = "sage" | "lavender" | "amber" | "cloud" | "cocoa" | "peach";
export type EmotionalState = "overwhelmed" | "low" | "okay" | "energized" | null;

export interface Capture {
  id: string;
  raw_transcript: string;
  ai_summary: string;
  capture_type: CaptureType;
  urgency: Urgency;
  energy_level: EnergyLevel;
  is_done: boolean;
  is_archived: boolean;
  is_parked: boolean;
  group_id?: string;
  created_at: string;
  done_at?: string;
  audio_url?: string;
}

export type CaptureItem = Capture;

export interface ConsentData {
  terms: boolean;
  privacy: boolean;
  analytics: boolean;
  microphone: boolean;
  timestamp: string;
}

export interface WeeklyReport {
  week_start: string;
  total_captures: number;
  tasks_done: number;
  most_common_type: CaptureType;
  peak_capture_time: string;
  dominant_feeling?: string;
  insight: string;
  kind_word: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  token: string;
  supabaseToken?: string;
  is_pro: boolean;
  cat_variant: CatVariant;
  daily_captures: number;
  nudge_hour: number;
  cat_avatar?: string;
  avatar_id?: string;
}

interface Store {
  user: User | null;
  setUser: (user: User | null) => void;
  consent: ConsentData | null;
  setConsent: (consent: ConsentData) => void;
  setHasConsented: (value: boolean) => void;
  hasConsented: boolean;
  hasOnboarded: boolean;
  setHasOnboarded: (value: boolean) => void;
  captures: Capture[];
  todayCount: number;
  addCapture: (capture: Capture) => void;
  addCaptures: (captures: Capture[]) => void;
  setCaptures: (captures: Capture[]) => void;
  markDone: (id: string) => void;
  archiveCapture: (id: string) => void;
  parkThought: (id: string) => void;

  emotionalState: EmotionalState;
  setEmotionalState: (state: EmotionalState) => void;
  celebrateId: string | null;
  setCelebrate: (id: string | null) => void;
  weeklyReport: WeeklyReport | null;
  setWeeklyReport: (report: WeeklyReport) => void;
  consistencyDays: string[];
  activeFilter: CaptureType | "all";
  setFilter: (filter: CaptureType | "all") => void;
  recordToday: () => void;
  incrementToday: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      user: null,
      consent: null,
      hasConsented: false,
      hasOnboarded: false,
      captures: [],
      todayCount: 0,
      emotionalState: null,
      celebrateId: null,
      weeklyReport: null,
      consistencyDays: [],
      activeFilter: "all",

      setUser: (user) => set({ user }),
      setConsent: (consent) => set({
        consent,
        hasConsented: consent.terms && consent.privacy,
      }),
      setHasConsented: (value) => set({ hasConsented: value }),
      setHasOnboarded: (value) => set({ hasOnboarded: value }),

      addCapture: (capture) => set((state) => ({
        captures: [capture, ...state.captures],
        todayCount: state.todayCount + 1,
      })),
      addCaptures: (captures) => set((state) => ({
        captures: [...captures, ...state.captures],
        todayCount: state.todayCount + captures.length,
      })),
      setCaptures: (captures) => set({ captures }),
      markDone: (id) => set((state) => ({
        captures: state.captures.map((capture) => capture.id === id
          ? { ...capture, is_done: true, done_at: new Date().toISOString() }
          : capture),
        celebrateId: id,
      })),
      archiveCapture: (id) => set((state) => ({
        captures: state.captures.filter((capture) => capture.id !== id),
      })),
      parkThought: (id) => set((state) => ({
        captures: state.captures.map((capture) => capture.id === id
          ? { ...capture, is_parked: true }
          : capture),
      })),
      setEmotionalState: (state) => set({ emotionalState: state }),
      incrementToday: () => set((state) => ({ todayCount: state.todayCount + 1 })),
      setCelebrate: (id) => set({ celebrateId: id }),
      setFilter: (filter) => set({ activeFilter: filter }),
      setWeeklyReport: (report) => set({ weeklyReport: report }),
      recordToday: () => {
        const today = new Date().toISOString().split("T")[0];
        const days = get().consistencyDays;
        if (!days.includes(today)) {
          set({ consistencyDays: [...days, today].slice(-14) });
        }
      },
    }),
    {
      name: "neuronotes-v2-store",
      partialize: (state) => ({
        user: state.user,
        consent: state.consent,
        hasConsented: state.hasConsented,
        hasOnboarded: state.hasOnboarded,
        consistencyDays: state.consistencyDays,
        weeklyReport: state.weeklyReport,
        emotionalState: state.emotionalState,
      }),
    },
  ),
);
