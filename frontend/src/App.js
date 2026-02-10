import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Cpu, FileText, Download, Wand2,
  Copy, Upload, Wifi, WifiOff, Trash2, LogOut, Menu, X, StopCircle,
  Sun, Moon, PlusCircle, Loader2
} from "lucide-react";

// API CONFIG
const API_BASE = "http://127.0.0.1:8000/api/";
const API = axios.create({ baseURL: API_BASE });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- MODELS ---
const MODELS = [
  { id: "phi3:mini", label: "Fast" },
  { id: "qwen2.5-coder:3b", label: "Balanced" },
  { id: "qwen2.5-coder:7b", label: "Thinking" }
];

export default function App() {
  // --- STATE ---
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState("User");

  const [code, setCode] = useState("");
  const [docs, setDocs] = useState("");
  const [history, setHistory] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [model, setModel] = useState("qwen2.5-coder:3b");

  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState("checking");
  const [abortController, setAbortController] = useState(null);

  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [isInputMinimized, setIsInputMinimized] = useState(false);

  const outputRef = useRef(null);
  const textareaRef = useRef(null);

  // --- INIT ---
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    if (token) { fetchUser(); fetchHistory(); }
    return () => clearInterval(interval);
  }, [token]);

  // --- RESIZE INPUT ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = isInputMinimized ? "40px" : "auto";
      if (!isInputMinimized) textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [code, isInputMinimized]);

  // --- AUTH ---
  const handleAuthSubmit = async (user, pass, isRegister) => {
    try {
      const endpoint = isRegister ? "register/" : "login/";
      const res = await axios.post(`${API_BASE}${endpoint}`, { username: user, password: pass });

      if (isRegister) {
        alert("Registered successfully! Please login.");
        setIsRegister(false);
      } else {
        if (res.data.access) {
          localStorage.setItem("token", res.data.access);
          setToken(res.data.access);
          checkConnection();
          setTimeout(() => { fetchUser(); fetchHistory(); }, 50);
        } else {
          alert("Login failed: No token received");
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Auth Failed");
    }
  };

  // --- CORE LOGIC ---
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
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ code, model }),
        signal: controller.signal
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
            const newId = parseInt(match[1]);
            setCurrentDocId(newId);
            chunk = chunk.replace(match[0], "");
            fetchHistory();
          }
          isFirstChunk = false;
        }

        // --- IMPROVED SCROLL HANDLING ---
        const container = outputRef.current;
        let shouldAutoScroll = false;

        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          // Only auto-scroll if user is near the bottom (within 150px)
          if (scrollHeight - scrollTop - clientHeight < 150) {
            shouldAutoScroll = true;
          }
        }

        setDocs(prev => prev + chunk);

        // Auto-scroll only if user was near bottom
        if (shouldAutoScroll && container) {
          setTimeout(() => {
            container.scrollTop = container.scrollHeight;
          }, 0);
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error("Gen Error:", e);
    }
    setLoading(false);
    fetchHistory();
  };

  const handleNewChat = () => {
    setDocs(""); setCode(""); setCurrentDocId(null); setLoading(false);
    if (abortController) abortController.abort();
    setShowHistory(false);
  };

  const stopGeneration = () => {
    if (abortController) { abortController.abort(); setLoading(false); fetchHistory(); }
  };

  const loadHistoryItem = (doc) => {
    setCurrentDocId(doc.id);
    setDocs(doc.content);
    setShowHistory(false);
  };

  // --- HELPERS ---
  const downloadFile = async (type) => {
    try {
      const res = await API.post(type === 'pdf' ? "pdf/" : "docx/", { docs }, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Documentation.${type}`;
      link.click();
    } catch { alert("Download Failed"); }
  };

  const logout = () => { localStorage.removeItem("token"); setToken(null); setHistory([]); };
  const fetchUser = async () => { try { const res = await API.get("user/"); setUsername(res.data.username); } catch { } };
  const fetchHistory = async () => { try { const res = await API.get("history/"); setHistory(res.data); } catch { } };
  const checkConnection = async () => { try { const res = await fetch(`${API_BASE}status/`); const d = await res.json(); setConnection(d.online ? "online" : "offline"); } catch { setConnection("offline"); } };
  const deleteDoc = async (id, e) => { e.stopPropagation(); if (window.confirm("Delete?")) { await API.delete(`history/${id}/delete/`); fetchHistory(); } };
  const handleFileUpload = (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setCode(ev.target.result); r.readAsText(f); } };
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const colors = {
    bg: theme === "dark" ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]",
    card: theme === "dark" ? "bg-[#1a1a1a]" : "bg-white",
    sidebar: theme === "dark" ? "bg-[#141414]" : "bg-[#fafafa]",
    text: theme === "dark" ? "text-gray-300" : "text-gray-800",
    textSecondary: theme === "dark" ? "text-gray-500" : "text-gray-500",
    border: theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200",
    input: theme === "dark" ? "bg-[#1a1a1a] text-gray-300" : "bg-white text-gray-800",
    hover: theme === "dark" ? "hover:bg-[#2a2a2a]" : "hover:bg-gray-100",
    toolbar: theme === "dark" ? "bg-[#1a1a1a]/80" : "bg-white/80"
  };

  // --- RENDER LOGIN ---
  const [isRegister, setIsRegister] = useState(false);

  if (!token) return (
    <div className="min-h-screen flex font-sans">
      {/* LEFT SIDE - LOGIN FORM */}
      <div className="w-1/2 bg-white flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="text-4xl font-bold text-blue-600">DocGen</div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">{isRegister ? "Sign up" : "Sign in"}</h1>
          <p className="text-gray-600 mb-8">{isRegister ? "Create an account to get started" : "Enter your credentials to continue"}</p>

          {/* Form */}
          <form onSubmit={(e) => {
            e.preventDefault();
            const user = e.target[0].value;
            const pass = e.target[1].value;
            handleAuthSubmit(user, pass, isRegister);
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition text-gray-900 bg-white"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition text-gray-900 bg-white"
                placeholder="Enter your password"
                required
              />
            </div>

            {!isRegister && (
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-gray-700">Remember me</span>
                </label>
              </div>
            )}

            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition mt-6">
              {isRegister ? "Sign up" : "Sign in"}
            </button>
          </form>

          {/* Toggle link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            {isRegister ? "Already have an account? " : "Don't have an account? "}
            <button onClick={() => setIsRegister(!isRegister)} className="text-blue-600 font-medium hover:underline">
              {isRegister ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>

      {/* RIGHT SIDE - INFO WITH GEOMETRIC PATTERN */}
      <div className="w-1/2 bg-blue-600 flex items-center justify-center p-12 relative overflow-hidden">
        {/* Geometric Pattern Background */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="2" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Large Circles - Decorative */}
        <div className="absolute -right-20 -top-20 w-96 h-96 border border-white opacity-10 rounded-full"></div>
        <div className="absolute -right-32 -top-32 w-[500px] h-[500px] border border-white opacity-5 rounded-full"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 border border-white opacity-10 rounded-full"></div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-bold text-white mb-4">AI Document Generator</h2>
          <p className="text-lg text-blue-100 mb-12">
            Transform your code into professional documentation automatically.
          </p>

          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-white flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-white"></div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Code Analysis</h3>
                <p className="text-blue-100">Automatically analyze and document your codebase</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-white flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-white"></div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Export Options</h3>
                <p className="text-blue-100">Download as PDF or DOCX format</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-white flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-white"></div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">History Tracking</h3>
                <p className="text-blue-100">Access all your generated documents anytime</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen ${colors.bg} ${colors.text} font-sans overflow-hidden ${theme === 'light' ? 'light-theme' : ''} relative`}>
      {/* ANIMATED BACKGROUND */}
      <div className="animated-bg"></div>

      {/* TOP HEADER */}
      <nav className={`fixed top-0 w-full z-50 ${colors.toolbar} border-b ${colors.border} h-14 flex items-center justify-between px-4 backdrop-blur-md bg-opacity-90`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHistory(!showHistory)} className={`p-2 ${colors.hover} rounded-lg transition`}><Menu size={20} /></button>
          <span className={`text-base font-bold ${colors.text}`}>DocGen</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${colors.sidebar}`}>Documentation Generator</span>
        </div>
        <div className="flex items-center gap-2">
          {connection === "online" ? <span className="text-green-500 text-xs flex gap-1 items-center"><Wifi size={14} /></span> : <span className="text-red-500 text-xs flex gap-1 items-center"><WifiOff size={14} /></span>}
          <button onClick={toggleTheme} className={`p-2 ${colors.hover} rounded-lg transition`}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button onClick={logout} className={`p-2 ${colors.hover} rounded-lg transition hover:text-red-500`}><LogOut size={18} /></button>
        </div>
      </nav>

      {/* HISTORY MODAL */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/50 z-40 top-14" />
            <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} className={`fixed left-0 top-14 bottom-0 w-80 ${colors.sidebar} border-r ${colors.border} z-50 flex flex-col`}>
              <div className={`p-4 border-b ${colors.border} flex justify-between items-center`}>
                <span className={`text-sm font-semibold ${colors.text}`}>Document History</span>
                <button onClick={() => setShowHistory(false)} className={`p-1 ${colors.hover} rounded`}><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {history.map(doc => (
                  <div key={doc.id} onClick={() => loadHistoryItem(doc)} className={`p-3 rounded-lg cursor-pointer ${colors.hover} transition border ${currentDocId === doc.id ? 'border-blue-500 bg-blue-500/5' : 'border-transparent'}`}>
                    <div className={`font-medium text-sm truncate ${colors.text}`}>{doc.topic}</div>
                    <div className={`flex justify-between items-center mt-1 text-[10px] ${colors.textSecondary}`}>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      <button onClick={(e) => deleteDoc(doc.id, e)} className="hover:text-red-500 transition"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`p-4 border-t ${colors.border}`}>
                <button onClick={handleNewChat} className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-500 transition">
                  <PlusCircle size={16} /> New Document
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 pt-14 relative z-10">
        {/* LEFT PANEL - CODE INPUT */}
        <div className={`w-[480px] ${colors.sidebar} border-r ${colors.border} flex flex-col`}>
          <div className={`p-4 border-b ${colors.border} flex items-center justify-between`}>
            <span className={`text-base font-semibold ${colors.text}`}>Code Input</span>
            <button onClick={handleNewChat} className={`p-1 ${colors.hover} rounded`}><X size={18} /></button>
          </div>

          {/* Prompts */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className={`p-4 rounded-lg ${colors.card} border ${colors.border}`}>
              <div className={`text-sm font-medium ${colors.textSecondary} mb-2`}>Paste or describe your code</div>
              <div className={`text-sm ${colors.text} leading-relaxed`}>
                Paste code snippets or upload files (.py, .js, .cpp, .java) to generate comprehensive documentation.
              </div>
            </div>

            <div className={`p-4 rounded-lg ${colors.card} border ${colors.border}`}>
              <div className={`text-sm font-medium ${colors.textSecondary} mb-2`}>How it works</div>
              <div className={`text-sm ${colors.text} leading-relaxed`}>
                AI analyzes your code structure, functions, and logic to create documentation with sections like purpose, parameters, and usage examples.
              </div>
            </div>

            {/* CODE TEXTAREA */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className={`text-sm font-medium ${colors.textSecondary} uppercase tracking-wider`}>Your Code</label>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500">Model:</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className={`text-xs font-semibold border ${colors.border} rounded px-2 py-1 outline-none cursor-pointer ${colors.input}`}
                  >
                    {MODELS.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={code}
                onChange={e => setCode(e.target.value)}
                className={`w-full ${colors.input} border ${colors.border} rounded-lg p-4 resize-none outline-none focus:border-blue-500 transition text-sm font-mono leading-relaxed`}
                style={{ minHeight: "300px" }}
                placeholder="Paste your code here..."
                disabled={loading}
              />
              <div className="flex gap-2">
                <label className={`flex-1 ${colors.card} border ${colors.border} rounded-lg p-3 text-center cursor-pointer ${colors.hover} transition`}>
                  <Upload size={18} className="inline mr-2" />
                  <span className="text-sm font-medium">Upload File</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          </div>

          {/* GENERATE BUTTON */}
          <div className={`p-4 border-t ${colors.border}`}>
            {loading ? (
              <button onClick={stopGeneration} className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition text-base font-medium flex items-center justify-center gap-2">
                <StopCircle size={20} /> Stop Generation
              </button>
            ) : (
              <button onClick={generateDocs} disabled={!code.trim()} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-500 transition text-base font-medium flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
                <Wand2 size={20} /> Generate Documentation
              </button>
            )}
          </div>
        </div>

        {/* MIDDLE - VERTICAL TOOLBAR */}
        <div className={`w-14 ${colors.toolbar} border-r ${colors.border} flex flex-col items-center py-4 gap-3 backdrop-blur-md bg-opacity-90`}>
          <button onClick={() => navigator.clipboard.writeText(docs)} disabled={!docs} className={`p-2.5 rounded-lg ${!docs ? 'opacity-30' : `${colors.hover}`} transition group relative`} title="Copy">
            <Copy size={20} className="text-gray-500" />
            <span className="absolute left-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50">Copy</span>
          </button>

          <button onClick={() => downloadFile('pdf')} disabled={!docs} className={`p-2.5 rounded-lg ${!docs ? 'opacity-30' : `${colors.hover}`} transition group relative`} title="Export PDF">
            <Download size={20} className="text-purple-500" />
            <span className="absolute left-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50">PDF</span>
          </button>

          <button onClick={() => downloadFile('docx')} disabled={!docs} className={`p-2.5 rounded-lg ${!docs ? 'opacity-30' : `${colors.hover}`} transition group relative`} title="Export Word">
            <FileText size={20} className="text-blue-500" />
            <span className="absolute left-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50">Word</span>
          </button>
        </div>

        {/* RIGHT PANEL - DOCUMENT VIEWER */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={outputRef} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {loading && !docs && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="animate-spin text-blue-500 mb-4" size={52} />
                <p className={`text-xl font-medium ${colors.text}`}>Generating documentation...</p>
              </div>
            )}

            {docs ? (
              <div className="max-w-4xl mx-auto">
                <div className={`${colors.card} rounded-2xl border ${colors.border} shadow-sm overflow-hidden`}>
                  <div className={`flex items-center justify-between px-6 py-4 border-b ${colors.border}`}>
                    <div className="flex items-center gap-2">
                      <FileText size={20} className="text-blue-500" />
                      <span className={`text-base font-semibold ${colors.text}`}>Documentation</span>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className={`prose prose-lg max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => <h1 className={`text-4xl font-bold mb-6 pb-3 border-b ${colors.border} ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`} {...props} />,
                          h2: ({ node, ...props }) => <h2 className={`text-2xl font-semibold mt-8 mb-4 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`} {...props} />,
                          h3: ({ node, ...props }) => <h3 className={`text-xl font-medium mt-6 mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} {...props} />,
                          p: ({ node, ...props }) => <p className={`mb-4 leading-8 text-[15px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} {...props} />,
                          ul: ({ node, ...props }) => <ul className={`list-disc list-outside ml-6 mb-4 space-y-2 text-[15px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} {...props} />,
                          ol: ({ node, ...props }) => <ol className={`list-decimal list-outside ml-6 mb-4 space-y-2 text-[15px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} {...props} />,
                          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                          a: ({ node, ...props }) => <a className="text-blue-500 hover:underline text-[15px]" target="_blank" rel="noopener noreferrer" {...props} />,
                          pre: ({ node, ...props }) => (
                            <div className="relative my-6 rounded-xl overflow-hidden bg-[#1e1e1e] border border-gray-800 shadow-lg">
                              <div className="flex items-center px-4 py-3 bg-[#2a2a2a] border-b border-gray-800">
                                <div className="flex gap-2">
                                  <div className="w-3 h-3 rounded-full bg-red-500" />
                                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                  <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                              </div>
                              <pre className="p-5 overflow-x-auto text-[14px] font-mono leading-relaxed text-gray-300" {...props} />
                            </div>
                          ),
                          code: ({ node, inline, className, children, ...props }) => {
                            if (inline) {
                              return <code className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} text-blue-500 px-2 py-0.5 rounded text-[14px] font-mono`} {...props}>{children}</code>;
                            }
                            return <code className="text-inherit" {...props}>{children}</code>;
                          }
                        }}
                      >
                        {docs}
                      </ReactMarkdown>

                      {loading && <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse align-middle"></span>}
                    </div>
                  </div>
                </div>
              </div>
            ) : !loading && (
              <div className="flex flex-col items-center justify-center h-full opacity-40">
                <Cpu size={80} className="mb-4 text-gray-400" />
                <h2 className={`text-3xl font-semibold mb-2 ${colors.text}`}>Ready to Generate</h2>
                <p className={`text-base ${colors.textSecondary}`}>Paste code on the left to start</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
