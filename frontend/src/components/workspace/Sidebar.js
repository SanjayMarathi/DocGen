import React from 'react';
import { motion } from 'framer-motion';
import { X, PlusCircle, Trash2 } from 'lucide-react';

export default function Sidebar({
  showHistory, setShowHistory, history, currentDocId, loadHistoryItem, handleNewChat, deleteDoc
}) {
  if (!showHistory) return null;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/10 z-40 top-14" />
      <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} className="fixed left-0 top-14 bottom-0 w-80 bg-white border-r border-[#f0f0f0] z-50 flex flex-col shadow-lg">
        <div className="p-4 border-b border-[#f0f0f0] flex justify-between items-center bg-[#fafafa]">
          <span className="text-sm font-semibold text-[#111111]">Document History</span>
          <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-[#f0f0f0] rounded text-[#555555] transition-colors"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {history.map(doc => (
            <div key={doc.id} onClick={() => loadHistoryItem(doc)} className={`p-3 rounded-lg cursor-pointer transition border ${currentDocId === doc.id ? 'border-[#2dd4a8] bg-[rgba(45,212,168,0.05)]' : 'border-transparent hover:bg-[#fafafa]'}`}>
              <div className="font-medium text-sm truncate text-[#111111]">{doc.topic}</div>
              <div className="flex justify-between items-center mt-1 text-[10px] text-[#999999] font-mono">
                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                <button onClick={(e) => deleteDoc(doc.id, e)} className="hover:text-[#e74c3c] transition"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-[#f0f0f0] bg-[#fafafa]">
          <button onClick={handleNewChat} className="w-full flex justify-center items-center gap-2 bg-[#111111] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#2dd4a8] transition-colors shadow-sm">
            <PlusCircle size={16} /> New Document
          </button>
        </div>
      </motion.div>
    </>
  );
}
