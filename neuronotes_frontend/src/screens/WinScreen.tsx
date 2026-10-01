type WinScreenProps = {
  setScreen: (screen: "capture" | "inbox" | "focus" | "win" | "paywall") => void;
};

export default function WinScreen({ setScreen }: WinScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 text-6xl">🎉</div>
      <h2 className="text-3xl font-bold text-stone-900">Nice work.</h2>
      <p className="mt-3 text-stone-600">You completed one important thing and cleared the noise.</p>

      <button
        type="button"
        onClick={() => setScreen("capture")}
        className="mt-8 rounded-full bg-stone-900 px-6 py-3 text-white font-medium"
      >
        Back to capture
      </button>
    </div>
  );
}
