import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  FileText, Download, Wand2, ChevronDown, ChevronUp,
  Copy, Upload, Wifi, WifiOff, Trash2, LogOut, Menu, X, StopCircle, 
  Sun, Moon, PlusCircle, Loader2, Settings, User, Layout, Code2, 
  Paperclip, Info, Mail
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
    { id: "phi3:mini", label: "Fast" },
    { id: "qwen2.5-coder:3b", label: "Balanced" },
    { id: "qwen2.5-coder:7b", label: "Thinking" }
];

// --- APP COMPONENT ---
export default function App() {
  // Global
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [view, setView] = useState("home"); 

  // Workspace
  const [code, setCode] = useState("");
  const [docs, setDocs] = useState("");
  const [history, setHistory] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(null);
  
  // --- UPDATED DEFAULT TO BALANCED ---
  const [model, setModel] = useState("qwen2.5-coder:3b");
  
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState("checking");
  const [abortController, setAbortController] = useState(null);
  
  // UI Layout
  const [showHistory, setShowHistory] = useState(true);
  const [isInputMinimized, setIsInputMinimized] = useState(false);
  const outputRef = useRef(null);

  // User Data
  const [userData, setUserData] = useState({ username: "Guest" });

  // --- INIT ---
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    checkConnection();
    if (token) { fetchUser(); fetchHistory(); }
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, [token]);

  // --- ACTIONS ---
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
  };

  // --- GENERATION LOGIC WITH SCROLL FIX ---
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
        
        let chunk = decoder.decode(value, {stream: true});
        
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
        
        // --- SCROLL FIX START ---
        const container = outputRef.current;
        let shouldAutoScroll = false;
        
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < 150) {
                shouldAutoScroll = true;
            }
        }

        setDocs(prev => prev + chunk);

        if (shouldAutoScroll && container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 0);
        }
        // --- SCROLL FIX END ---
      }
    } catch (e) { 
        if (e.name !== 'AbortError') console.error(e);
    }
    setLoading(false);
    fetchHistory();
  };

  const stopGeneration = () => {
    if(abortController) abortController.abort();
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
        if(currentDocId === id) {
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

  // --- API ---
  const fetchUser = async () => { try { const res = await API.get("user/"); setUserData(res.data); } catch {} };
  const fetchHistory = async () => { try { const res = await API.get("history/"); setHistory(res.data); } catch {} };
  const checkConnection = async () => { try { await fetch(`${API_BASE}status/`); setConnection("online"); } catch { setConnection("offline"); } };
  const downloadFile = async (type) => {
    if(!docs) return;
    try {
      const res = await API.post(type === 'pdf' ? "pdf/" : "docx/", { docs }, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Documentation.${type}`;
      link.click();
    } catch { alert("Download failed."); }
  };

  // --- COLORS ---
  const isDark = theme === "dark";
  const bgMain = isDark ? "bg-[#18181b]" : "bg-[#e5e7eb]"; 
  const bgCard = isDark ? "bg-[#27272a]" : "bg-white";
  const bgSidebar = isDark ? "bg-[#1f1f22]" : "bg-[#f3f4f6]";
  const textMain = isDark ? "text-gray-100" : "text-black";
  const textSub = isDark ? "text-gray-400" : "text-gray-600";
  const border = isDark ? "border-[#3f3f46]" : "border-gray-300";
  
  // Adjusted Blue (Lower grade/Less neon)
  const primaryBtn = "bg-slate-700 hover:bg-slate-600 text-white shadow-none";

  // --- RENDER ---
  if (!token) return <AuthPage onAuth={handleAuth} theme={theme} setTheme={setTheme} />;

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans ${bgMain} ${textMain}`}>
      
      {/* SIDEBAR */}
      <AnimatePresence>
        {showHistory && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 350, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={`flex-shrink-0 flex flex-col border-r ${border} ${bgSidebar} ${loading ? 'pointer-events-none opacity-60 grayscale' : ''}`}
          >
            {/* Header with Clickable Logo */}
            <div className={`p-4 border-b ${border} flex justify-between items-center`}>
                <button onClick={() => setView('home')} className="font-bold text-lg flex items-center gap-2 hover:opacity-80 transition">
                    <Code2 size={20} className="text-blue-600"/> DocGen
                </button>
                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded">
                    <X size={20}/>
                </button>
            </div>

            {/* New Project */}
            <div className="p-4">
                <button 
                    onClick={() => { setDocs(""); setCurrentDocId(null); setView("home"); }}
                    className={`w-full py-3 ${primaryBtn} font-bold rounded-lg flex items-center justify-center gap-2`}
                >
                    <PlusCircle size={18}/> New Document
                </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
                {history.map(doc => (
                    <div 
                        key={doc.id} 
                        onClick={() => loadDoc(doc)}
                        className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-200 dark:hover:bg-white/5 transition
                            ${currentDocId === doc.id ? `border-blue-500 ring-1 ring-blue-500 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}` : `border-transparent`}
                        `}
                    >
                        <div className="font-semibold text-sm truncate">{doc.topic || "Untitled Doc"}</div>
                        <div className={`flex justify-between items-center text-xs mt-1 ${textSub}`}>
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            <button onClick={(e) => deleteDoc(doc.id, e)} className="hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* User Profile */}
            <div className={`p-4 border-t ${border} ${bgCard}`}>
                <div onClick={() => setView("profile")} className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold">{userData.username[0]}</div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{userData.username}</div>
                        <div className={`text-[10px] font-bold ${connection === 'online' ? 'text-green-600' : 'text-red-600'}`}>{connection.toUpperCase()}</div>
                    </div>
                    <Settings size={16}/>
                </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MAIN LAYOUT: Vertical Flex Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* 1. NAVBAR (Fixed Height, Flex None) */}
        <header className={`flex-none h-14 border-b ${border} ${bgCard} flex items-center justify-between px-4 z-20`}>
             <div className="flex items-center gap-3">
                 {!showHistory && (
                     <button onClick={() => setShowHistory(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded">
                        <Menu size={20}/>
                     </button>
                 )}
                 <h2 className="font-bold text-lg capitalize">{view}</h2>
             </div>
             
             <div className="flex gap-4 items-center">
                 <button onClick={() => setView("home")} className={`text-sm font-bold ${view === 'home' ? 'text-blue-600' : textSub}`}>Workspace</button>
                 <button onClick={() => setView("about")} className={`text-sm font-bold ${view === 'about' ? 'text-blue-600' : textSub}`}>About</button>
                 <button onClick={() => setView("contact")} className={`text-sm font-bold ${view === 'contact' ? 'text-blue-600' : textSub}`}>Contact</button>
                 <div className="w-px h-4 bg-gray-400"></div>
                 <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="hover:text-blue-600">
                     {isDark ? <Sun size={20}/> : <Moon size={20}/>}
                 </button>
             </div>
        </header>

        {/* 2. SCROLLABLE CONTENT AREA (Flex 1) */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {view === 'home' && (
                <>
                    {/* Documentation Output */}
                    <div ref={outputRef} className="flex-1 overflow-y-auto p-8 pb-10 scroll-smooth">
                        {!docs && !loading ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
                                <Layout size={64} className="mb-6"/>
                                <h2 className="text-3xl font-bold mb-3">Generate Professional Documentation</h2>
                                <p className="max-w-md text-lg leading-relaxed">
                                    Select your required model, specify requirement or paste your source code below, and let DocGen craft comprehensive documentation for you.
                                </p>
                            </div>
                        ) : (
                            <div className={`max-w-4xl mx-auto ${bgCard} rounded-xl border ${border} shadow-sm p-10 min-h-[500px]`}>
                                <div className={`flex justify-end gap-3 pb-4 border-b ${border} mb-6`}>
                                    <button onClick={() => navigator.clipboard.writeText(docs)} className="flex items-center gap-1 text-xs font-bold hover:text-blue-500"><Copy size={14}/> COPY</button>
                                    <button onClick={() => downloadFile('docx')} className="flex items-center gap-1 text-xs font-bold hover:text-blue-500"><FileText size={14}/> DOCX</button>
                                    <button onClick={() => downloadFile('pdf')} className="flex items-center gap-1 text-xs font-bold hover:text-blue-500"><Download size={14}/> PDF</button>
                                </div>
                                
                                <div className={`prose max-w-none ${isDark ? 'prose-invert' : 'prose-neutral'}`}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props}/>,
                                            ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props}/>,
                                            li: ({node, ...props}) => <li className="pl-1" {...props}/>,
                                            h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700" {...props}/>,
                                            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-8 mb-4" {...props}/>,
                                            p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props}/>,
                                            code({node, inline, className, children, ...props}) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                return !inline && match ? (
                                                    <div className="not-prose my-6 rounded-md overflow-hidden border border-gray-300 dark:border-gray-700">
                                                        <SyntaxHighlighter
                                                            style={isDark ? vscDarkPlus : coy}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            customStyle={{ margin: 0 }}
                                                            {...props}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    </div>
                                                ) : (
                                                    <code className={`px-1 py-0.5 rounded font-mono text-sm ${isDark ? 'bg-white/10' : 'bg-gray-100'}`} {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            }
                                        }}
                                    >
                                        {docs}
                                    </ReactMarkdown>
                                    {loading && <Loader2 className="animate-spin mt-4 text-blue-500" size={24}/>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Controls */}
                    <div className={`flex-shrink-0 p-4 border-t ${border} ${bgCard} z-20`}>
                        <div className="max-w-4xl mx-auto flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <label className="text-xs font-bold uppercase">Model:</label>
                                    <select 
                                        value={model} 
                                        onChange={(e) => setModel(e.target.value)} 
                                        className={`text-sm font-semibold border ${border} rounded p-1 outline-none cursor-pointer ${isDark ? 'bg-[#18181b] text-white' : 'bg-white text-black'}`}
                                    >
                                        {MODELS.map(m => (
                                            <option key={m.id} value={m.id} className={isDark ? "bg-[#18181b] text-white" : "bg-white text-black"}>
                                                {m.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button onClick={() => setIsInputMinimized(!isInputMinimized)} className="opacity-50 hover:opacity-100">
                                    {isInputMinimized ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                </button>
                            </div>

                            {!isInputMinimized && (
                                <div className={`flex gap-2 p-2 border ${border} rounded-xl ${isDark ? 'bg-[#18181b]' : 'bg-gray-50'}`}>
                                    <div className="flex flex-col justify-end gap-2">
                                         <label className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded cursor-pointer">
                                            <Paperclip size={20}/>
                                            <input type="file" className="hidden" onChange={handleFileUpload}/>
                                         </label>
                                    </div>
                                    <textarea
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className={`flex-1 bg-transparent outline-none p-2 resize-none h-32 font-mono text-sm custom-scrollbar ${isDark ? 'text-white' : 'text-black'}`}
                                        placeholder="Paste code or upload file..."
                                        disabled={loading}
                                    />
                                    <div className="flex flex-col justify-end">
                                        {loading ? (
                                            <button onClick={stopGeneration} className="p-3 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                                                <StopCircle size={24}/>
                                            </button>
                                        ) : (
                                            <button onClick={generateDocs} disabled={!code.trim()} className={`p-3 ${primaryBtn} rounded-lg disabled:opacity-50`}>
                                                <Wand2 size={24}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Static Pages */}
            {view === 'about' && (
                <div className="p-10 max-w-3xl mx-auto overflow-y-auto">
                    <h1 className="text-4xl font-bold mb-6">About DocGen</h1>
                    <p className="text-lg leading-8 opacity-80">DocGen is a professional tool designed to automate software documentation using advanced AI models.</p>
                </div>
            )}
            
            {view === 'contact' && (
                <div className="p-10 max-w-3xl mx-auto overflow-y-auto">
                    <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
                    <div className="flex items-center gap-4 text-lg"><Mail/> support@docgen.com</div>
                </div>
            )}

            {view === 'profile' && (
                 <div className="p-10 max-w-2xl mx-auto overflow-y-auto">
                     <div className={`p-8 border ${border} rounded-xl ${bgCard}`}>
                         <h1 className="text-3xl font-bold mb-2">{userData.username}</h1>
                         <p className="opacity-60 mb-6">Member since 2024</p>
                         <button onClick={logout} className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 flex gap-2 items-center"><LogOut size={18}/> Logout</button>
                     </div>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
}

// --- REDESIGNED AUTH PAGE (Professional / No "Vibe Code") ---
const AuthPage = ({ onAuth, theme, setTheme }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onAuth(isLogin ? "login" : "register", { username: user, password: pass });
    };

    const isDark = theme === 'dark';
    const bg = isDark ? "bg-[#18181b]" : "bg-[#f9fafb]"; // Dark Zinc vs Very Light Gray
    const card = isDark ? "bg-[#27272a] border-[#3f3f46]" : "bg-white border-gray-200";
    const text = isDark ? "text-white" : "text-gray-900";
    const inputBg = isDark ? "bg-[#18181b] border-[#3f3f46]" : "bg-white border-gray-300";

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${bg} ${text}`}>
            {/* CLEAN CENTERED CARD */}
            <div className={`w-full max-w-md p-8 rounded-xl shadow-sm border ${card}`}>
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 rounded-xl bg-blue-100 text-blue-600 mb-4">
                        <Code2 size={28}/>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">DocGen</h1>
                    <p className="text-sm opacity-60 mt-2">
                        {isLogin ? "Sign in to access your workspace" : "Create an account to get started"}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase opacity-70 ml-1">Username</label>
                        <input 
                            value={user} 
                            onChange={e=>setUser(e.target.value)} 
                            className={`w-full p-3 rounded-lg outline-none border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${inputBg}`} 
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase opacity-70 ml-1">Password</label>
                        <input 
                            type="password" 
                            value={pass} 
                            onChange={e=>setPass(e.target.value)} 
                            className={`w-full p-3 rounded-lg outline-none border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${inputBg}`} 
                            required
                        />
                    </div>

                    <button className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors mt-6">
                        {isLogin ? "Sign In" : "Create Account"}
                    </button>
                </form>

                {/* Footer Actions */}
                <div className="mt-6 flex flex-col items-center gap-4">
                    <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600 hover:underline font-medium">
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                    
                    <button 
                        onClick={() => setTheme(isDark ? 'light' : 'dark')} 
                        className="flex items-center gap-2 text-xs font-bold opacity-40 hover:opacity-100 transition-opacity uppercase"
                    >
                        {isDark ? <Sun size={14}/> : <Moon size={14}/>} 
                        {isDark ? "" : ""}
                    </button>
                </div>
            </div>
        </div>
    );
};