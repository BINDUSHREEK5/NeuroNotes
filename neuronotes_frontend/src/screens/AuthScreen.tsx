import { useState } from "react";
import { C, F } from "../utils/tokens";
import { useStore } from "../store/useStore";
import PixelCat from "../components/PixelCat";
import { authService } from "../services";

export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const { setUser } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    if (!email || !password) return;
    if (mode === "register" && !name) return;
    setLoading(true);
    setError("");
    try {
      const result = mode === "login"
        ? await authService.signIn(email, password)
        : await authService.signUp(email, password, name, {
            terms: true,
            privacy: true,
            analytics: false,
            microphone: false,
          });

      const user = result.user;
      if (!user) throw new Error("Authentication failed");

      setUser({
        ...user,
        cat_variant: "sage",
        daily_captures: user.daily_captures ?? 0,
        nudge_hour: 9,
        cat_avatar: user.avatar_id || user.cat_avatar || "sage-cat",
      });
      onAuth();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: `1.5px solid ${C.borderLight}`,
    backgroundColor: C.surface,
    fontFamily: F.sans, fontSize: 15,
    color: C.text, outline: "none",
  };

  return (
    <div className="flex min-h-screen flex-col items-center px-6 pb-10 pt-14"
      style={{ backgroundColor: C.bg }}>
      <div className="mb-5 flex items-center justify-center rounded-[24px] border border-white/40"
        style={{ width: 76, height: 76, backgroundColor: "#C8D9CB", boxShadow: "0 12px 30px rgba(35,43,32,0.08)" }}>
        <PixelCat variant="sage" size={54} />
      </div>

      <h1 className="mb-1" style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 700, color: C.text }}>
        NeuroNotes
      </h1>
      <p className="mb-8 text-sm" style={{ fontFamily: F.sans, color: C.textMuted }}>
        {mode === "login" ? "Finally built for your brain." : "Create your account."}
      </p>

      <div className="w-full flex flex-col gap-3 mb-3">
        {mode === "register" && (
          <input style={inputStyle} placeholder="Your name" value={name}
            onChange={(event) => setName(event.target.value)} />
        )}
        <input style={inputStyle} placeholder="Email" type="email" value={email}
          onChange={(event) => setEmail(event.target.value)} />
        <input style={inputStyle} placeholder="Password" type="password" value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handle()} />
      </div>

      {error && <p className="w-full text-sm mb-3" style={{ color: C.soon, fontFamily: F.sans }}>{error}</p>}

      <button type="button" onClick={handle} disabled={loading}
        className="w-full py-4 rounded-2xl text-base font-medium mb-4 disabled:opacity-50"
        style={{ fontFamily: F.sans, backgroundColor: C.sage, color: "#FFF" }}>
        {loading ? "One moment..." : mode === "login" ? "Sign in" : "Create account"}
      </button>

      {mode === "login" && (
        <>
          <div className="w-full flex items-center gap-3 mb-4">
            <div className="flex-1" style={{ height: 1, backgroundColor: C.borderLight }} />
            <span className="text-xs" style={{ color: C.textMuted, fontFamily: F.sans }}>or</span>
            <div className="flex-1" style={{ height: 1, backgroundColor: C.borderLight }} />
          </div>

          <button type="button" className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 mb-6"
            style={{ backgroundColor: C.surface, border: `1.5px solid ${C.borderLight}`, fontFamily: F.sans, fontSize: 15, color: C.text }}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>
        </>
      )}

      <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
        className="text-sm" style={{ fontFamily: F.sans, color: C.textMuted }}>
        {mode === "login" ? "No account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
