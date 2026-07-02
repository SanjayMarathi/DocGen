import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import AuthPage from "./components/auth/AuthPage";
import WorkspaceLayout from "./components/layout/WorkspaceLayout";
import AboutView from "./components/views/AboutView";
import ContactView from "./components/views/ContactView";
import ProfileView from "./components/views/ProfileView";
import DocumentViewer from "./components/workspace/DocumentViewer";
import CodeInput from "./components/workspace/CodeInput";

// --- API CONFIG ---
const API_BASE = "/api/";
const API = axios.create({ baseURL: API_BASE });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const MODELS = [{ id: "qwen2.5-coder:3b", label: "Fast" }];

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState(localStorage.getItem("token"));
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  
  // view determines which central view is active (home=workspace, about, contact, profile)
  const [view, setView] = useState("home");
  
  const [userData, setUserData] = useState({ username: "Guest" });
  const [code, setCode] = useState("");
  const [docs, setDocs] = useState("");
  const [history, setHistory] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [model, setModel] = useState("qwen2.5-coder:3b");

  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState("checking");
  const [abortController, setAbortController] = useState(null);
  const [showHistory, setShowHistory] = useState(true);
  
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
      fetchHistory();
    }
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Keep routing synchronized with views
  useEffect(() => {
    if (token && location.pathname === "/login") navigate("/");
    if (token && location.pathname === "/register") navigate("/");
  }, [token, location, navigate]);

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

  const handleAuth = async (username, password, isRegister) => {
    try {
      const endpoint = isRegister ? "register/" : "login/";
      const res = await axios.post(`${API_BASE}${endpoint}`, { username, password });
      
      if (isRegister) {
        alert("Account created! Please Sign In.");
        navigate('/login');
        return true;
      }
      if (res.data.access) {
        localStorage.setItem("token", res.data.access);
        setToken(res.data.access);
        navigate('/');
        return true;
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
    navigate('/login');
  };

  const generateDocs = async () => {
    if (!code.trim()) return;
    setDocs("");
    setLoading(true);
    setCurrentDocId(null);
    
    const controller = new AbortController();
    setAbortController(controller);

    let fullContent = "";
    let serverDocId = null;

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

      // Throttle updates to React state to prevent lagging ("make it faster")
      let batchedChunk = "";
      const updateDelay = 50; 
      let lastUpdateTime = Date.now();

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
            if (batchedChunk) {
                setDocs(prev => prev + batchedChunk);
            }
            break;
        }
        
        let chunk = decoder.decode(value, { stream: true });

        if (isFirstChunk) {
          const match = chunk.match(/^\{"id":\s*(\d+)\}\n/);
          if (match) {
            serverDocId = parseInt(match[1]);
            setCurrentDocId(serverDocId);
            chunk = chunk.replace(match[0], "");
            fetchHistory();
          }
          isFirstChunk = false;
        }

        fullContent += chunk;
        batchedChunk += chunk;

        const now = Date.now();
        if (now - lastUpdateTime > updateDelay) {
            setDocs((prev) => prev + batchedChunk);
            batchedChunk = "";
            lastUpdateTime = now;

            const container = outputRef.current;
            if (container) {
                const { scrollTop, scrollHeight, clientHeight } = container;
                if (scrollHeight - scrollTop - clientHeight < 150) {
                    container.scrollTop = container.scrollHeight;
                }
            }
        }
      }

      if (serverDocId) {
        await API.post(`history/${serverDocId}/update_content/`, {
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

  const copyMarkdown = () => {
    // Strip ```markdown wrap if present to prevent copying "hashcoded" wrappers
    let cleanDocs = docs.trim();
    if (cleanDocs.startsWith("```markdown")) {
        cleanDocs = cleanDocs.replace(/^```markdown\n/i, "");
    }
    if (cleanDocs.endsWith("```")) {
        cleanDocs = cleanDocs.replace(/```$/i, "").trim();
    }
    navigator.clipboard.writeText(cleanDocs);
  };

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <AuthPage handleAuth={handleAuth} />} />
      <Route path="/register" element={token ? <Navigate to="/" /> : <AuthPage handleAuth={handleAuth} />} />
      <Route path="/" element={
        token ? (
          <WorkspaceLayout
            view={view}
            setView={setView}
            theme={theme}
            setTheme={setTheme}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            userData={userData}
            connection={connection}
            history={history}
            loadDoc={loadDoc}
            deleteDoc={deleteDoc}
            currentDocId={currentDocId}
            logout={logout}
          >
            {view === "home" && (
                <div className="flex-1 flex flex-col min-h-0 w-full relative">
                    <DocumentViewer 
                        docs={docs} 
                        loading={loading} 
                        outputRef={outputRef} 
                        downloadFile={downloadFile} 
                        copyMarkdown={copyMarkdown}
                    />
                    <CodeInput 
                        code={code}
                        setCode={setCode}
                        loading={loading}
                        generateDocs={generateDocs}
                        stopGeneration={stopGeneration}
                        handleFileUpload={handleFileUpload}
                        model={model}
                        setModel={setModel}
                        MODELS={MODELS}
                    />
                </div>
            )}
            {view === "about" && <AboutView />}
            {view === "contact" && <ContactView />}
            {view === "profile" && <ProfileView userData={userData} logout={logout} />}
          </WorkspaceLayout>
        ) : (
          <Navigate to="/login" />
        )
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
