import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Zap, ShieldCheck, Download, Globe, Sun, Moon, Loader2, X } from "lucide-react";

const FEATURES = [
  { icon: Zap, title: "Fast by default", desc: "Quick mode streams a concise doc in seconds" },
  { icon: FileText, title: "Smart analysis", desc: "Breaks code down into clear explanations" },
  { icon: Download, title: "Export anywhere", desc: "One-click PDF and DOCX files" },
  { icon: ShieldCheck, title: "Private by design", desc: "Runs on a local model, not a third-party API" },
];

export function Logo({ size = 36 }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center rounded-lg bg-accent text-accent-ink shadow-sm"
      style={{ width: size, height: size }}
    >
      <FileText size={size * 0.55} strokeWidth={2.4} />
    </span>
  );
}

export default function AuthPage({ mode, onAuth, theme, setTheme }) {
  const isLogin = mode === "login";
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const isDark = theme === "dark";

  const submit = async (type, credentials) => {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    const res = await onAuth(type, credentials);
    setLoading(false);
    if (res && !res.success) {
      setErrorMsg(res.error);
    } else if (res && res.message) {
      setSuccessMsg(res.message);
      if (type === "register") {
        setUser("");
        setPass("");
      }
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    submit(isLogin ? "login" : "register", { username: user, password: pass });
  };

  const switchMode = () => {
    setErrorMsg("");
    setSuccessMsg("");
    navigate(isLogin ? "/register" : "/login");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 px-5 py-10 lg:flex-row lg:gap-20 lg:px-16">
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="chip absolute right-5 top-5"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Brand + features */}
      <section className="w-full max-w-md text-center lg:text-left">
        <div className="mb-6 flex items-center justify-center gap-3 lg:justify-start">
          <Logo size={44} />
          <span className="text-2xl font-bold tracking-tight">DocGen</span>
        </div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Turn your code into
          <span className="block">documentation.</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">
          Paste code or a topic and get structured, professional documentation streamed back in
          seconds, ready to export as PDF or DOCX.
        </p>

        <ul className="mt-8 hidden grid-cols-2 gap-3 text-left lg:grid">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="glass rounded-xl p-4">
              <Icon size={18} className="mb-2" />
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-ink/70">{desc}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* Form card */}
      <section className="glass w-full max-w-md rounded-2xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight">{isLogin ? "Welcome back" : "Create your account"}</h2>
        <p className="mb-6 mt-1 text-sm text-ink/70">
          {isLogin ? "Enter your credentials to open your workspace." : "Get started with DocGen in seconds."}
        </p>

        {errorMsg && (
          <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-medium text-red-700 dark:text-red-300">
            <X size={16} className="flex-shrink-0" /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-800 dark:text-emerald-300">
            <ShieldCheck size={16} className="flex-shrink-0" /> {successMsg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-xs font-semibold text-ink/80">
              Username
            </label>
            <input
              id="username"
              className="field"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-ink/80">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="field"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Enter your password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="chip chip-accent !h-11 w-full !text-sm disabled:opacity-70"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        {isLogin && (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setUser("demo");
              setPass("demouser");
              submit("login", { username: "demo", password: "demouser" });
            }}
            className="chip mt-3 !h-11 w-full !text-sm"
          >
            Try demo account
          </button>
        )}

        <p className="mt-6 border-t pt-5 text-center text-sm text-ink/70" style={{ borderColor: "var(--line)" }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button type="button" onClick={switchMode} className="ml-2 font-bold text-ink underline decoration-accent decoration-[3px] underline-offset-4">
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </section>

      <p className="text-xs font-medium text-ink/60 lg:absolute lg:bottom-5 lg:left-16">
        <Globe size={12} className="mr-1 inline -translate-y-px" />
        &copy; {new Date().getFullYear()} DocGen &middot; docgenindia@gmail.com
      </p>
    </div>
  );
}
