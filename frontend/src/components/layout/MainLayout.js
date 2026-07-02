import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, LogOut, Menu } from 'lucide-react';
import Sidebar from '../workspace/Sidebar';
import CodeInput from '../workspace/CodeInput';
import Toolbar from '../workspace/Toolbar';
import DocumentViewer from '../workspace/DocumentViewer';

export default function MainLayout(props) {
  const {
    logout, connection, showHistory, setShowHistory,
    history, loadHistoryItem, deleteDoc, currentDocId, handleNewChat,
    code, setCode, model, setModel, MODELS, loading, generateDocs,
    stopGeneration, handleFileUpload, docs, outputRef, downloadFile,
    textareaRef, isInputMinimized
  } = props;

  return (
    <div className="flex h-screen bg-white text-[#111111] font-sans overflow-hidden relative">
      
      {/* TOP HEADER */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 border-b border-[#f0f0f0] h-14 flex items-center justify-between px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowHistory(!showHistory)} className="p-1.5 hover:bg-[#f0f0f0] rounded-md transition-colors text-[#555555]">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#111111] tracking-tight">DocGen</span>
            <div className="h-4 w-[1px] bg-[#dddddd] mx-1"></div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#999999] pt-1">Workspace</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {connection === "online" ? (
              <><div className="w-2 h-2 rounded-full bg-[#2dd4a8]"></div><span className="text-[10px] font-mono uppercase text-[#555555]">Connected</span></>
            ) : (
              <><div className="w-2 h-2 rounded-full bg-[#e74c3c]"></div><span className="text-[10px] font-mono uppercase text-[#555555]">Offline</span></>
            )}
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-xs font-semibold uppercase text-[#555555] hover:text-[#111111] transition-colors">
            <LogOut size={14} /> Exit
          </button>
        </div>
      </nav>

      {/* HISTORY SIDEBAR */}
      <AnimatePresence>
        <Sidebar
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          history={history}
          currentDocId={currentDocId}
          loadHistoryItem={loadHistoryItem}
          handleNewChat={handleNewChat}
          deleteDoc={deleteDoc}
        />
      </AnimatePresence>

      <div className="flex flex-1 pt-14 relative z-10 w-full">
        {/* LEFT PANEL */}
        <CodeInput
          code={code}
          setCode={setCode}
          handleFileUpload={handleFileUpload}
          model={model}
          setModel={setModel}
          MODELS={MODELS}
          loading={loading}
          stopGeneration={stopGeneration}
          generateDocs={generateDocs}
          handleNewChat={handleNewChat}
          textareaRef={textareaRef}
          isInputMinimized={isInputMinimized}
        />

        {/* MIDDLE TOOLBAR */}
        <Toolbar docs={docs} downloadFile={downloadFile} />

        {/* RIGHT PANEL */}
        <DocumentViewer docs={docs} loading={loading} outputRef={outputRef} />
      </div>
    </div>
  );
}
