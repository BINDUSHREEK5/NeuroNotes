import { useEffect, useState, type CSSProperties } from "react";

export type CatState = "idle" | "thinking" | "happy" | "watching" | "sleeping";
export type PixelCatVariant = "sage" | "lavender" | "amber" | "cloud" | "cocoa" | "peach";

const VARIANT_COLORS: Record<PixelCatVariant, string> = {
  sage: "#4A7A5A",
  lavender: "#9B8EC4",
  amber: "#457B9D",
  cloud: "#A9B7C8",
  cocoa: "#6B4A39",
  peach: "#6F5060",
};

// 9 cols × 11 rows pixel-art cat
// 0 = transparent, 1 = body, 2 = eye (yellow), 3 = nose (pink)
const GRIDS: Record<CatState, (0|1|2|3)[][]> = {
  idle: [
    [0,0,1,0,0,0,1,0,0],
    [0,1,1,0,0,0,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1],
    [1,1,2,2,1,2,2,1,1],
    [1,1,2,2,1,2,2,1,1],
    [1,1,1,1,3,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,0,0,0,0,1,0,0],
  ],
  thinking: [
    [0,0,1,0,0,0,1,0,0],
    [0,1,1,0,0,0,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1],
    [1,1,2,2,1,2,2,1,1],  // only top row of eyes visible (half-lidded)
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,3,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,0,0,0,0,1,0,0],
  ],
  happy: [
    [0,0,1,0,0,0,1,0,0],
    [0,1,1,0,0,0,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1],
    [1,1,2,2,1,2,2,1,1],
    [1,1,2,2,1,2,2,1,1],
    [1,1,1,1,3,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,0,0,0,0,1,0,0],
  ],
  watching: [
    [0,0,1,0,0,0,1,0,0],
    [0,1,1,0,0,0,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1],
    [1,2,2,2,1,2,2,2,1],  // wide alert eyes
    [1,2,2,2,1,2,2,2,1],
    [1,1,1,1,3,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,0,0,0,0,1,0,0],
  ],
  sleeping: [
    [0,0,1,0,0,0,1,0,0],
    [0,1,1,0,0,0,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,3,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,0],
    [1,1,0,0,0,0,1,0,0],
  ],
};

const THINK_DOTS = [
  { col: 2, color: "#7B9E87", delay: 0    },
  { col: 4, color: "#9B8EC4", delay: 0.20 },
  { col: 6, color: "#A8C5B0", delay: 0.40 },
];

export function PixelCat({
  size = 54,
  state = "idle",
  night = false,
  bodyColorOverride,
  variant,
  sparkles = false,
  className,
  style = {},
}: {
  size?: number;
  state?: CatState;
  night?: boolean;
  bodyColorOverride?: string;
  variant?: PixelCatVariant;
  sparkles?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const COLS = 9, ROWS = 11;
  const px = size / COLS;
  const svgW = size;
  const svgH = ROWS * px;
  const extraTop = state === "thinking" ? px * 2.5 : 0;

  const bodyColor = bodyColorOverride ?? (variant ? VARIANT_COLORS[variant] : night ? "#2A2240" : "#1C1A24");
  const eyeColor  = "#E8D44D";
  const noseColor = "#FF9BAA";

  const colorMap: Record<number, string> = { 1: bodyColor, 2: eyeColor, 3: noseColor };

  const grid = GRIDS[state];

  // Sparkles for happy state
  const [sparkVis, setSparkVis] = useState(false);
  useEffect(() => {
    if (state === "happy") { const t = setTimeout(() => setSparkVis(true), 50); return () => clearTimeout(t); }
    setSparkVis(false);
  }, [state]);

  return (
    <svg
      width={svgW}
      height={svgH + extraTop}
      viewBox={`0 ${-extraTop} ${svgW} ${svgH + extraTop}`}
      className={className}
      style={{ imageRendering: "pixelated", overflow: "visible", ...style }}
    >
      {/* Body pixels */}
      {grid.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          return (
            <rect
              key={`${r}-${c}`}
              x={c * px} y={r * px}
              width={px} height={px}
              fill={colorMap[cell]}
            />
          );
        })
      )}

      {/* Thinking dots — float above head */}
      {state === "thinking" && THINK_DOTS.map((d, i) => (
        <rect
          key={`td${i}`}
          x={d.col * px + px * 0.1}
          y={-extraTop + i * px * 0.5}
          width={px * 0.8} height={px * 0.8}
          fill={d.color}
          style={{ animation: `spin3dot 1.2s ${d.delay}s ease-in-out infinite` }}
        />
      ))}

      {/* Happy sparkles */}
      {(sparkles || (state === "happy" && sparkVis)) && [
        { x: -px * 1.5, y: px * 1, char: "✦", c: "#E8D44D" },
        { x: svgW + px * 0.5, y: px * 0.5, char: "✦", c: "#7B9E87" },
        { x: -px,        y: px * 4, char: "·",  c: "#9B8EC4" },
      ].map((s, i) => (
        <text key={`sp${i}`} x={s.x} y={s.y} fill={s.c}
          style={{ fontSize: px * 1.4, animation: "fadeIn .25s ease-out" }}>
          {s.char}
        </text>
      ))}

      {/* Sleeping Zzz */}
      {state === "sleeping" && (
        <text x={svgW * 0.6} y={-px * 0.5} fill={night ? "#4A433D" : "#B0A9A2"}
          style={{ fontSize: px * 1.2, animation: "fadeIn .4s ease-out" }}>
          z z
        </text>
      )}
    </svg>
  );
}

export default PixelCat;
