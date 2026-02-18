import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  coy,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  FileText,
  Download,
  Wand2,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  LogOut,
  Menu,
  X,
  StopCircle,
  Sun,
  Moon,
  PlusCircle,
  Loader2,
  Settings,
  Layout,
  Code2,
  Paperclip,
  Mail,
  Github,
  Globe,
  ShieldCheck,
} from "lucide-react";

// --- API CONFIG ---
const API_BASE = "http://127.0.0.1:8000/api/";
const API = axios.create({ baseURL: API_BASE });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- MODELS ---
const MODELS = [
  { id: "qwen2.5-coder:3b", label: "Fast" },
  { id: "qwen2.5-coder:7b", label: "Thinking" },
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [view, setView] = useState("home");

  const [code, setCode] = useState("");
  const [docs, setDocs] = useState("");
  const [history, setHistory] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [model, setModel] = useState("qwen2.5-coder:3b");

  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState("checking");
  const [abortController, setAbortController] = useState(null);

  const [showHistory, setShowHistory] = useState(true);
  const [isInputMinimized, setIsInputMinimized] = useState(false);
  const outputRef = useRef(null);
  const [userData, setUserData] = useState({ username: "Guest" });

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  // --- IMPROVED ONLINE STATUS LOGIC ---
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Added timestamp to prevent browser caching of the status
        const res = await fetch(`${API_BASE}status/?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (res.ok) setConnection("online");
        else setConnection("offline");
      } catch {
        setConnection("offline");
      }
    };

    checkConnection();
    if (token) {
      fetchUser();
      fetchHistory();
    }
    const interval = setInterval(checkConnection, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [token]);

  const handleAuth = async (type, data) => {
    try {
      const endpoint = type === "register" ? "register/" : "login/";
      const res = await axios.post(`${API_BASE}${endpoint}`, data);
      if (type === "register") {
        alert("Account created! Please login.");
        return true;
      } else {
        if (res.data.access) {
          localStorage.setItem("token", res.data.access);
          setToken(res.data.access);
          return true;
        }
      }
    } catch (err) {
      alert(err.response?.data?.error || "Connection Error");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setHistory([]);
    setView("home");
    setDocs("");
    setCurrentDocId(null);
    setCode("");
  };

  const generateDocs = async () => {
    if (!code.trim()) return;
    setDocs("");
    setLoading(true);
    setCurrentDocId(null);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch(`${API_BASE}generate/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, model }),
        signal: controller.signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let isFirstChunk = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        let chunk = decoder.decode(value, { stream: true });
        if (isFirstChunk) {
          const match = chunk.match(/^\{"id":\s*(\d+)\}\n/);
          if (match) {
            setCurrentDocId(parseInt(match[1]));
            chunk = chunk.replace(match[0], "");
            fetchHistory();
          }
          isFirstChunk = false;
        }
        const container = outputRef.current;
        let shouldAutoScroll = false;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          if (scrollHeight - scrollTop - clientHeight < 150)
            shouldAutoScroll = true;
        }
        setDocs((prev) => prev + chunk);
        if (shouldAutoScroll && container) {
          setTimeout(() => {
            container.scrollTop = container.scrollHeight;
          }, 0);
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    }
    setLoading(false);
    fetchHistory();
  };

  const stopGeneration = () => {
    if (abortController) abortController.abort();
    setLoading(false);
  };
  const loadDoc = (doc) => {
    if (loading) return;
    setCurrentDocId(doc.id);
    setDocs(doc.content);
    setView("home");
  };

  const deleteDoc = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Delete this document?")) {
      await API.delete(`history/${id}/delete/`);
      if (currentDocId === id) {
        setDocs("");
        setCurrentDocId(null);
      }
      fetchHistory();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCode(ev.target.result);
    reader.readAsText(file);
  };

  const fetchUser = async () => {
    try {
      const res = await API.get("user/");
      setUserData(res.data);
    } catch {}
  };
  const fetchHistory = async () => {
    try {
      const res = await API.get("history/");
      setHistory(res.data);
    } catch {}
  };

  const downloadFile = async (type) => {
    if (!docs) return;
    try {
      const res = await API.post(
        type === "pdf" ? "pdf/" : "docx/",
        { docs },
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Documentation.${type}`;
      link.click();
    } catch {
      alert("Download failed.");
    }
  };

  const isDark = theme === "dark";
  const bgMain = isDark ? "bg-[#18181b]" : "bg-[#e5e7eb]";
  const bgCard = isDark ? "bg-[#27272a]" : "bg-white";
  const bgSidebar = isDark ? "bg-[#1f1f22]" : "bg-[#f3f4f6]";
  const textMain = isDark ? "text-gray-100" : "text-black";
  const textSub = isDark ? "text-gray-400" : "text-gray-600";
  const border = isDark ? "border-[#3f3f46]" : "border-gray-300";
  const primaryBtn = "bg-slate-700 hover:bg-slate-600 text-white shadow-none";

  if (!token)
    return <AuthPage onAuth={handleAuth} theme={theme} setTheme={setTheme} />;

  return (
    <div
      className={`flex h-screen w-full overflow-hidden font-sans ${bgMain} ${textMain}`}
    >
      <AnimatePresence>
        {showHistory && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 350, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={`flex-shrink-0 flex flex-col border-r ${border} ${bgSidebar} ${loading ? "pointer-events-none opacity-60 grayscale" : ""}`}
          >
            <div
              className={`p-4 border-b ${border} flex justify-between items-center`}
            >
              <button
                onClick={() => setView("home")}
                className="font-bold text-lg flex items-center gap-2 hover:opacity-80 transition"
              >
                DocGen
              </button>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <button
                onClick={() => {
                  setDocs("");
                  setCurrentDocId(null);
                  setView("home");
                }}
                className={`w-full py-3 ${primaryBtn} font-bold rounded-lg flex items-center justify-center gap-2`}
              >
                <PlusCircle size={18} /> New Document
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
              {history.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => loadDoc(doc)}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-200 dark:hover:bg-white/5 transition
                            ${currentDocId === doc.id ? `border-blue-500 ring-1 ring-blue-500 ${isDark ? "bg-blue-900/20" : "bg-blue-50"}` : `border-transparent`}
                        `}
                >
                  <div className="font-semibold text-sm truncate">
                    {doc.topic || "Untitled Doc"}
                  </div>
                  <div
                    className={`flex justify-between items-center text-xs mt-1 ${textSub}`}
                  >
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => deleteDoc(doc.id, e)}
                      className="hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className={`p-4 border-t ${border} ${bgCard}`}>
              <div
                onClick={() => setView("profile")}
                className="flex items-center gap-3 cursor-pointer hover:opacity-80"
              >
                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold">
                  {userData.username[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {userData.username}
                  </div>
                  <div
                    className={`text-[10px] font-bold ${connection === "online" ? "text-green-600" : "text-red-600"}`}
                  >
                    {connection.toUpperCase()}
                  </div>
                </div>
                <Settings size={16} />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <header
          className={`flex-none h-14 border-b ${border} ${bgCard} flex items-center justify-between px-4 z-20`}
        >
          <div className="flex items-center gap-3">
            {!showHistory && (
              <button
                onClick={() => setShowHistory(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded"
              >
                <Menu size={20} />
              </button>
            )}
            <h2 className="font-bold text-lg capitalize">{view}</h2>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setView("home")}
              className={`text-sm font-bold ${view === "home" ? "text-blue-600" : textSub}`}
            >
              Workspace
            </button>
            <button
              onClick={() => setView("about")}
              className={`text-sm font-bold ${view === "about" ? "text-blue-600" : textSub}`}
            >
              About
            </button>
            <button
              onClick={() => setView("contact")}
              className={`text-sm font-bold ${view === "contact" ? "text-blue-600" : textSub}`}
            >
              Contact
            </button>
            <div className="w-px h-4 bg-gray-400"></div>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="hover:text-blue-600"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {view === "home" && (
            <>
              <div
                ref={outputRef}
                className="flex-1 overflow-y-auto p-8 pb-10 scroll-smooth"
              >
                {!docs && !loading ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
                    <Layout size={64} className="mb-6" />
                    <h2 className="text-3xl font-bold mb-3">
                      Generate Professional Documentation
                    </h2>
                    <p className="max-w-md text-lg leading-relaxed">
                      Paste your code below, and let DocGen craft comprehensive
                      documentation for you.
                    </p>
                  </div>
                ) : (
                  <div
                    className={`max-w-4xl mx-auto ${bgCard} rounded-xl border ${border} shadow-sm p-10 min-h-[500px]`}
                  >
                    <div
                      className={`flex justify-end gap-3 pb-4 border-b ${border} mb-6`}
                    >
                      <button
                        onClick={() => navigator.clipboard.writeText(docs)}
                        className="flex items-center gap-1 text-xs font-bold hover:text-blue-500"
                      >
                        <Copy size={14} /> COPY
                      </button>
                      <button
                        onClick={() => downloadFile("docx")}
                        className="flex items-center gap-1 text-xs font-bold hover:text-blue-500"
                      >
                        <FileText size={14} /> DOCX
                      </button>
                      <button
                        onClick={() => downloadFile("pdf")}
                        className="flex items-center gap-1 text-xs font-bold hover:text-blue-500"
                      >
                        <Download size={14} /> PDF
                      </button>
                    </div>
                    <div
                      className={`prose max-w-none ${isDark ? "prose-invert" : "prose-neutral"}`}
                    >
                      {/* --- PRESERVED MARKDOWN --- */}
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-6 mb-4" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal pl-6 mb-4" {...props} />
                          ),
                          h1: ({ node, ...props }) => (
                            <h1
                              className="text-3xl font-bold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700"
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              className="text-2xl font-bold mt-8 mb-4"
                              {...props}
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="mb-4 leading-relaxed" {...props} />
                          ),
                          code({
                            node,
                            inline,
                            className,
                            children,
                            ...props
                          }) {
                            const match = /language-(\w+)/.exec(
                              className || "",
                            );
                            return !inline && match ? (
                              <div className="not-prose my-6 rounded-md overflow-hidden border border-gray-300 dark:border-gray-700">
                                <SyntaxHighlighter
                                  style={isDark ? vscDarkPlus : coy}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{ margin: 0 }}
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code
                                className={`px-1 py-0.5 rounded font-mono text-sm ${isDark ? "bg-white/10" : "bg-gray-100"}`}
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {docs}
                      </ReactMarkdown>
                      {loading && (
                        <Loader2
                          className="animate-spin mt-4 text-blue-500"
                          size={24}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`flex-shrink-0 p-4 border-t ${border} ${bgCard} z-20`}
              >
                <div className="max-w-4xl mx-auto flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold uppercase">
                        Model:
                      </label>
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className={`text-sm font-semibold border ${border} rounded p-1 outline-none cursor-pointer ${isDark ? "bg-[#18181b] text-white" : "bg-white text-black"}`}
                      >
                        {MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => setIsInputMinimized(!isInputMinimized)}
                      className="opacity-50"
                    >
                      <ChevronDown size={20} />
                    </button>
                  </div>
                  {!isInputMinimized && (
                    <div
                      className={`flex gap-2 p-2 border ${border} rounded-xl ${isDark ? "bg-[#18181b]" : "bg-gray-50"}`}
                    >
                      <label className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded cursor-pointer flex flex-col justify-end">
                        <Paperclip size={20} />
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                      <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className={`flex-1 bg-transparent outline-none p-2 resize-none h-32 font-mono text-sm ${isDark ? "text-white" : "text-black"}`}
                        placeholder="Paste code..."
                        disabled={loading}
                      />
                      <div className="flex flex-col justify-end">
                        {loading ? (
                          <button
                            onClick={stopGeneration}
                            className="p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          >
                            <StopCircle size={24} />
                          </button>
                        ) : (
                          <button
                            onClick={generateDocs}
                            disabled={!code.trim()}
                            className={`p-3 ${primaryBtn} rounded-lg`}
                          >
                            <Wand2 size={24} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {view === "about" && (
            <div className="p-10 max-w-4xl mx-auto overflow-y-auto">
              <h1 className="text-4xl font-extrabold mb-6 tracking-tight">
                About DocGen
              </h1>
              <div className="space-y-8">
                <p className="text-xl leading-relaxed opacity-80">
                  DocGen is an AI-powered documentation engine designed to
                  transform source code into professional-grade technical
                  documents.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div
                    className={`p-6 border ${border} rounded-2xl ${bgCard} shadow-sm`}
                  >
                    <div className="p-3 bg-blue-500/10 rounded-lg w-fit mb-4 text-blue-600">
                      <ShieldCheck size={28} />
                    </div>
                    <h3 className="font-bold text-xl mb-2">
                      Privacy & Security
                    </h3>
                    <p className="text-sm opacity-70">
                      Your code stays yours. We prioritize session security and
                      leverage industry-standard AI processing.
                    </p>
                  </div>
                  <div
                    className={`p-6 border ${border} rounded-2xl ${bgCard} shadow-sm`}
                  >
                    <div className="p-3 bg-green-500/10 rounded-lg w-fit mb-4 text-green-600">
                      <Globe size={28} />
                    </div>
                    <h3 className="font-bold text-xl mb-2">Format Export</h3>
                    <p className="text-sm opacity-70">
                      Generate files compatible with GitHub, Jira, and internal
                      wikis instantly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === "contact" && (
            <div className="p-10 max-w-4xl mx-auto">
              <h1 className="text-4xl font-extrabold mb-10 tracking-tight">
                Contact Support
              </h1>
              <div className="grid md:grid-cols-2 gap-8">
                <div
                  className={`p-8 border ${border} rounded-2xl ${bgCard} flex flex-col items-center text-center shadow-lg`}
                >
                  <Mail className="text-blue-600 mb-6" size={40} />
                  <h2 className="text-2xl font-bold mb-2">Email Support</h2>
                  <a
                    href="mailto:support@docgen.com"
                    className="text-blue-600 font-bold text-lg hover:underline"
                  >
                    support@docgen.com
                  </a>
                </div>
                <div
                  className={`p-8 border ${border} rounded-2xl ${bgCard} flex flex-col items-center text-center shadow-lg`}
                >
                  <Github className="mb-6" size={40} />
                  <h2 className="text-2xl font-bold mb-2">GitHub</h2>
                  <a href="https://github.com/SanjayMarathi/DocGen" className="font-bold text-lg hover:underline">
                    github.com/docgen
                  </a>
                </div>
              </div>
            </div>
          )}

          {view === "profile" && (
            <div className="p-10 max-w-2xl mx-auto">
              <div
                className={`p-10 border ${border} rounded-[2rem] ${bgCard} text-center shadow-2xl`}
              >
                <div className="w-24 h-24 rounded-full bg-blue-600 mx-auto flex items-center justify-center text-white text-4xl font-bold mb-6">
                  {userData.username[0]}
                </div>
                <h1 className="text-3xl font-bold mb-2">{userData.username}</h1>
                <p className="text-zinc-500 font-medium mb-10 uppercase tracking-widest text-xs">
                  Active Session
                </p>
                <button
                  onClick={logout}
                  className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 flex gap-3 items-center justify-center transition-all shadow-lg"
                >
                  <LogOut size={20} /> Terminate Session & Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const AuthPage = ({ onAuth, theme, setTheme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${isDark ? "bg-[#18181b] text-white" : "bg-[#f9fafb] text-black"}`}
    >
      <div
        className={`w-full max-w-md p-8 rounded-2xl shadow-sm border ${isDark ? "bg-[#27272a] border-[#3f3f46]" : "bg-white border-gray-200"}`}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">DocGen</h1>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAuth(isLogin ? "login" : "register", {
              username: user,
              password: pass,
            });
          }}
          className="space-y-4"
        >
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="Username"
            className={`w-full p-3 rounded-lg border outline-none ${isDark ? "bg-[#18181b] border-[#3f3f46]" : "bg-white"}`}
            required
          />
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Password"
            className={`w-full p-3 rounded-lg border outline-none ${isDark ? "bg-[#18181b] border-[#3f3f46]" : "bg-white"}`}
            required
          />
          <button className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg">
            {isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>
        <div className="mt-6 flex flex-col items-center gap-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
          <button onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};
