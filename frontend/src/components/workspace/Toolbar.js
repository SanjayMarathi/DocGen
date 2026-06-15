import React from 'react';
import { Copy, Download, FileText } from 'lucide-react';

export default function Toolbar({ docs, downloadFile }) {
  return (
    <div className="w-14 bg-white border-r border-[#f0f0f0] flex flex-col items-center py-6 gap-4 z-10 shadow-sm relative">
      <button onClick={() => navigator.clipboard.writeText(docs)} disabled={!docs} className={`p-2.5 rounded-lg ${!docs ? 'opacity-30' : 'hover:bg-[#f0f0f0] text-[#555555] hover:text-[#111111]'} transition-colors group relative`} title="Copy">
        <Copy size={20} />
        <span className="absolute left-14 bg-[#111111] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50 shadow-md font-mono">Copy</span>
      </button>

      <div className="w-6 h-[1px] bg-[#f0f0f0] my-2"></div>

      <button onClick={() => downloadFile('pdf')} disabled={!docs} className={`p-2.5 rounded-lg ${!docs ? 'opacity-30' : 'hover:bg-[rgba(45,212,168,0.1)] text-[#555555] hover:text-[#2dd4a8]'} transition-colors group relative`} title="Export PDF">
        <Download size={20} />
        <span className="absolute left-14 bg-[#111111] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50 shadow-md font-mono">Export PDF</span>
      </button>

      <button onClick={() => downloadFile('docx')} disabled={!docs} className={`p-2.5 rounded-lg ${!docs ? 'opacity-30' : 'hover:bg-[#f0f0f0] text-[#555555] hover:text-[#111111]'} transition-colors group relative`} title="Export Word">
        <FileText size={20} />
        <span className="absolute left-14 bg-[#111111] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-50 shadow-md font-mono">Export Word</span>
      </button>
    </div>
  );
}
