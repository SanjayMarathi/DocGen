import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthPage from "./components/auth/AuthPage";
import MainLayout from "./components/layout/MainLayout";

// API CONFIG
const API_BASE = "http://127.0.0.1:8000/api/";
const API = axios.create({ baseURL: API_BASE });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const MODELS = [
  { id: "phi3:mini", label: "Fast" },
  { id: "qwen2.5-coder:3b", label: "Balanced" },
  { id: "qwen2.5-coder:7b", label: "Thinking" }
];

function AppContent() {
  const navigate = useNavigate();
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
  const [isInputMinimized, setIsInputMinimized] = useState(false);

  const outputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    if (token) { fetchUser(); fetchHistory(); }
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = isInputMinimized ? "40px" : "auto";
      if (!isInputMinimized) textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [code, isInputMinimized]);

  const handleAuthSubmit = async (user, pass, isRegister) => {
    try {
      const endpoint = isRegister ? "register/" : "login/";
      const res = await axios.post(`${API_BASE}${endpoint}`, { username: user, password: pass });

      if (isRegister) {
        alert("Registered successfully! Please login.");
        navigate('/login');
      } else {
        if (res.data.access) {
          localStorage.setItem("token", res.data.access);
          setToken(res.data.access);
          checkConnection();
          setTimeout(() => { fetchUser(); fetchHistory(); }, 50);
          navigate('/'); // Go to workspace
        } else {
          alert("Login failed: No token received");
        }
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Auth Failed");
    }
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

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setHistory([]);
    navigate('/login');
  };

  const fetchUser = async () => { try { const res = await API.get("user/"); setUsername(res.data.username); } catch { } };
  const fetchHistory = async () => { try { const res = await API.get("history/"); setHistory(res.data); } catch { } };
  const checkConnection = async () => { try { const res = await fetch(`${API_BASE}status/`); const d = await res.json(); setConnection(d.online ? "online" : "offline"); } catch { setConnection("offline"); } };
  const deleteDoc = async (id, e) => { e.stopPropagation(); if (window.confirm("Delete?")) { await API.delete(`history/${id}/delete/`); fetchHistory(); } };
  const handleFileUpload = (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setCode(ev.target.result); r.readAsText(f); } };

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <AuthPage handleAuthSubmit={handleAuthSubmit} />} />
      <Route path="/register" element={token ? <Navigate to="/" /> : <AuthPage handleAuthSubmit={handleAuthSubmit} />} />
      <Route path="/" element={
        token ? (
          <MainLayout
            logout={logout}
            connection={connection}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            history={history}
            loadHistoryItem={loadHistoryItem}
            deleteDoc={deleteDoc}
            currentDocId={currentDocId}
            handleNewChat={handleNewChat}
            code={code}
            setCode={setCode}
            model={model}
            setModel={setModel}
            MODELS={MODELS}
            loading={loading}
            generateDocs={generateDocs}
            stopGeneration={stopGeneration}
            handleFileUpload={handleFileUpload}
            docs={docs}
            outputRef={outputRef}
            downloadFile={downloadFile}
            textareaRef={textareaRef}
            isInputMinimized={isInputMinimized}
          />
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
