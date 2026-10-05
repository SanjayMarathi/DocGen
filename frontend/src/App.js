import { useState, useEffect, useRef, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { AnimatePresence } from "framer-motion";
import { Menu, Sun, Moon } from "lucide-react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc as firestoreDeleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import AuthPage, { Logo } from "./components/AuthPage";
import Sidebar from "./components/Sidebar";
import PromptCard from "./components/PromptCard";
import DocView from "./components/DocView";
import { About, Contact } from "./components/InfoPages";

// --- API CONFIG ---
const API_BASE = "/api/";
const API = axios.create({ baseURL: API_BASE });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const MODEL = "qwen2.5-coder:3b";
const ERROR_TAG = "[[DOCGEN_ERROR]]"; // must match ERROR_TAG in backend/generator/views.py
const FLUSH_MS = 90; // re-render the markdown at most ~11x/s while streaming
const NAV = [
  ["home", "Workspace"],
  ["about", "About"],
  ["contact", "Contact"],
];

const splitError = (text) => {
  const i = text.indexOf(ERROR_TAG);
  return i < 0 ? [text, ""] : [text.slice(0, i).trimEnd(), text.slice(i + ERROR_TAG.length).trim()];
};

const readStored = (key, fallback) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => readStored("token", null));
  const [theme, setTheme] = useState(() => readStored("theme", "light"));
  const [view, setView] = useState("home");
  const [code, setCode] = useState("");
  const [docs, setDocs] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [quick, setQuick] = useState(() => readStored("quick", "1") === "1");
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState("checking");
  const [showHistory, setShowHistory] = useState(() => window.innerWidth >= 768);
  const [userData, setUserData] = useState({ username: "" });
  const abortRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    document.documentElement.className = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("quick", quick ? "1" : "0");
    } catch {}
  }, [quick]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch(`${API_BASE}status/?t=${Date.now()}`, { cache: "no-store" });
        setConnection(res.ok ? "online" : "offline");
      } catch {
        setConnection("offline");
      }
    };
    checkConnection();
    if (token) {
      API.get("user/")
        .then((res) => setUserData(res.data))
        .catch(() => {});
    }
    const interval = setInterval(checkConnection, 20000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchHistory = useCallback(async () => {
    if (!userData.username) return;
    try {
      const q = query(collection(db, "documents"), where("userId", "==", userData.username));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setHistory(items);
    } catch (e) {
      console.error(e);
    }
  }, [userData.username]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAuth = async (type, data) => {
    try {
      const endpoint = type === "register" ? "register/" : "login/";
      const res = await axios.post(`${API_BASE}${endpoint}`, data);
      if (type === "register") {
        navigate("/login");
        return { success: true, message: "Account created! Please sign in." };
      }
      if (res.data.access) {
        localStorage.setItem("token", res.data.access);
        setToken(res.data.access);
        navigate("/");
        return { success: true };
      }
      return { success: false, error: "Unexpected response from the server." };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || err.response?.data?.detail || "Connection error",
      };
    }
  };

  const logout = () => {
    abortRef.current?.abort();
    localStorage.removeItem("token");
    setToken(null);
    setUserData({ username: "" });
    setHistory([]);
    setView("home");
    setDocs("");
    setError("");
    setCurrentDocId(null);
    setCode("");
    navigate("/login");
  };

  const generateDocs = async () => {
    const input = code.trim();
    if (!input || loading) return;

    setDocs("");
    setError("");
    setLoading(true);
    setCurrentDocId(null);
    setView("home");

    const controller = new AbortController();
    abortRef.current = controller;

    let full = "";
    let timer = null;

    // Re-rendering the markdown on every token is O(n^2) work; batch it instead.
    const flush = () => {
      timer = null;
      const el = outputRef.current;
      const stick = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 160;
      setDocs(splitError(full)[0]);
      if (stick) {
        requestAnimationFrame(() => {
          const node = outputRef.current;
          if (node) node.scrollTop = node.scrollHeight;
        });
      }
    };
    const schedule = () => {
      if (!timer) timer = setTimeout(flush, FLUSH_MS);
    };

    try {
      // Start generating immediately; history is saved after the stream ends
      // (it used to block the request on a Firestore round trip).
      const response = await fetch(`${API_BASE}generate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: input, model: MODEL, mode: quick ? "quick" : "detailed" }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return;
        }
        let message = `The server returned an error (${response.status}).`;
        try {
          const body = await response.json();
          if (body.error) message = body.error;
        } catch {}
        setError(message);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        schedule();
      }
      full += decoder.decode();
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error(e);
        setError("Could not reach the server. Check your connection and try again.");
      }
    } finally {
      if (timer) clearTimeout(timer);
      const [text, streamError] = splitError(full);
      setDocs(text);
      if (streamError) setError(streamError);
      setLoading(false);
      abortRef.current = null;

      // Save finished (or stopped-early) documents; never save failures.
      if (userData.username && text.trim() && !streamError) {
        const topic = input.split(/\s+/).slice(0, 5).join(" ").slice(0, 30) || "New Doc";
        addDoc(collection(db, "documents"), {
          userId: userData.username,
          topic,
          content: text,
          created_at: new Date().toISOString(),
        })
          .then((ref) => {
            setCurrentDocId(ref.id);
            return fetchHistory();
          })
          .catch((e) => console.error("Firestore error", e));
      }
    }
  };

  const stopGeneration = () => abortRef.current?.abort();

  const newDocument = () => {
    setDocs("");
    setError("");
    setCurrentDocId(null);
    setView("home");
    if (window.innerWidth < 768) setShowHistory(false);
  };

  const loadDoc = (item) => {
    if (loading) return;
    setCurrentDocId(item.id);
    setDocs(item.content || "");
    setError("");
    setView("home");
    if (window.innerWidth < 768) setShowHistory(false);
  };

  const deleteDoc = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this document?")) return;
    try {
      await firestoreDeleteDoc(doc(db, "documents", id));
    } catch (err) {
      console.error(err);
      return;
    }
    if (currentDocId === id) {
      setDocs("");
      setCurrentDocId(null);
    }
    fetchHistory();
  };

  const downloadFile = async (type) => {
    if (!docs) return;
    try {
      const res = await API.post(type === "pdf" ? "pdf/" : "docx/", { docs }, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Documentation.${type}`;
      link.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Download failed. Please try again.");
    }
  };

  const isDark = theme === "dark";
  const hasDoc = Boolean(docs) || loading || Boolean(error);

  return (
    <>
      <div className="aurora" aria-hidden="true" />
      {!token ? (
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" onAuth={handleAuth} theme={theme} setTheme={setTheme} />} />
          <Route path="/register" element={<AuthPage mode="register" onAuth={handleAuth} theme={theme} setTheme={setTheme} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              <div className="flex h-[100dvh] w-full gap-3 overflow-hidden p-3">
                <AnimatePresence>
                  {showHistory && (
                    <Sidebar
                      key="sidebar"
                      history={history}
                      currentDocId={currentDocId}
                      disabled={loading}
                      username={userData.username}
                      connection={connection}
                      onSelect={loadDoc}
                      onDelete={deleteDoc}
                      onNew={newDocument}
                      onClose={() => setShowHistory(false)}
                      onLogout={logout}
                    />
                  )}
                </AnimatePresence>
                {showHistory && (
                  <button
                    type="button"
                    aria-label="Close sidebar"
                    className="fixed inset-0 z-30 bg-black/20 md:hidden"
                    onClick={() => setShowHistory(false)}
                  />
                )}

                <main className="flex min-w-0 flex-1 flex-col gap-3">
                  <header className="glass flex h-12 flex-none items-center justify-between gap-2 rounded-xl px-2.5">
                    <div className="flex min-w-[2.25rem] items-center gap-2">
                      {!showHistory && (
                        <>
                          <button type="button" onClick={() => setShowHistory(true)} className="chip !px-0" aria-label="Open sidebar">
                            <Menu size={16} />
                          </button>
                          <span className="hidden items-center gap-2 sm:flex">
                            <Logo size={26} />
                            <span className="font-bold tracking-tight">DocGen</span>
                          </span>
                        </>
                      )}
                    </div>

                    <nav className="flex items-center gap-1" aria-label="Primary">
                      {NAV.map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setView(id)}
                          aria-current={view === id ? "page" : undefined}
                          className={`h-8 rounded-lg px-3 text-sm font-semibold transition-colors ${
                            view === id ? "bg-accent text-accent-ink" : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </nav>

                    <button
                      type="button"
                      onClick={() => setTheme(isDark ? "light" : "dark")}
                      className="chip !px-0"
                      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                    >
                      {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                  </header>

                  {view === "home" && (
                    <section className="flex min-h-0 flex-1 flex-col">
                      {hasDoc && (
                        <div ref={outputRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-0.5 pb-4">
                          <DocView text={docs} loading={loading} error={error} isDark={isDark} onDownload={downloadFile} />
                        </div>
                      )}

                      <div className={hasDoc ? "flex-none" : "flex flex-1 flex-col items-center justify-center pb-12"}>
                        {!hasDoc && (
                          <div className="animate-rise mb-6 px-4 text-center">
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                              {userData.username ? `Hi ${userData.username}, what should we document?` : "What should we document?"}
                            </h1>
                          </div>
                        )}
                        <PromptCard
                          value={code}
                          onChange={setCode}
                          onSubmit={generateDocs}
                          onStop={stopGeneration}
                          loading={loading}
                          quick={quick}
                          onToggleQuick={() => setQuick((q) => !q)}
                          docked={hasDoc}
                        />
                      </div>
                    </section>
                  )}

                  {view === "about" && (
                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-1 py-6 sm:py-10">
                      <About />
                    </div>
                  )}

                  {view === "contact" && (
                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-1 py-6 sm:py-10">
                      <Contact />
                    </div>
                  )}
                </main>
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
    </>
  );
}
