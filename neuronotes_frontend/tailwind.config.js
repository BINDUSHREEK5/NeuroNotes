/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          DEFAULT: "#7B9E87",
          deep: "#4A7A5A",
          mid: "#A8C5B0",
          light: "#D4E4D9",
          faint: "#EDF5EF",
        },
        amber: {
          DEFAULT: "#457b9d",
          deep: "#234357",
          light: "#c5e4f8",
          faint: "#FBF0E4",
        },
        lavender: {
          DEFAULT: "#9B8EC4",
          light: "#E8E4F0",
        },
        peach: {
          light: "#6f5060",
          text: "#804564",
        },
        neutral: {
          bg: "#F7F5F2",
          surface: "#FFFFFF",
          muted: "#F0EDE8",
          subtle: "#E8E4DF",
          primary: "#2C2C2C",
          secondary: "#7A7570",
          muted2: "#B0A9A2",
          ghost: "#D4CEC9",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        "gentle-pulse": "gentlePulse 3s ease-in-out infinite",
        "typing-dot": "typingDot 1.2s ease-in-out infinite",
      },
      keyframes: {
        gentlePulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.04)" },
        },
        typingDot: {
          "0%, 100%": { opacity: "0.3", transform: "translateY(0)" },
          "50%": { opacity: "1", transform: "translateY(-3px)" },
        },
      },
    },
  },
  plugins: [],
};
