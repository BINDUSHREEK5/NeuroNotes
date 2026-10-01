import { colors } from "../utils/design";
import { useStore } from "../store/useStore";
import PixelCat from "../components/PixelCat";
import type { Screen } from "../App";
import { profileService } from "../services";

const CATS = [
  { id: "sage-cat", name: "Sage Cat", color: "#4A7A5A" },
  { id: "lavender-cat", name: "Lavender Cat", color: "#7B6FC4" },
  { id: "amber-cat", name: "Amber Cat", color: "#457B9D" },
  { id: "cloud-cat", name: "Cloud Cat", color: "#1f4571" },
  { id: "cocoa-cat", name: "Cocoa Cat", color: "#8a794e" },
  { id: "peach-cat", name: "Peach Cat", color: "#64314c" },
];

export default function ProfileScreen({ setScreen }: { setScreen: (screen: Screen) => void }) {
  const { user, setUser } = useStore();
  const selectedId = user?.avatar_id || user?.cat_avatar || CATS[0].id;
  const selectedCat = CATS.find((cat) => cat.id === selectedId) ?? CATS[0];

  const chooseCat = async (catId: string) => {
    if (!user) return;
    const updated = { ...user, avatar_id: catId, cat_avatar: catId } as typeof user;
    setUser(updated);
    await profileService.setAvatar(user.id, catId);
  };

  return (
    <main className="min-h-screen overflow-y-auto px-5 pb-8 pt-10" style={{ backgroundColor: colors.bg }}>
      <button type="button" onClick={() => setScreen("capture_idle")} className="mb-8 text-sm" style={{ color: colors.textSecondary }}>
        <span aria-hidden="true">←</span> Back
      </button>
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.sageLight }}>
          <PixelCat variant={selectedCat.id.replace("-cat", "") as "sage" | "lavender" | "amber" | "cloud" | "cocoa" | "peach"} size={42} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: colors.textSecondary }}>Profile</p>
          <h1 className="mt-1 text-3xl" style={{ color: colors.textPrimary }}>Your space</h1>
          <p className="mt-1 text-sm" style={{ color: colors.textSecondary }}>{user?.name || "NeuroNotes user"}</p>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 text-lg font-semibold" style={{ color: colors.textPrimary }}>Choose your companion</h2>
            <p className="text-sm" style={{ color: colors.textSecondary }}>A small presence for your corner of the app.</p>
          </div>
          <button type="button" onClick={() => setScreen("companion")} className="rounded-full px-3 py-2 text-xs font-medium" style={{ backgroundColor: colors.sageLight, color: colors.sageDeep }}>
            Open chat
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {CATS.map((cat) => {
            const selected = cat.id === selectedId;
            return (
              <button type="button" key={cat.id} onClick={() => chooseCat(cat.id)}
                className="flex items-center gap-3 rounded-2xl border p-3 text-left transition-transform active:scale-95"
                style={{ backgroundColor: colors.surface, borderColor: selected ? cat.color : colors.subtle }}>
                <PixelCat variant={cat.id.replace("-cat", "") as "sage" | "lavender" | "amber" | "cloud" | "cocoa" | "peach"} size={28} />
                <span className="text-xs font-medium" style={{ color: colors.textPrimary }}>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}