import { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
  Paperclip,
  Mail,
  Github,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc as firestoreDeleteDoc, doc, query, where, updateDoc } from "firebase/firestore";

// --- API CONFIG ---
const API_BASE = "/api/";
const API = axios.create({ baseURL: API_BASE });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- MODELS (7b removed as requested) ---
const MODELS = [{ id: "qwen2.5-coder:3b", label: "Fast" }];

export default function App() {
  const navigate = useNavigate();
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
  const [userData, setUserData] = useState({ username: "" });
  const outputRef = useRef(null);

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch(`${API_BASE}status/?t=${Date.now()}`, {
          cache: "no-store",
        });
        setConnection(res.ok ? "online" : "offline");
      } catch {
        setConnection("offline");
      }
    };
    checkConnection();
    if (token) {
      fetchUser();
    }
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (userData.username) {
      fetchHistory();
    }
  }, [userData.username]);

  const fetchUser = async () => {
    try {
      const res = await API.get("user/");
      setUserData(res.data);
    } catch {}
  };
  const fetchHistory = async () => {
    if (!userData.username) return;
    try {
      const q = query(
        collection(db, "documents"), 
        where("userId", "==", userData.username)
      );
      const querySnapshot = await getDocs(q);
      const docsData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      docsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setHistory(docsData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAuth = async (type, data) => {
    try {
      const endpoint = type === "register" ? "register/" : "login/";
      const res = await axios.post(`${API_BASE}${endpoint}`, data);
      if (type === "register") {
        navigate("/login");
        return { success: true, message: "Account created! Please login." };
      }
      if (res.data.access) {
        localStorage.setItem("token", res.data.access);
        setToken(res.data.access);
        navigate("/");
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || "Connection Error" };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUserData({ username: "" });
    setHistory([]);
    setView("home");
    setDocs("");
    setCurrentDocId(null);
    setCode("");
    navigate("/login");
  };

  const generateDocs = async () => {
    if (!code.trim()) return;
    setDocs("");
    setLoading(true);
    setCurrentDocId(null);
    const controller = new AbortController();
    setAbortController(controller);

    let fullContent = "";
    let fsDocId = null;

    if (userData.username) {
        const topic = code.split(/[\s\n]+/).slice(0, 5).join(" ").substring(0, 30) || "New Doc";
        try {
            const newDocRef = await addDoc(collection(db, "documents"), {
              userId: userData.username,
              topic: topic,
              content: "",
              created_at: new Date().toISOString()
            });
            fsDocId = newDocRef.id;
            setCurrentDocId(fsDocId);
            fetchHistory();
        } catch(e) { console.error("Firestore error", e); }
    }

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

      if (!response.ok) {
        const errorText = await response.text();
        setDocs(`### Generation Error\nThe server returned an error (${response.status}).\n\n${errorText}`);
        return;
      }

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
            chunk = chunk.replace(match[0], "");
          }
          isFirstChunk = false;
        }

        fullContent += chunk;
        setDocs((prev) => prev + chunk);

        const container = outputRef.current;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          if (scrollHeight - scrollTop - clientHeight < 150) {
            setTimeout(() => {
              container.scrollTop = container.scrollHeight;
            }, 0);
          }
        }
      }

      if (fsDocId) {
        await updateDoc(doc(db, "documents", fsDocId), {
          content: fullContent,
        });
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    } finally {
      setLoading(false);
      fetchHistory();
    }
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
      await firestoreDeleteDoc(doc(db, "documents", id));
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

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" onAuth={handleAuth} theme={theme} setTheme={setTheme} />} />
        <Route path="/register" element={<AuthPage mode="register" onAuth={handleAuth} theme={theme} setTheme={setTheme} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
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
                className="font-bold text-lg hover:opacity-80 transition"
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
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-200 dark:hover:bg-white/5 transition ${currentDocId === doc.id ? `border-blue-500 ring-1 ring-blue-500 ${isDark ? "bg-blue-900/20" : "bg-blue-50"}` : `border-transparent`}`}
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
            <div className={`p-4 border-t ${border} ${bgCard} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {userData.username?.[0]?.toUpperCase()}
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
              </div>
              <button
                onClick={logout}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
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
            {["home", "about", "contact"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-sm font-bold ${view === v ? "text-blue-600" : textSub}`}
              >
                {v === "home"
                  ? "Workspace"
                  : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            <div className="w-px h-4 bg-gray-400"></div>
            <button onClick={() => setTheme(isDark ? "light" : "dark")}>
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
                          h3: ({ node, ...props }) => (
                            <h3
                              className="text-xl font-bold mt-6 mb-3"
                              {...props}
                            />
                          ),
                          h4: ({ node, ...props }) => (
                            <h4
                              className="text-lg font-bold mt-4 mb-2"
                              {...props}
                            />
                          ),
                          h5: ({ node, ...props }) => (
                            <h5
                              className="text-base font-bold mt-3 mb-1 uppercase tracking-wide"
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
                      {isInputMinimized ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
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
                  <a
                    href="https://github.com/SanjayMarathi/DocGen"
                    className="font-bold text-lg hover:underline"
                  >
                    github.com/docgen
                  </a>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
    } />
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
  );
}

const AuthPage = ({ mode, onAuth, theme, setTheme }) => {
  const isLogin = mode === "login";
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const isDark = theme === "dark";

  const features = [
    { icon: <FileText size={20} />, title: "Smart Analysis", desc: "AI breaks down your code into clear explanations" },
    { icon: <ShieldCheck size={20} />, title: "Secure Storage", desc: "Documents saved safely to your personal account" },
    { icon: <Download size={20} />, title: "Export Anywhere", desc: "One-click PDF and DOCX generation" },
    { icon: <Globe size={20} />, title: "Always Accessible", desc: "Access your docs from any device, anytime" },
  ];

  return (
    <div className={`min-h-screen flex ${isDark ? "bg-[#09090b] text-white" : "bg-[#f8fafc] text-slate-900"}`}>
      
      {/* ── Left Panel: Brand + Features ── */}
      <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 lg:p-16 border-r ${isDark ? "bg-[#0f0f11] border-zinc-800" : "bg-white border-slate-200"}`}>
        
        {/* Top: Logo */}
        <div className="relative z-10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-600"}`}>
              <FileText size={24} strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold tracking-tight">DocGen</span>
          </div>
        </div>

        {/* Center: Headline and Details */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-xl py-12">
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight mb-6">
            Turn your code into
            <span className="block text-indigo-500">documentation.</span>
          </h1>
          <p className={`text-lg leading-relaxed mb-10 ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
            DocGen is an advanced AI-powered platform that transforms complex source code into beautifully structured, professional technical documents — instantly and effortlessly.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i} className={`flex items-start gap-4 p-5 rounded-2xl border transition-colors ${isDark ? "bg-[#18181b] border-zinc-800 hover:border-indigo-500/50" : "bg-slate-50 border-slate-200 hover:border-indigo-300"}`}>
                <div className={`mt-0.5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>{f.icon}</div>
                <div>
                  <div className="text-sm font-bold mb-1">{f.title}</div>
                  <div className={`text-sm leading-relaxed ${isDark ? "text-zinc-500" : "text-slate-500"}`}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Footer */}
        <div className="relative z-10">
          <p className={`text-sm font-medium ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
            &copy; {new Date().getFullYear()} DocGen &middot; docgenindia@gmail.com
          </p>
        </div>
      </div>

      {/* ── Right Panel: Auth Form ── */}
      <div className={`w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-16 relative ${isDark ? "bg-[#09090b]" : "bg-[#f8fafc]"}`}>
        
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={`absolute top-6 right-6 p-3 rounded-full transition-colors ${isDark ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300" : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm"}`}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Mobile logo (shown only on small screens) */}
        <div className="lg:hidden mb-10 text-center flex flex-col items-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-600"}`}>
            <FileText size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">DocGen</h1>
          <p className={`text-sm mt-2 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>AI-powered documentation</p>
        </div>

        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className={`text-base ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
              {isLogin ? "Enter your credentials to access your workspace." : "Get started with DocGen in seconds."}
            </p>
          </div>

          {/* Error / Success messages */}
          {errorMsg && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
              <X size={18} className="flex-shrink-0" /> {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
              <ShieldCheck size={18} className="flex-shrink-0" /> {successMsg}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErrorMsg(""); setSuccessMsg(""); setLoading(true);
              const res = await onAuth(isLogin ? "login" : "register", { username: user, password: pass });
              setLoading(false);
              if (res && !res.success) {
                setErrorMsg(res.error);
              } else if (res && res.message) {
                setSuccessMsg(res.message);
                if (!isLogin) { setUser(""); setPass(""); }
              }
            }}
            className="space-y-5"
          >
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? "text-zinc-400" : "text-slate-700"}`}>Username</label>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Enter your username"
                className={`w-full px-5 py-3.5 rounded-xl border outline-none text-base transition-colors ${isDark ? "bg-[#18181b] border-zinc-800 text-white placeholder-zinc-500 focus:border-indigo-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"}`}
                required
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? "text-zinc-400" : "text-slate-700"}`}>Password</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Enter your password"
                className={`w-full px-5 py-3.5 rounded-xl border outline-none text-base transition-colors ${isDark ? "bg-[#18181b] border-zinc-800 text-white placeholder-zinc-500 focus:border-indigo-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"}`}
                required
              />
            </div>
            
            <button
              disabled={loading}
              className={`w-full py-4 mt-2 rounded-xl font-bold text-base text-white transition-all shadow-sm ${loading ? "opacity-70 cursor-not-allowed" : "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"} ${isDark ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-600 hover:bg-indigo-700"}`}
            >
              {loading ? <Loader2 size={22} className="animate-spin mx-auto" /> : (isLogin ? "Sign In" : "Create Account")}
            </button>
          </form>

          {/* Demo Button */}
          {isLogin && (
            <button
              type="button"
              onClick={() => {
                setUser("demo");
                setPass("demouser");
                onAuth("login", { username: "demo", password: "demouser" });
              }}
              className={`w-full py-4 mt-4 rounded-xl font-bold text-base transition-all border ${isDark ? "bg-[#18181b] border-zinc-800 hover:bg-zinc-800 text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"}`}
            >
              Try Demo Account
            </button>
          )}

          {/* Switch mode */}
          <div className="mt-8 pt-6 border-t text-center border-dashed border-zinc-500/30">
            <p className={`text-base ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => { setErrorMsg(""); setSuccessMsg(""); navigate(isLogin ? "/register" : "/login"); }}
                className={`ml-2 font-bold transition-colors ${isDark ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"}`}
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>

        </div>

        {/* Mobile footer */}
        <div className="lg:hidden mt-12 text-center">
          <p className={`text-sm font-medium ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
            &copy; {new Date().getFullYear()} DocGen &middot; docgenindia@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
};
