import { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, coy } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  FileText, Download, Wand2, ChevronDown, ChevronUp, Copy, Trash2,
  LogOut, Menu, X, StopCircle, Sun, Moon, PlusCircle, Loader2, Settings,
  Layout, Paperclip, Mail, Github, Code2, Database, Zap, Sparkles, ShieldCheck, Globe
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

const MODELS = [{ id: "qwen2.5-coder:3b", label: "Fast" }];

export default function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
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
        const res = await fetch(`${API_BASE}status/?t=${Date.now()}`, { cache: "no-store" });
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
  }, [userData]);

  const fetchUser = async () => {
    try {
      const res = await API.get("user/");
      setUserData(res.data);
    } catch {}
  };

  const fetchHistory = async () => {
    if (!userData.username) return;
    try {
      const q = query(collection(db, "documents"), where("userId", "==", userData.username));
      const querySnapshot = await getDocs(q);
      const docsData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      docsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Feature: Seed demo document if history is empty and user is "demo"
      if (docsData.length === 0 && userData.username === "demo") {
        try {
          const dummyRef = await addDoc(collection(db, "documents"), {
            userId: "demo",
            topic: "Welcome to DocGen!",
            content: "### Hello and Welcome!\n\nThis is a sample document seeded automatically for the demo account.\n\nYou can upload or paste your code below and click the magical wand button to generate robust technical documentation leveraging Qwen2.5-Coder.\n\nEnjoy!",
            created_at: new Date().toISOString()
          });
          docsData.push({ id: dummyRef.id, topic: "Welcome to DocGen!", content: "### Hello and Welcome!\n\nThis is a sample document seeded automatically for the demo account.\n\nYou can upload or paste your code below and click the magical wand button to generate robust technical documentation leveraging Qwen2.5-Coder.\n\nEnjoy!", created_at: new Date().toISOString() });
        } catch (seedErr) {
          console.error("Failed to seed demo document", seedErr);
        }
      }
      
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
    setUserData({username: ""});
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

  const loadDoc = (d) => {
    if (loading) return;
    setCurrentDocId(d.id);
    setDocs(d.content);
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
  const bgMain = isDark ? "bg-[#09090b]" : "bg-[#f8fafc]";
  const bgCard = isDark ? "bg-[#18181b]" : "bg-white";
  const bgSidebar = isDark ? "bg-[#18181b]" : "bg-[#f1f5f9]";
  const textMain = isDark ? "text-gray-100" : "text-slate-900";
  const textSub = isDark ? "text-gray-400" : "text-slate-500";
  const border = isDark ? "border-[#27272a]" : "border-slate-200";
  const primaryBtn = "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg transition-all";

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
        <div className={`flex h-screen w-full overflow-hidden font-sans ${bgMain} ${textMain} transition-colors duration-300`}>
          <AnimatePresence>
        {showHistory && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={`flex-shrink-0 flex flex-col border-r ${border} ${bgSidebar} ${loading ? "pointer-events-none opacity-60 grayscale" : ""} shadow-xl z-30`}
          >
            <div className={`p-5 border-b ${border} flex justify-between items-center bg-gradient-to-r from-transparent to-black/5 dark:to-white/5`}>
              <button onClick={() => setView("home")} className="font-extrabold text-xl flex items-center gap-2 hover:text-blue-500 transition-colors">
                <Sparkles className="text-blue-500" size={20} /> DocGen
              </button>
              <button onClick={() => setShowHistory(false)} className={`p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors ${textSub}`}>
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <button onClick={() => { setDocs(""); setCurrentDocId(null); setView("home"); }} className={`w-full py-3 ${primaryBtn} font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02]`}>
                <PlusCircle size={18} /> New Document
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ml-1 ${textSub}`}>Your History</h3>
              {history.map((doc) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={doc.id}
                  onClick={() => loadDoc(doc)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${currentDocId === doc.id ? `border-blue-500 shadow-md ${isDark ? "bg-blue-900/20" : "bg-blue-50"}` : `border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-black/5 dark:hover:bg-white/5`}`}
                >
                  <div className="font-semibold text-sm truncate pr-2">
                    {doc.topic || "Untitled Doc"}
                  </div>
                  <div className={`flex justify-between items-center text-xs mt-2 ${textSub}`}>
                    <span className="opacity-80">{new Date(doc.created_at).toLocaleDateString()}</span>
                    <button onClick={(e) => deleteDoc(doc.id, e)} className="hover:text-red-500 p-1 hover:bg-red-500/10 rounded-md transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
              {history.length === 0 && (
                <div className={`text-center mt-10 text-sm ${textSub} opacity-60`}>No documents yet</div>
              )}
            </div>
            <div className={`p-4 border-t ${border} ${bgCard}`}>
              <div onClick={() => setView("profile")} className="flex items-center gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-xl transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-inner">
                  {userData.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">@{userData.username}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${connection === "online" ? "text-emerald-500" : "text-rose-500"}`}>
                    <div className={`w-2 h-2 rounded-full ${connection === "online" ? "bg-emerald-500" : "bg-rose-500"}`}></div>
                    {connection}
                  </div>
                </div>
                <Settings size={18} className={textSub} />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className={`flex-none h-16 border-b ${border} ${bgCard} flex items-center justify-between px-6 z-20 shadow-sm`}>
          <div className="flex items-center gap-4">
            {!showHistory && (
              <button onClick={() => setShowHistory(true)} className={`p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors ${textSub}`}>
                <Menu size={20} />
              </button>
            )}
            <h2 className="font-extrabold text-lg tracking-tight capitalize">{view === "home" ? "Workspace" : view}</h2>
          </div>
          <div className="flex gap-6 items-center">
            {["home", "about", "contact"].map((v) => (
              <button key={v} onClick={() => setView(v)} className={`text-sm font-semibold transition-colors ${view === v ? "text-blue-500" : `${textSub} hover:text-black dark:hover:text-white`}`}>
                {v === "home" ? "Workspace" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            <div className={`w-px h-5 ${border} border-r`}></div>
            <button onClick={() => setTheme(isDark ? "light" : "dark")} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${textSub} hover:text-black dark:hover:text-white`}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {view === "home" && (
            <>
              <div ref={outputRef} className="flex-1 overflow-y-auto p-4 md:p-10 pb-10 scroll-smooth custom-scrollbar">
                {!docs && !loading ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                    <div className="w-24 h-24 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mb-8 border border-blue-500/20">
                      <Code2 size={48} className="text-blue-500" />
                    </div>
                    <h2 className="text-4xl font-extrabold mb-4 tracking-tight">AI Documentation</h2>
                    <p className={`text-lg leading-relaxed ${textSub}`}>
                      Paste your code or upload a file below. Our AI will automatically generate comprehensive, structured documentation for you.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`max-w-4xl mx-auto ${bgCard} rounded-2xl border ${border} shadow-xl p-8 md:p-12 min-h-[500px]`}>
                    <div className={`flex flex-wrap justify-end gap-3 pb-6 border-b ${border} mb-8`}>
                      <button onClick={() => navigator.clipboard.writeText(docs)} className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"}`}>
                        <Copy size={14} /> COPY
                      </button>
                      <button onClick={() => downloadFile("docx")} className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-colors text-blue-600 ${isDark ? "bg-blue-500/10 hover:bg-blue-500/20" : "bg-blue-50 hover:bg-blue-100"}`}>
                        <FileText size={14} /> DOCX
                      </button>
                      <button onClick={() => downloadFile("pdf")} className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-colors text-rose-600 ${isDark ? "bg-rose-500/10 hover:bg-rose-500/20" : "bg-rose-50 hover:bg-rose-100"}`}>
                        <Download size={14} /> PDF
                      </button>
                    </div>
                    <div className={`prose prose-lg max-w-none ${isDark ? "prose-invert" : "prose-slate"}`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => <h1 className="text-4xl font-extrabold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-10 mb-4 pb-2 border-b border-opacity-20 border-current" {...props} />,
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                              <div className="not-prose my-8 rounded-xl overflow-hidden shadow-2xl border border-gray-700/50">
                                <div className="bg-[#1e1e1e] px-4 py-2 text-xs font-mono text-gray-400 border-b border-gray-700/50 flex justify-between items-center">
                                  <span>{match[1]}</span>
                                  <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                                  </div>
                                </div>
                                <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0, background: '#1e1e1e', padding: '1.5rem' }} {...props}>
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code className={`px-1.5 py-0.5 rounded-md font-mono text-sm ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-50 text-blue-600"}`} {...props}>{children}</code>
                            );
                          },
                        }}
                      >
                        {docs}
                      </ReactMarkdown>
                      {loading && (
                        <div className="flex justify-center mt-12 mb-4">
                          <Loader2 className="animate-spin text-blue-500" size={32} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`flex-shrink-0 p-4 border-t ${border} ${bgCard} z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)]`}>
                <div className="max-w-4xl mx-auto flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-3">
                      <label className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>AI Model</label>
                      <select value={model} onChange={(e) => setModel(e.target.value)} className={`text-sm font-bold border ${border} rounded-lg px-3 py-1.5 outline-none cursor-pointer transition-colors ${isDark ? "bg-[#27272a] hover:bg-[#3f3f46]" : "bg-gray-50 hover:bg-gray-100"}`}>
                        {MODELS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
                      </select>
                    </div>
                    <button onClick={() => setIsInputMinimized(!isInputMinimized)} className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${textSub}`}>
                      {isInputMinimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {!isInputMinimized && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className={`flex gap-3 p-2 border ${border} rounded-2xl ${isDark ? "bg-[#09090b]" : "bg-gray-50"} shadow-inner`}>
                          <label className={`p-3 rounded-xl cursor-pointer flex flex-col justify-end transition-colors ${isDark ? "hover:bg-white/5 text-gray-400 hover:text-white" : "hover:bg-black/5 text-gray-500 hover:text-black"}`}>
                            <Paperclip size={22} />
                            <input type="file" className="hidden" onChange={handleFileUpload} />
                          </label>
                          <textarea value={code} onChange={(e) => setCode(e.target.value)} className={`flex-1 bg-transparent outline-none p-3 resize-none h-36 font-mono text-sm leading-relaxed custom-scrollbar ${textMain}`} placeholder="Paste your source code here..." disabled={loading} />
                          <div className="flex flex-col justify-end">
                            {loading ? (
                              <button onClick={stopGeneration} className="p-4 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-colors">
                                <StopCircle size={24} />
                              </button>
                            ) : (
                              <button onClick={generateDocs} disabled={!code.trim()} className={`p-4 ${primaryBtn} rounded-xl disabled:opacity-50 disabled:cursor-not-allowed`}>
                                <Wand2 size={24} />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </>
          )}

          {view === "about" && (
            <div className="p-10 max-w-4xl mx-auto overflow-y-auto">
              <h1 className="text-4xl font-extrabold mb-6 tracking-tight">About DocGen</h1>
              <div className="space-y-8">
                <p className={`text-xl leading-relaxed ${textSub}`}>DocGen is an AI-powered documentation engine designed to transform source code into professional-grade technical documents.</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className={`p-8 border ${border} rounded-2xl ${bgCard} shadow-sm`}>
                    <div className="p-4 bg-blue-500/10 rounded-xl w-fit mb-6 text-blue-500"><ShieldCheck size={32} /></div>
                    <h3 className="font-bold text-2xl mb-3">Privacy & Security</h3>
                    <p className={`text-base ${textSub}`}>Your code stays yours. We prioritize session security and leverage industry-standard AI processing.</p>
                  </div>
                  <div className={`p-8 border ${border} rounded-2xl ${bgCard} shadow-sm`}>
                    <div className="p-4 bg-emerald-500/10 rounded-xl w-fit mb-6 text-emerald-500"><Globe size={32} /></div>
                    <h3 className="font-bold text-2xl mb-3">Format Export</h3>
                    <p className={`text-base ${textSub}`}>Generate files compatible with GitHub, Jira, and internal wikis instantly.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === "contact" && (
            <div className="p-10 max-w-4xl mx-auto">
              <h1 className="text-4xl font-extrabold mb-10 tracking-tight">Contact Support</h1>
              <div className="grid md:grid-cols-2 gap-8">
                <div className={`p-10 border ${border} rounded-3xl ${bgCard} flex flex-col items-center text-center shadow-lg hover:-translate-y-1 transition-transform`}>
                  <div className="p-5 bg-blue-500/10 rounded-full mb-6"><Mail className="text-blue-500" size={40} /></div>
                  <h2 className="text-2xl font-bold mb-3">Email Support</h2>
                  <a href="mailto:support@docgen.com" className="text-blue-500 font-bold text-lg hover:underline">support@docgen.com</a>
                </div>
                <div className={`p-10 border ${border} rounded-3xl ${bgCard} flex flex-col items-center text-center shadow-lg hover:-translate-y-1 transition-transform`}>
                  <div className={`p-5 rounded-full mb-6 ${isDark ? "bg-white/10" : "bg-black/5"}`}><Github size={40} /></div>
                  <h2 className="text-2xl font-bold mb-3">GitHub</h2>
                  <a href="https://github.com/SanjayMarathi/DocGen" className="font-bold text-lg hover:underline">github.com/docgen</a>
                </div>
              </div>
            </div>
          )}

          {view === "profile" && (
            <div className="p-10 max-w-2xl mx-auto">
              <div className={`p-12 border ${border} rounded-[3rem] ${bgCard} text-center shadow-2xl`}>
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 mx-auto flex items-center justify-center text-white text-5xl font-bold mb-8 shadow-inner">
                  {userData.username?.[0]?.toUpperCase()}
                </div>
                <h1 className="text-4xl font-extrabold mb-3">@{userData.username}</h1>
                <p className="text-blue-500 font-bold mb-8 uppercase tracking-widest text-sm bg-blue-500/10 w-fit mx-auto px-4 py-1.5 rounded-full">Active Session</p>
                <div className={`mb-12 text-base ${textSub} max-w-sm mx-auto leading-relaxed`}>
                  <p>You are securely logged into your personal workspace.</p>
                </div>
                <button onClick={logout} className="w-full py-5 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 flex gap-3 items-center justify-center transition-all shadow-lg hover:shadow-rose-500/25">
                  <LogOut size={22} /> Terminate Session
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

  return (
    <div className={`min-h-screen flex flex-col selection:bg-blue-500 selection:text-white ${isDark ? "bg-[#09090b] text-white" : "bg-[#f8fafc] text-black"} overflow-x-hidden transition-colors duration-300`}>
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob animation-delay-4000"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Sparkles size={20} />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">DocGen</span>
        </div>
        <button onClick={() => setTheme(isDark ? "light" : "dark")} className={`p-3 rounded-full backdrop-blur-md transition-all ${isDark ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"}`}>
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto w-full px-6 py-12 gap-16">
        
        {/* Left: Hero Copy */}
        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex-1 text-center lg:text-left">
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Document code <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">at lightning speed.</span>
          </h1>
          <p className={`text-xl mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Transform your raw source code into beautiful, structured, and professional technical documentation instantly. 
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <a href="#features" className={`px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2 ${isDark ? "bg-white/5 hover:bg-white/10 border border-white/10" : "bg-black/5 hover:bg-black/10 border border-black/10"}`}>
              Explore Features <ChevronDown size={18} />
            </a>
          </div>
        </motion.div>

        {/* Right: Glassmorphism Auth Box */}
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="w-full max-w-md">
          <div className={`p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-xl border ${isDark ? "bg-white/5 border-white/10 shadow-black/50" : "bg-white/60 border-white shadow-blue-500/10"}`}>
            <h2 className="text-3xl font-extrabold mb-2">{isLogin ? "Welcome Back" : "Create Account"}</h2>
            <p className={`mb-8 font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {isLogin ? "Sign in to access your workspaces." : "Sign up to start documenting code."}
            </p>
            
            {errorMsg && <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold rounded-xl text-sm">{errorMsg}</div>}
            {successMsg && <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold rounded-xl text-sm">{successMsg}</div>}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setErrorMsg(""); setSuccessMsg(""); setLoading(true);
              const res = await onAuth(isLogin ? "login" : "register", { username: user, password: pass });
              setLoading(false);
              if (res && !res.success) setErrorMsg(res.error);
              else if (res && res.message) { setSuccessMsg(res.message); if (!isLogin) { setUser(""); setPass(""); } }
            }} className="space-y-5">
              <div>
                <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Username" required
                  className={`w-full p-4 rounded-xl outline-none font-medium transition-all ${isDark ? "bg-black/20 focus:bg-black/40 placeholder-gray-500" : "bg-white focus:shadow-md placeholder-gray-400"} border border-transparent focus:border-blue-500`} />
              </div>
              <div>
                <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" required
                  className={`w-full p-4 rounded-xl outline-none font-medium transition-all ${isDark ? "bg-black/20 focus:bg-black/40 placeholder-gray-500" : "bg-white focus:shadow-md placeholder-gray-400"} border border-transparent focus:border-blue-500`} />
              </div>
              <button disabled={loading} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 flex justify-center items-center gap-2 transition-all hover:scale-[1.02]">
                {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? "Sign In" : "Sign Up")}
              </button>
            </form>

            {isLogin && (
              <div className="mt-6">
                <div className="relative flex items-center py-5">
                  <div className="flex-grow border-t border-gray-500/30"></div>
                  <span className={`flex-shrink-0 mx-4 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-400"}`}>Or try it out</span>
                  <div className="flex-grow border-t border-gray-500/30"></div>
                </div>
                <button onClick={async () => {
                  setErrorMsg(""); setLoading(true);
                  const res = await onAuth("login", { username: "demo", password: "demouser" });
                  setLoading(false);
                  if (res && !res.success) setErrorMsg(res.error);
                }} disabled={loading} className={`w-full py-4 font-bold rounded-xl flex justify-center items-center gap-2 transition-all hover:scale-[1.02] border ${isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-white hover:bg-gray-50 border-gray-200 text-black shadow-sm"}`}>
                  Demo Login
                </button>
              </div>
            )}

            <div className="mt-8 text-center">
              <button onClick={() => { setErrorMsg(""); setSuccessMsg(""); navigate(isLogin ? "/register" : "/login"); }} className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Feature Cards Section */}
      <div id="features" className={`relative z-10 w-full border-y py-20 ${isDark ? "bg-black/20 border-white/5" : "bg-white/50 border-gray-200"}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4">Why use DocGen?</h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? "text-gray-400" : "text-gray-600"}`}>Everything you need to automate your documentation workflow in one sleek interface.</p>
          </div>
          <div className="flex justify-center">
            <motion.div whileHover={{ y: -5 }} className={`p-10 md:p-12 w-full max-w-4xl rounded-3xl border backdrop-blur-sm text-left ${isDark ? "bg-white/5 border-white/5" : "bg-white border-gray-100 shadow-xl shadow-gray-200/50"}`}>
              <h3 className="text-2xl font-bold mb-6">Project Overview</h3>
              <p className={`text-lg leading-relaxed mb-6 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                DocGen is an advanced, automated documentation engine designed to streamline the software development lifecycle. By seamlessly transforming complex, raw source code into beautifully structured, professional technical documents, it eliminates the tedious manual effort traditionally required to maintain up-to-date documentation.
              </p>
              <p className={`text-lg leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Features include intelligent code analysis that breaks down logic into understandable explanations, a secure cloud storage system that effortlessly syncs your history across all your devices, and a one-click export capability that generates pristine PDF or DOCX files ready for immediate sharing with your team or clients. With a developer-first interface featuring instant generation, dark mode, and strict privacy controls, DocGen ensures you spend less time writing manuals and more time building great software.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full py-10 text-center">
        <p className={`text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          &copy; {new Date().getFullYear()} DocGen. All rights reserved.<br/>
          Support: docgenindia@gmail.com
        </p>
      </footer>
    </div>
  );
};
