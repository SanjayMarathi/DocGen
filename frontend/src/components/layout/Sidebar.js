import React from "react";
import { motion } from "framer-motion";
import { X, PlusCircle, Trash2, Settings } from "lucide-react";

export default function Sidebar({
  setView,
  setShowHistory,
  userData,
  connection,
  history,
  loadDoc,
  deleteDoc,
  currentDocId,
  theme
}) {
  const isDark = theme === "dark";
  const border = isDark ? "border-[#2a2a2a]" : "border-[#f0f0f0]";
  const bg = isDark ? "bg-[#0a0a0a]" : "bg-[#fafafa]";
  const hover = isDark ? "hover:bg-[#1a1a1a]" : "hover:bg-white";

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 350, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className={`flex-shrink-0 flex flex-col border-r ${border} ${bg} z-30 transition-colors duration-300`}
    >
      <div className={`p-4 border-b ${border} flex justify-between items-center`}>
        <button
          onClick={() => setView("home")}
          className="font-bold text-lg hover:text-[#2dd4a8] transition-colors tracking-tight"
        >
          DocGen
        </button>
        <button
          onClick={() => setShowHistory(false)}
          className={`p-1 ${hover} rounded transition-colors`}
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="p-4">
        <button
          onClick={() => {
            setView("home");
            // Simulate a 'new document' click by resetting docs in App component
            // We pass setView here, but we also rely on App handling the rest
          }}
          className={`w-full py-3 bg-[#111111] dark:bg-white text-white dark:text-black font-bold rounded-none flex items-center justify-center gap-2 hover:bg-[#2dd4a8] dark:hover:bg-[#2dd4a8] transition-colors`}
        >
          <PlusCircle size={18} /> New Document
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
        {history.map((doc) => (
          <div
            key={doc.id}
            onClick={() => loadDoc(doc)}
            className={`p-3 border cursor-pointer ${hover} transition-colors ${
              currentDocId === doc.id 
                ? `border-[#2dd4a8] ${isDark ? "bg-[#2dd4a8]/10" : "bg-[#2dd4a8]/5"}` 
                : `border-transparent`
            }`}
          >
            <div className="font-semibold text-sm truncate tracking-tight">
              {doc.topic || "Untitled Doc"}
            </div>
            <div className={`flex justify-between items-center text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              <span className="font-mono">{new Date(doc.created_at).toLocaleDateString()}</span>
              <button
                onClick={(e) => deleteDoc(doc.id, e)}
                className="hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className={`p-4 border-t ${border} ${isDark ? "bg-[#111111]" : "bg-white"} transition-colors duration-300`}>
        <div
          onClick={() => setView("profile")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-[#2dd4a8] flex items-center justify-center text-[#111111] font-bold">
            {userData.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate group-hover:text-[#2dd4a8] transition-colors">
              {userData.username}
            </div>
            <div className={`text-[10px] font-bold font-mono tracking-widest ${connection === "online" ? "text-[#2dd4a8]" : "text-red-500"}`}>
              {connection.toUpperCase()}
            </div>
          </div>
          <Settings size={16} className="text-gray-400 group-hover:text-[#2dd4a8] transition-colors" />
        </div>
      </div>
    </motion.aside>
  );
}
