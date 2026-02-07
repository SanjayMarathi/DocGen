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
  Copy,
  Upload,
  Wifi,
  WifiOff
} from "lucide-react";

export default function Home() {

  const [code, setCode] = useState("");
  const [docs, setDocs] = useState("");
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState("checking");

  const checkBackendConnection = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/status/", { cache: "no-store" });
      const data = await res.json();
      setConnection(data.online ? "online" : "offline");
    } catch {
      setConnection("offline");
    }
  };

  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const generateDocs = async () => {
    setDocs("");
    setLoading(true);
    await checkBackendConnection();

    try {
      const response = await fetch("http://127.0.0.1:8000/api/generate/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ code }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setDocs(prev => prev + decoder.decode(value));
      }
    } catch {
      setDocs("Backend not reachable. Make sure Django server is running.");
    }

    setLoading(false);
  };

  const downloadPDF = async () => {
    const res = await axios.post("http://127.0.0.1:8000/api/pdf/", { docs }, { responseType:"blob" });
    const file = new Blob([res.data], { type:"application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "AI_Documentation.pdf";
    link.click();
  };

  const copyDocs = () => navigator.clipboard.writeText(docs);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setCode(event.target.result);
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans pb-20">

      {/* ONLINE BADGE */}
      <motion.div className="fixed top-6 right-6 z-50">
        {connection === "online" ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-300 border border-green-400/40 backdrop-blur shadow-lg">
            <Wifi size={16} /> Online
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 backdrop-blur shadow-lg">
            <WifiOff size={16} /> Offline — factual accuracy limited
          </div>
        )}
      </motion.div>

      {/* KEEP REST OF UI SAME */}
      {/* (I trimmed here to keep message readable — you paste your remaining JSX exactly same below this line) */}

    </div>
  );
}
