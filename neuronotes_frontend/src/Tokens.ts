// ═══════════════════════════════════════════════════
// NEURONOTES DESIGN TOKENS — extracted from Figma
// Every value taken directly from screenshots
// ═══════════════════════════════════════════════════

export const C = {
  // Backgrounds
  bg:          "#EEEAE0",   // warm cream — every screen background
  surface:     "#FFFFFF",   // cards, inputs
  surfaceMuted:"#F5F2EA",   // secondary card background

  // Text
  text:        "#1C1C1A",   // near-black headlines
  textSub:     "#6B6B60",   // secondary body text
  textMuted:   "#9E9D94",   // placeholders, timestamps
  textGhost:   "#C4C3B8",   // very faint hints

  // Primary — sage green
  sage:        "#6B8F71",   // buttons, active states, badge bg
  sageDark:    "#4A6B50",   // pressed button
  sageLight:   "#D4E4D9",   // light badge bg, capture circle idle
  sageFaint:   "#EAF0EB",   // very light tint

  // Accent — for "We'll sort it" line, green links
  accentGreen: "#6B8F71",   // same as sage — used for highlighted text

  // Urgency — amber/orange (never red)
  urgent:      "#69534590",   // "↑ urgent" — orange
  soon:        "#c0cb8f",   // "↑ soon" — warm amber
  soonBg:      "#77695a",   // soon badge background

  // Badge colors (exactly from Figma)
  badgeTask:   { bg: "#D4E4D9", text: "#3D6B47" },   // sage green
  badgeNote:   { bg: "#E8E4F0", text: "#6B5FA0" },   // lavender
  badgeIdea:   { bg: "#FEF3C7", text: "#92600E" },   // yellow
  badgeFeeling:{ bg: "#FDE8D8", text: "#8B4A2A" },   // peach/salmon

  // Energy badge
  energyHigh:  { icon: "🔋", text: "#3D6B47" },
  energyMed:   { icon: "⚡", text: "#6B6B60" },
  energyLow:   { icon: "🌿", text: "#3D6B47" },
  energyMicro: { icon: "🌿", text: "#3D6B47" },

  // Nav
  navActive:   "#6B8F71",
  navInactive: "#9E9D94",

  // Border
  border:      "#E5E1D6",
  borderLight: "#EDE9DF",
};

// Fonts — Playfair Display for serif headings, Inter for body
export const F = {
  serif:  "'Playfair Display', 'Georgia', serif",
  sans:   "'Inter', system-ui, sans-serif",
};

// Spacing (Tailwind multiples of 4px)
export const S = {
  screenPad: "px-5",       // 20px horizontal screen padding
  cardPad:   "p-4",        // 16px card padding
  gap:       "gap-3",      // 12px standard gap
  gapLg:     "gap-5",      // 20px large gap
};
