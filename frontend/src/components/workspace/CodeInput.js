import React, { useState } from "react";
import { ChevronDown, ChevronUp, Paperclip, Wand2, StopCircle } from "lucide-react";

export default function CodeInput({
  code,
  setCode,
  loading,
  generateDocs,
  stopGeneration,
  handleFileUpload,
  model,
  setModel,
  MODELS,
  theme
}) {
  const [isInputMinimized, setIsInputMinimized] = useState(false);
  const isDark = theme === "dark";

  return (
    <div className={`flex-shrink-0 p-4 border-t ${isDark ? "border-[#2a2a2a] bg-[#111111]" : "border-[#f0f0f0] bg-white"} z-20 transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto flex flex-col gap-2">
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={`text-sm font-mono border ${isDark ? "border-[#333333] bg-[#0a0a0a] text-white" : "border-[#e5e5e5] bg-[#fafafa] text-black"} p-1 outline-none cursor-pointer hover:border-[#2dd4a8] transition-colors`}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsInputMinimized(!isInputMinimized)}
            className="text-gray-400 hover:text-[#2dd4a8] transition-colors"
          >
            {isInputMinimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {!isInputMinimized && (
          <div className={`flex gap-2 p-2 border ${isDark ? "border-[#333333] bg-[#0a0a0a]" : "border-[#e5e5e5] bg-[#fafafa]"} transition-colors duration-300`}>
            
            <label className="p-2 text-gray-400 hover:text-[#2dd4a8] cursor-pointer flex flex-col justify-end transition-colors">
              <Paperclip size={20} />
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`flex-1 bg-transparent outline-none p-2 resize-none h-32 font-mono text-sm ${isDark ? "text-gray-300" : "text-gray-700"} custom-scrollbar`}
              placeholder="Paste code or drop file here..."
              disabled={loading}
            />
            
            <div className="flex flex-col justify-end">
              {loading ? (
                <button
                  onClick={stopGeneration}
                  className="p-3 bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <StopCircle size={24} />
                </button>
              ) : (
                <button
                  onClick={generateDocs}
                  disabled={!code.trim()}
                  className="p-3 bg-[#111111] dark:bg-white text-white dark:text-black hover:bg-[#2dd4a8] dark:hover:bg-[#2dd4a8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wand2 size={24} />
                </button>
              )}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
