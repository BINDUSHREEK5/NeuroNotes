import type { CaptureType, EnergyLevel } from "./store/useStore";

// Colors
export const colors = {
  bg: "#F7F5F2",
  surface: "#FFFFFF",
  muted: "#F0EDE8",
  subtle: "#E8E4DF",
  textPrimary: "#2C2C2C",
  textSecondary: "#7A7570",
  textMuted: "#B0A9A2",
  textGhost: "#D4CEC9",
  sageDeep: "#4A7A5A",
  sage: "#7B9E87",
  sageMid: "#A8C5B0",
  sageLight: "#D4E4D9",
  sageFaint: "#EDF5EF",
  amberDeep: "#194765",
  amber: "#457b9d",
  amberLight: "#8ba4c6",
  lavender: "#9B8EC4",
  lavenderLight: "#E8E4F0",
  peachLight: "#6f5060",
  peachText: "#6f5060",
};

// Type badge config
export const TYPE_CONFIG: Record<CaptureType, { label: string; bg: string; text: string }> = {
  task: { label: "task", bg: colors.sageLight, text: colors.sageDeep },
  note: { label: "note", bg: colors.muted, text: colors.textSecondary },
  idea: { label: "idea", bg: colors.lavenderLight, text: colors.lavender },
  feeling: { label: "feeling", bg: colors.peachLight, text: colors.peachText },
};

// Energy config
export const ENERGY_CONFIG: Record<EnergyLevel, { label: string; emoji: string; bg: string; text: string }> = {
  high: { label: "High energy", emoji: "🔋", bg: "#E8F4E8", text: "#2D6A4F" },
  medium: { label: "Medium", emoji: "⚡", bg: colors.muted, text: colors.textSecondary },
  low: { label: "Low energy", emoji: "🌿", bg: colors.sageFaint, text: colors.sage },
  micro: { label: "5 min", emoji: "✦", bg: "#EDF5EF", text: colors.sageDeep },
};

// Emotional state config
export const EMOTIONAL_CONFIG = {
  overwhelmed: { emoji: "😤", label: "Overwhelmed", bg: colors.amberLight, text: colors.amberDeep },
  low: { emoji: "😴", label: "Low energy", bg: colors.muted, text: colors.textSecondary },
  okay: { emoji: "😐", label: "Okay", bg: colors.sageFaint, text: colors.sage },
  energized: { emoji: "⚡", label: "Energized", bg: colors.sageLight, text: colors.sageDeep },
};

// Urgency display
export const URGENCY_LABEL: Record<string, string> = {
  high: "↑ soon",
  medium: "· sometime",
  low: "",
};

// Win messages
export const WIN_MESSAGES = [
  "You did the thing. 🎉",
  "That's one less thing in your head. ✨",
  "Look at you go. 🌟",
  "Brain: 1, Chaos: 0. 🧠",
  "Small win. Still a win. 🌿",
  "You showed up. That matters. 💚",
  "One thing at a time. You're doing it. ✦",
];

// Greeting messages
export const GREETINGS = [
  "What's on your mind?",
  "Brain dump time.",
  "Speak freely.",
  "What needs out of your head?",
  "Go ahead, let it out.",
  "What's taking up space up there?",
];

// Nudge messages
export const NUDGE_MESSAGES = [
  "One thing from your list is waiting 🌿",
  "Good moment for a quick brain dump?",
  "You captured something. Want to look at it?",
  "One thing. That's all. Ready?",
  "Something's been waiting patiently for you.",
  "Your inbox has a few things. No pressure.",
  "When you have a moment — your notes are here.",
  "Good time to clear one thing off your list?",
];

export const randomFrom = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];
