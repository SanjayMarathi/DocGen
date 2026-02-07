import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Cpu, FileText, Download, Wand2, ChevronDown, ChevronUp,
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

export default function App() {
  // --- STATE ---
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState("User");
  
  const [code, setCode] = useState("");
  const [docs, setDocs] = useState("");
  const [history, setHistory] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(null);
  
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
        if(!isInputMinimized) textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [code, isInputMinimized]);

  // --- AUTH ---
  const handleAuth = async (e) => {
    e.preventDefault();
    // FIX: specific detection of the button clicked
    const submitter = e.nativeEvent.submitter;
    const isRegister = submitter.innerText === "Register";
    
    const user = e.target[0].value;
    const pass = e.target[1].value;

    try {
        const endpoint = isRegister ? "register/" : "login/";
        const res = await axios.post(`${API_BASE}${endpoint}`, { username: user, password: pass });
        
        if (isRegister) {
            alert("Registered successfully! Please login.");
        } else {
            // FIX: Ensure we actually catch the token before setting state
            if (res.data.access) {
                localStorage.setItem("token", res.data.access);
                setToken(res.data.access);
                // Reset connection check immediately after login
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
        body: JSON.stringify({ code }), 
        signal: controller.signal
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let isFirstChunk = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        let chunk = decoder.decode(value, {stream: true});
        
        // Robust ID Extraction
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

        setDocs(prev => prev + chunk);
        
        if(outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
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
      if(abortController) abortController.abort();
      setShowHistory(false);
  };

  const stopGeneration = () => {
      if(abortController) { abortController.abort(); setLoading(false); fetchHistory(); }
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
  const fetchUser = async () => { try { const res = await API.get("user/"); setUsername(res.data.username); } catch {} };
  const fetchHistory = async () => { try { const res = await API.get("history/"); setHistory(res.data); } catch {} };
  const checkConnection = async () => { try { const res = await fetch(`${API_BASE}status/`); const d = await res.json(); setConnection(d.online ? "online" : "offline"); } catch { setConnection("offline"); } };
  const deleteDoc = async (id, e) => { e.stopPropagation(); if (window.confirm("Delete?")) { await API.delete(`history/${id}/delete/`); fetchHistory(); } };
  const handleFileUpload = (e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onload=ev=>setCode(ev.target.result); r.readAsText(f); } };
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const colors = {
    bg: theme === "dark" ? "bg-[#050505]" : "bg-gray-50",
    card: theme === "dark" ? "bg-[#111]" : "bg-white",
    text: theme === "dark" ? "text-slate-300" : "text-gray-700",
    border: theme === "dark" ? "border-white/10" : "border-gray-200",
    input: theme === "dark" ? "bg-transparent text-white" : "bg-gray-100 text-black"
  };

  // --- RENDER LOGIN ---
  if (!token) return (
    <div className={`min-h-screen flex items-center justify-center font-sans ${colors.bg} ${colors.text}`}>
      <div className={`w-full max-w-md ${colors.card} border ${colors.border} p-8 rounded-3xl shadow-xl`}>
        <h1 className="text-3xl font-bold text-center mb-6">DocGen AI</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input className={`w-full p-3 rounded-xl ${colors.input} border ${colors.border} outline-none`} placeholder="Username" required />
          <input type="password" className={`w-full p-3 rounded-xl ${colors.input} border ${colors.border} outline-none`} placeholder="Password" required />
          <div className="flex gap-2">
             <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500">Login</button>
             <button type="submit" className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20">Register</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen ${colors.bg} ${colors.text} font-sans overflow-hidden`}>
      {/* NAVBAR */}
      <nav className={`fixed top-0 w-full z-40 border-b ${colors.border} ${theme==='dark'?'bg-[#050505]/95':'bg-white/95'} backdrop-blur h-16 flex items-center justify-between px-6`}>
        <div className="flex items-center gap-4">
           <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:opacity-70 rounded-lg"><Menu size={20}/></button>
           <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">DocGen</span>
           {connection === "online" ? <span className="text-green-500 text-[10px] font-bold flex gap-1 items-center ml-4"><Wifi size={12}/> ONLINE</span> : <span className="text-red-500 text-[10px] font-bold flex gap-1 items-center ml-4"><WifiOff size={12}/> OFFLINE</span>}
        </div>
        <div className="flex items-center gap-4">
           <button onClick={toggleTheme} className="hover:text-blue-500">{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>
           <button onClick={logout} className="hover:text-red-500"><LogOut size={18}/></button>
        </div>
      </nav>

      {/* HISTORY */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className={`fixed left-0 top-16 bottom-0 w-72 ${colors.card} border-r ${colors.border} z-50 flex flex-col shadow-2xl`}>
            <div className={`p-4 border-b ${colors.border} flex justify-between items-center`}><span className="text-xs font-bold uppercase opacity-60">History</span><button onClick={() => setShowHistory(false)}><X size={16}/></button></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {history.map(doc => (
                <div key={doc.id} onClick={() => loadHistoryItem(doc)} className={`p-3 rounded-xl cursor-pointer hover:bg-white/5 transition border ${currentDocId === doc.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-transparent'}`}>
                  <div className="font-medium text-sm truncate opacity-90">{doc.topic}</div>
                  <div className="flex justify-between items-center mt-1 text-[10px] opacity-50"><span>{new Date(doc.created_at).toLocaleDateString()}</span><button onClick={(e) => deleteDoc(doc.id, e)} className="hover:text-red-500"><Trash2 size={12}/></button></div>
                </div>
              ))}
            </div>
            <div className={`p-4 border-t ${colors.border}`}><button onClick={handleNewChat} className="w-full flex justify-center items-center gap-2 bg-blue-600/10 text-blue-500 py-2 rounded-lg text-sm font-bold hover:bg-blue-600/20 transition"><PlusCircle size={16}/> New Chat</button></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WORKSPACE */}
      <div className="flex-1 flex flex-col pt-16 w-full relative">
        <div ref={outputRef} className="flex-1 overflow-y-auto p-8 pb-48 scroll-smooth">
           {loading && !docs && <div className="flex flex-col items-center justify-center h-full opacity-60 mt-[-50px]"><Loader2 className="animate-spin text-blue-500 mb-4" size={40}/><p className="text-lg animate-pulse font-mono">Analyzing....</p></div>}
           {docs ? (
             <div className={`max-w-4xl mx-auto ${colors.card} border ${colors.border} rounded-2xl p-10 shadow-lg relative`}>
                <div className={`flex justify-between items-center mb-8 border-b ${colors.border} pb-4`}>
                   <div className="text-blue-500 text-xs font-bold uppercase flex gap-2"><FileText size={14}/> DOCUMENTATION</div>
                   <div className="flex gap-3">
                      <button onClick={() => navigator.clipboard.writeText(docs)} className="opacity-60 hover:opacity-100 text-xs font-bold flex gap-1"><Copy size={14}/> COPY</button>
                      <button onClick={() => downloadFile('docx')} className="text-blue-500 hover:opacity-80 text-xs font-bold flex gap-1"><FileText size={14}/> WORD</button>
                      <button onClick={() => downloadFile('pdf')} className="text-purple-500 hover:opacity-80 text-xs font-bold flex gap-1"><Download size={14}/> PDF</button>
                   </div>
                </div>
                
                {/* --- STRUCTURED MARKDOWN RENDERER --- */}
                <div className={`prose max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    components={{
                      // Titles
                      h1: ({node, ...props}) => <h1 className={`text-3xl font-bold mb-6 pb-2 border-b ${colors.border} text-blue-400`} {...props}/>,
                      h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-8 mb-4 text-purple-400" {...props}/>,
                      h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-6 mb-3 text-gray-200" {...props}/>,
                      
                      // Proper Paragraphs
                      p: ({node, ...props}) => <p className="mb-4 leading-7 text-gray-300" {...props}/>,
                      
                      // Lists
                      ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-4 space-y-1 text-gray-300" {...props}/>,
                      ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-4 space-y-1 text-gray-300" {...props}/>,
                      li: ({node, ...props}) => <li className="pl-1" {...props}/>,
                      
                      // Links
                      a: ({node, ...props}) => <a className="text-blue-400 hover:underline break-all" target="_blank" rel="noopener noreferrer" {...props}/>,

                      // "Black Box" Code Blocks
                      pre: ({node, ...props}) => (
                        <div className="relative my-6 rounded-lg overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-xl">
                          <div className="flex items-center px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
                            <div className="flex gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-500/20"/>
                              <div className="w-3 h-3 rounded-full bg-yellow-500/20"/>
                              <div className="w-3 h-3 rounded-full bg-green-500/20"/>
                            </div>
                          </div>
                          <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-gray-300 custom-scrollbar" {...props}/>
                        </div>
                      ),
                      
                      code: ({node, inline, className, children, ...props}) => {
                        if (inline) {
                          return <code className="bg-white/10 text-orange-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
                        }
                        return <code className="bg-transparent text-inherit" {...props}>{children}</code>;
                      }
                  }}>{docs}</ReactMarkdown>
                  
                  {loading && <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse align-middle"></span>}
                </div>
             </div>
           ) : !loading && <div className="h-full flex flex-col items-center justify-center opacity-30 mt-[-50px]"><Cpu size={64} className="mb-4"/><h2 className="text-2xl font-bold">DocGen AI</h2><p className="text-sm">Ready to generate.</p></div>}
        </div>

        <div className={`absolute bottom-0 w-full p-4 bg-gradient-to-t ${theme==='dark'?'from-[#050505] via-[#050505]':'from-gray-50 via-gray-50'} to-transparent z-10 flex justify-center`}>
           <div className={`w-full max-w-4xl ${colors.card} border ${colors.border} rounded-3xl flex flex-col p-2 shadow-2xl transition-all`}>
              <div className="flex justify-between px-2 pb-1"><span className="text-[10px] font-bold opacity-40 uppercase tracking-widest pt-1">Context</span><button onClick={() => setIsInputMinimized(!isInputMinimized)} className="opacity-50 hover:opacity-100 p-1">{isInputMinimized ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button></div>
              <div className="flex items-end">
                  <label className="p-3 hover:opacity-70 cursor-pointer"><Upload size={20}/><input type="file" className="hidden" onChange={handleFileUpload}/></label>
                  <textarea ref={textareaRef} value={code} onChange={e => setCode(e.target.value)} className={`flex-1 bg-transparent border-none outline-none ${colors.text} p-3 resize-none overflow-y-auto custom-scrollbar text-base placeholder:opacity-40`} style={{ minHeight: "40px" }} placeholder={isInputMinimized ? "Hidden..." : "Paste code here..."} disabled={loading}/>
                  {loading ? <button onClick={stopGeneration} className="p-3 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20"><StopCircle size={20}/></button> : <button onClick={generateDocs} disabled={!code.trim()} className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50"><Wand2 size={20}/></button>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}