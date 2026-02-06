import { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Cpu,
  Terminal,
  FileText,
  Download,
  Loader2,
  Wand2,
  ChevronDown,
  Copy,
  Upload,
  Wifi,
  WifiOff
} from "lucide-react";

export default function App() {

  const [code, setCode] = useState("");
  const [docs, setDocs] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔵 NEW — REAL INTERNET STATE
  const [connection, setConnection] = useState("checking");


  // ---------------- CHECK INTERNET FROM DJANGO ----------------
  const checkBackendConnection = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/status/", { cache: "no-store" });
      const data = await res.json();
      setConnection(data.online ? "online" : "offline");
    } catch {
      setConnection("offline");
    }
  };


  // auto check every 5 sec
  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 5000);
    return () => clearInterval(interval);
  }, []);


  const generateDocs = async () => {

    setDocs("");
    setLoading(true);

    // check internet before generating
    await checkBackendConnection();

    try {
      const response = await fetch("http://127.0.0.1:8000/api/generate/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        setDocs(prev => prev + chunk);
      }

    } catch {
      setDocs("Backend not reachable. Make sure Django server is running.");
    }

    setLoading(false);
  };


  const downloadPDF = async () => {
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/pdf/",
        { docs },
        { responseType: "blob" }
      );

      const file = new Blob([res.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(file);
      link.download = "AI_Documentation.pdf";
      link.click();
    } catch {
      alert("Error downloading PDF");
    }
  };


  const copyDocs = () => {
    navigator.clipboard.writeText(docs);
    alert("Documentation copied successfully!");
  };


  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCode(event.target.result);
    };
    reader.readAsText(file);
  };


  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans pb-20">

      {/* 🔵 ONLINE OFFLINE BADGE */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="fixed top-6 right-6 z-50">
        {connection === "online" ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-300 border border-green-400/40 backdrop-blur shadow-lg">
            <Wifi size={16} />
            <span className="text-sm font-semibold">Online</span>
          </div>
        ) : connection === "offline" ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 backdrop-blur shadow-lg">
            <WifiOff size={16} />
            <span className="text-sm font-semibold">Offline — factual accuracy limited</span>
          </div>
        ) : null}
      </motion.div>


      {/* BACKGROUND GLOW */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-purple-900/30 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-blue-900/20 blur-[140px] rounded-full" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6">

        {/* HERO */}
        <header className="pt-20 pb-14 text-center">
          <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 shadow-lg shadow-purple-500/20">
              <Cpu size={36} className="text-white" />
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-6xl font-black tracking-tight text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              DocGen
            </span>
          </motion.h1>

          <p className="text-gray-500 text-lg mt-4">
            Code Documentation Generator powered by{" "}
            <span className="text-purple-400 font-semibold">
              Ollama + Qwen2.5-Coder
            </span>
          </p>
        </header>

        {/* INPUT CARD */}
        <motion.div initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="relative group mb-14">
          <div className="absolute -inset-1 bg-gradient-to-b from-purple-600/30 to-transparent rounded-[32px] blur-xl opacity-60 group-hover:opacity-100 transition duration-1000"></div>

          <div className="relative bg-[#111] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Code Editor
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-400 hover:text-blue-300 transition">
                <Upload size={14} />
                Upload File
                <input type="file" accept=".py,.cpp,.java,.js" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here or upload a file..."
              className="w-full h-80 p-8 bg-transparent text-purple-50 font-mono text-sm outline-none resize-none placeholder:text-gray-700"
            />

            <div className="p-6 bg-gradient-to-t from-white/[0.02] to-transparent">
              <button onClick={generateDocs} disabled={loading}
                className="w-full relative group h-14 overflow-hidden rounded-xl bg-white text-black font-bold transition-all active:scale-[0.98]">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2 group-hover:text-white transition-colors">
                  {loading ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
                  {loading ? "Generating..." : "Generate Documentation"}
                </div>
              </button>
            </div>
          </div>
        </motion.div>


        {/* OUTPUT */}
        <AnimatePresence>
          {docs && (
            <motion.div initial={{ opacity: 0, y: 45 }} animate={{ opacity: 1, y: 0 }} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-t from-blue-600/25 to-transparent rounded-[32px] blur-xl opacity-60"></div>

              <div className="relative bg-[#111] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl">

                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Documentation Output
                    </span>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={copyDocs} className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300">
                      <Copy size={14} /> COPY
                    </button>

                    <button onClick={downloadPDF} className="flex items-center gap-1 text-xs font-bold text-green-400 hover:text-green-300">
                      <Download size={14} /> EXPORT PDF
                    </button>
                  </div>
                </div>

                <div className="p-10 max-w-none text-gray-200">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-4xl font-extrabold mt-6 mb-4 text-white" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-6 mb-3 text-purple-300" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-5 mb-2 text-blue-300" {...props} />,
                      p: ({ node, ...props }) => <p className="leading-relaxed mb-3 text-gray-300" {...props} />,
                      li: ({ node, ...props }) => <li className="ml-6 list-disc mb-2 text-gray-300" {...props} />,
                      code: ({ node, ...props }) => <code className="bg-black/40 px-2 py-1 rounded text-green-300" {...props} />,
                      pre: ({ node, ...props }) => <pre className="bg-black/60 p-4 rounded-xl overflow-x-auto my-4" {...props} />,
                    }}
                  >
                    {docs}
                  </ReactMarkdown>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
