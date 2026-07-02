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
      fetchHistory();
    }
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [token]);

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

          {view === "profile" && (
            <div className="p-10 max-w-2xl mx-auto">
              <div
                className={`p-10 border ${border} rounded-[2rem] ${bgCard} text-center shadow-2xl`}
              >
                <div className="w-24 h-24 rounded-full bg-blue-600 mx-auto flex items-center justify-center text-white text-4xl font-bold mb-6">
                  {userData.username[0]}
                </div>
                <h1 className="text-3xl font-bold mb-2">{userData.username}</h1>
                <p className="text-zinc-500 font-medium mb-4 uppercase tracking-widest text-xs">
                  Active Session
                </p>
                <div className="mb-10 text-sm opacity-80">
                  <p>You are securely logged into DocGen.</p>
                  <p>Click below to safely terminate your session and return to the login screen.</p>
                </div>
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

  const [typedCode, setTypedCode] = useState("");
  const codeToType = `// Welcome to DocGen AI
// Automating your documentation workflow

async function generateDocs(sourceCode) {
  const prompt = \`Analyze this code and generate documentation:
  \${sourceCode}\`;
  
  const response = await ai.model('qwen2.5-coder').generate(prompt);
  
  return Document.save(response.markdown);
}

// Ready. Awaiting authentication...`;

  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < codeToType.length) {
        setTypedCode(codeToType.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, 25);
    return () => clearInterval(typingInterval);
  }, [codeToType]);

  return (
    <div 
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 relative transition-colors duration-300 ${isDark ? "bg-[#09090b] text-white" : "bg-[#f8fafc] text-slate-900"}`}
      style={{
        backgroundImage: isDark 
          ? 'radial-gradient(circle at 1px 1px, #27272a 1px, transparent 0)' 
          : 'radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* Main Terminal Window */}
      <div className={`w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border transition-all duration-300 ${isDark ? "bg-[#18181b] border-[#27272a] shadow-black/50" : "bg-white border-slate-200 shadow-slate-200/80"}`}>
        
        {/* Top Window Bar */}
        <div className={`h-12 flex items-center justify-between px-4 border-b ${isDark ? "bg-[#0f0f11] border-[#27272a]" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-inner"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-inner"></div>
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-inner"></div>
          </div>
          <div className={`text-xs font-mono font-medium tracking-wider ${isDark ? "text-zinc-500" : "text-slate-400"}`}>
            docgen-auth-terminal ~ {isLogin ? "login" : "register"}
          </div>
          <div>
             <div className="w-10"></div> 
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-col md:flex-row flex-1 min-h-[500px]">
          
          {/* Left: Code Terminal Area */}
          <div className={`hidden md:block flex-1 p-8 font-mono text-sm leading-relaxed relative overflow-hidden ${isDark ? "bg-[#18181b] text-zinc-300" : "bg-[#f1f5f9] text-slate-700"}`}>
            {/* Absolute Logo/Brand */}
            <div className={`absolute top-8 right-8 flex items-center gap-2 opacity-30`}>
              <FileText size={20} />
              <span className="font-bold font-sans tracking-tight">DocGen</span>
            </div>
            
            <pre className="whitespace-pre-wrap">
              <code className={isDark ? "text-emerald-400" : "text-blue-600"}>
                {typedCode}
              </code>
              <span className={`animate-pulse inline-block w-2 h-4 ml-1 align-middle ${isDark ? "bg-emerald-400" : "bg-blue-600"}`}></span>
            </pre>
          </div>

          {/* Right: Auth Form */}
          <div className={`w-full md:w-[420px] p-8 md:p-10 flex flex-col justify-center border-t md:border-t-0 md:border-l relative ${isDark ? "bg-[#0f0f11] border-[#27272a]" : "bg-white border-slate-200"}`}>
            
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`absolute top-6 right-6 p-2 rounded-lg transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 text-zinc-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500"}`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">
                {isLogin ? "Welcome back" : "Initialize Account"}
              </h2>
              <p className={`text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                {isLogin ? "Authenticate to access your workspace." : "Create a new workspace instance."}
              </p>
            </div>

            {errorMsg && (
              <div className={`mb-6 p-3 rounded-lg text-sm font-medium flex items-center gap-2 border ${isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}>
                <X size={16} className="flex-shrink-0" /> {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className={`mb-6 p-3 rounded-lg text-sm font-medium flex items-center gap-2 border ${isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}>
                <ShieldCheck size={16} className="flex-shrink-0" /> {successMsg}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setErrorMsg(""); setSuccessMsg(""); setLoading(true);
                const res = await onAuth(isLogin ? "login" : "register", { username: user, password: pass });
                setLoading(false);
                if (res && !res.success) setErrorMsg(res.error);
                else if (res && res.message) {
                  setSuccessMsg(res.message);
                  if (!isLogin) { setUser(""); setPass(""); }
                }
              }}
              className="space-y-5"
            >
              <div>
                <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-slate-500"}`}>Username</label>
                <input
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="admin"
                  className={`w-full px-4 py-3 rounded-lg border outline-none font-mono text-sm transition-all focus:ring-2 ${isDark ? "bg-[#18181b] border-[#27272a] text-white focus:border-emerald-500 focus:ring-emerald-500/20" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20"}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${isDark ? "text-zinc-500" : "text-slate-500"}`}>Password</label>
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 rounded-lg border outline-none font-mono text-sm transition-all focus:ring-2 ${isDark ? "bg-[#18181b] border-[#27272a] text-white focus:border-emerald-500 focus:ring-emerald-500/20" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20"}`}
                  required
                />
              </div>
              
              <button
                disabled={loading}
                className={`w-full py-3.5 rounded-lg font-semibold text-sm text-white transition-all shadow-sm ${loading ? "opacity-70 cursor-not-allowed" : "hover:-translate-y-0.5 hover:shadow-md"} ${isDark ? "bg-emerald-600 hover:bg-emerald-500" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : (isLogin ? "Execute Login" : "Initialize Account")}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t text-center border-dashed border-zinc-500/30">
              <p className={`text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                {isLogin ? "New to DocGen?" : "Already initialized?"}
                <button
                  onClick={() => { setErrorMsg(""); setSuccessMsg(""); navigate(isLogin ? "/register" : "/login"); }}
                  className={`ml-2 font-semibold ${isDark ? "text-emerald-400 hover:text-emerald-300" : "text-blue-600 hover:text-blue-700"}`}
                >
                  {isLogin ? "Create one" : "Login"}
                </button>
              </p>
            </div>
            
          </div>
        </div>
      </div>
      
      {/* Footer text */}
      <div className={`mt-8 flex gap-4 text-xs font-mono opacity-60 ${isDark ? "text-zinc-400" : "text-slate-500"}`}>
        <span>&copy; {new Date().getFullYear()} DOCGEN_SYS</span>
        <span>&middot;</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> STATUS: ONLINE</span>
      </div>
    </div>
  );
};
