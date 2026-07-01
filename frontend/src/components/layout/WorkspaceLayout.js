import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon } from "lucide-react";
import Sidebar from "./Sidebar";
import Ferrofluid from "../ui/Ferrofluid";

export default function WorkspaceLayout({
  children,
  view,
  setView,
  theme,
  setTheme,
  showHistory,
  setShowHistory,
  userData,
  connection,
  history,
  loadDoc,
  deleteDoc,
  currentDocId,
  logout
}) {
  const isDark = theme === "dark";

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans ${isDark ? "bg-[#111111] text-gray-100" : "bg-white text-[#111111]"} transition-colors duration-300 relative`}>
      <div className="absolute inset-0 z-0">
        <Ferrofluid
          colors={isDark ? ["#4F46E5", "#06B6D4", "#E0F2FE"] : ["#a855f7", "#ec4899", "#f43f5e"]}
          speed={0.5}
          scale={1}
          turbulence={1}
          fluidity={0.1}
          rimWidth={0.2}
          sharpness={3}
          shimmer={1}
          glow={2}
          flowDirection="down"
          opacity={isDark ? 0.3 : 0.15}
          mouseInteraction={true}
          mouseStrength={1}
          mouseRadius={0.3}
        />
      </div>
      
      <div className="flex z-10 w-full h-full relative pointer-events-none">
        <div className="pointer-events-auto h-full flex">
          <AnimatePresence>
            {showHistory && (
              <Sidebar
            setView={setView}
            setShowHistory={setShowHistory}
            userData={userData}
            connection={connection}
            history={history}
            loadDoc={loadDoc}
            deleteDoc={deleteDoc}
            currentDocId={currentDocId}
            theme={theme}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className={`flex-none h-14 border-b ${isDark ? "border-[#2a2a2a] bg-[#111111]" : "border-[#f0f0f0] bg-white"} flex items-center justify-between px-4 z-20 transition-colors duration-300`}>
          <div className="flex items-center gap-3">
            {!showHistory && (
              <button
                onClick={() => setShowHistory(true)}
                className={`p-2 rounded hover:bg-[#2dd4a8] hover:text-black transition-colors`}
              >
                <Menu size={20} />
              </button>
            )}
            <h2 className="font-bold text-lg capitalize tracking-tight">{view === "home" ? "Workspace" : view}</h2>
          </div>
          <div className="flex gap-6 items-center">
            {["home", "about", "contact"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-sm font-bold tracking-tight transition-colors ${
                  view === v 
                  ? "text-[#2dd4a8]" 
                  : isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-black"
                }`}
              >
                {v === "home" ? "Workspace" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            <div className={`w-px h-4 ${isDark ? "bg-[#333333]" : "bg-gray-300"}`}></div>
            <button 
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="hover:text-[#2dd4a8] transition-colors"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden relative">
            {children}
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
