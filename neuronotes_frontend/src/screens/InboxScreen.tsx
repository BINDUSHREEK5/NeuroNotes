import { useEffect, useState } from "react";
import { getInbox } from "../services/api";
import { useStore } from "../store/useStore";
import { colors, EMOTIONAL_CONFIG } from "../utils/design";
import { CaptureCard, FilterPills, WinBurst, ConsistencyDots } from "../components/ui";
import type { Screen } from "../App";
import type { CaptureType, EnergyLevel } from "../store/useStore";

type TypeFilter = CaptureType | "all";
type EnergyFilter = EnergyLevel | "all";

const TYPE_OPTIONS = [
  { value: "all" as TypeFilter, label: "All" },
  { value: "task" as TypeFilter, label: "Tasks" },
  { value: "note" as TypeFilter, label: "Notes" },
  { value: "idea" as TypeFilter, label: "Ideas" },
  { value: "feeling" as TypeFilter, label: "Feelings" },
];

const ENERGY_OPTIONS = [
  { value: "all" as EnergyFilter, label: "Any energy" },
  { value: "high" as EnergyFilter, label: "🔋 High" },
  { value: "medium" as EnergyFilter, label: "⚡ Medium" },
  { value: "low" as EnergyFilter, label: "🌿 Low" },
  { value: "micro" as EnergyFilter, label: "✦ 5 min" },
];

const SUGGESTED_ENERGY: Record<string, EnergyFilter> = {
  overwhelmed: "micro",
  low: "low",
  okay: "all",
  energized: "high",
};

export default function InboxScreen({ setScreen: _setScreen }: { setScreen: (screen: Screen) => void }) {
  const { captures, setCaptures, emotionalState, celebrateId, setCelebrate, consistencyDays } = useStore();
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [energyFilter, setEnergyFilter] = useState<EnergyFilter>("all");
  const [celebrating, setCelebrating] = useState(false);
  const [showConsistency, setShowConsistency] = useState(false);

  useEffect(() => {
    if (emotionalState && SUGGESTED_ENERGY[emotionalState]) {
      setEnergyFilter(SUGGESTED_ENERGY[emotionalState]);
    }
  }, [emotionalState]);

  useEffect(() => {
    let mounted = true;
    const loadInbox = async () => {
      setLoading(true);
      try {
        const data = await getInbox();
        if (mounted) setCaptures(data.captures);
      } catch {
        // Keep locally persisted captures visible when the API is unavailable.
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadInbox();
    return () => { mounted = false; };
  }, [setCaptures]);

  useEffect(() => {
    if (!celebrateId) return;
    setCelebrating(true);
    const timer = window.setTimeout(() => {
      setCelebrating(false);
      setCelebrate(null);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [celebrateId, setCelebrate]);

  const visible = captures
    .filter((capture) => !capture.is_archived && !capture.is_parked)
    .filter((capture) => typeFilter === "all" || capture.capture_type === typeFilter)
    .filter((capture) => energyFilter === "all" || capture.energy_level === energyFilter);
  const active = visible.filter((capture) => !capture.is_done);
  const done = captures.filter((capture) => capture.is_done && !capture.is_archived);
  const parked = captures.filter((capture) => capture.is_parked && !capture.is_archived);

  const emptyMessage = () => {
    if (emotionalState === "overwhelmed") return "You're clear. One thing at a time is enough. 🌿";
    if (energyFilter === "micro") return "No quick 5-min tasks right now. Want to add one?";
    if (typeFilter !== "all") return `No ${typeFilter}s right now.`;
    return "Nothing here. Capture something? 🌿";
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: colors.bg }}>
      {celebrating && <WinBurst />}

      {emotionalState && (
        <div className="px-5 pt-12 pb-2">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl"
            style={{ backgroundColor: EMOTIONAL_CONFIG[emotionalState]?.bg }}>
            <div className="flex items-center gap-2">
              <span>{EMOTIONAL_CONFIG[emotionalState]?.emoji}</span>
              <p className="text-xs font-medium"
                style={{ color: EMOTIONAL_CONFIG[emotionalState]?.text }}>
                {energyFilter !== "all"
                  ? `Showing ${energyFilter === "micro" ? "5-min" : energyFilter} energy tasks`
                  : "Showing everything"}
              </p>
            </div>
            <button type="button" onClick={() => setEnergyFilter("all")}
              className="text-xs" style={{ color: colors.textMuted }}>
              show all
            </button>
          </div>
        </div>
      )}

      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light" style={{ color: colors.textPrimary }}>Your inbox</h1>
            <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
              {active.length === 0
                ? "You're all clear 🌿"
                : `${active.length} thing${active.length !== 1 ? "s" : ""} waiting`}
            </p>
          </div>
          <button type="button" aria-label="Toggle consistency" onClick={() => setShowConsistency((value) => !value)}
            className="text-xl">🌿</button>
        </div>

        {showConsistency && (
          <div className="mt-3 p-3 rounded-2xl" style={{ backgroundColor: colors.muted }}>
            <ConsistencyDots days={consistencyDays} />
          </div>
        )}
      </div>

      <div className="mt-2">
        <FilterPills options={TYPE_OPTIONS} active={typeFilter} onSelect={setTypeFilter} />
      </div>
      <div className="mt-2">
        <FilterPills options={ENERGY_OPTIONS} active={energyFilter} onSelect={setEnergyFilter} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 mt-4 pb-6 space-y-3">
        {loading && [1, 2, 3].map((item) => (
          <div key={item} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: colors.muted }} />
        ))}

        {!loading && active.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-4xl">🌿</span>
            <p className="text-sm text-center" style={{ color: colors.textSecondary }}>{emptyMessage()}</p>
          </div>
        )}

        {!loading && active.map((capture) => (
          <CaptureCard key={capture.id} capture={capture} />
        ))}

        {parked.length > 0 && (
          <div className="mt-4">
            <p className="text-xs mb-2 px-1" style={{ color: colors.textGhost }}>
              🅿️ Parked thoughts ({parked.length})
            </p>
            {parked.map((capture) => (
              <CaptureCard key={capture.id} capture={capture} showParked />
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div className="mt-4">
            <p className="text-xs mb-2 px-1" style={{ color: colors.textGhost }}>Completed {done.length}</p>
            {done.slice(0, 5).map((capture) => (
              <div key={capture.id} className="px-4 py-3 rounded-2xl mb-2 opacity-35">
                <p className="text-sm line-through font-light" style={{ color: colors.textMuted }}>
                  {capture.ai_summary}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
