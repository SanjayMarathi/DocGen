import React from 'react';
import { Upload, StopCircle, Wand2, X } from 'lucide-react';

export default function CodeInput({
  code, setCode, handleFileUpload, model, setModel, MODELS,
  loading, stopGeneration, generateDocs, handleNewChat, textareaRef, isInputMinimized
}) {
  return (
    <div className="w-[480px] bg-[#fafafa] border-r border-[#f0f0f0] flex flex-col shadow-sm relative z-10">
      <div className="p-4 border-b border-[#f0f0f0] flex items-center justify-between bg-white">
        <span className="text-sm font-semibold text-[#111111]">Workspace</span>
        <button onClick={handleNewChat} className="p-1 hover:bg-[#f0f0f0] rounded text-[#555555] transition-colors"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar paasa-bg">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-[#999999] uppercase tracking-widest font-mono">Input Source</label>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-[#555555] uppercase">Engine:</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="text-xs font-medium border border-[#dddddd] rounded px-2 py-1 outline-none cursor-pointer bg-white text-[#111111] shadow-sm focus:border-[#2dd4a8] transition-colors"
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={e => setCode(e.target.value)}
            className="w-full bg-white border border-[#dddddd] rounded-xl p-4 resize-none outline-none focus:border-[#2dd4a8] focus:ring-1 focus:ring-[#2dd4a8] transition-all text-sm font-mono leading-relaxed text-[#333333] shadow-sm"
            style={{ minHeight: "360px" }}
            placeholder="// Paste your raw code here..."
            disabled={loading}
          />
          <div className="flex gap-2">
            <label className="flex-1 bg-white border border-[#dddddd] rounded-lg p-3 text-center cursor-pointer hover:border-[#2dd4a8] hover:text-[#2dd4a8] transition-colors shadow-sm text-[#555555]">
              <Upload size={18} className="inline mr-2" />
              <span className="text-sm font-medium">Upload File</span>
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#f0f0f0] bg-white">
        {loading ? (
          <button onClick={stopGeneration} className="w-full bg-[#111111] text-white py-3 rounded-xl hover:bg-[#e74c3c] transition-colors text-sm font-medium flex items-center justify-center gap-2 shadow-md">
            <StopCircle size={18} /> Halt Processing
          </button>
        ) : (
          <button onClick={generateDocs} disabled={!code.trim()} className="w-full bg-[#111111] text-white py-3 rounded-xl hover:bg-[#2dd4a8] transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-30 disabled:hover:bg-[#111111] disabled:cursor-not-allowed shadow-md">
            <Wand2 size={18} /> Compile Documentation
          </button>
        )}
      </div>
    </div>
  );
}
