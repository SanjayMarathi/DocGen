import React from "react";
import { LogOut } from "lucide-react";

export default function ProfileView({ userData, logout }) {
  return (
    <div className="p-10 max-w-2xl mx-auto animate-fadeUp">
      <div className="p-10 border border-[#f0f0f0] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] text-center shadow-sm transition-colors duration-300">
        <div className="w-24 h-24 bg-[#2dd4a8] mx-auto flex items-center justify-center text-[#111111] text-4xl font-bold mb-6">
          {userData.username[0]?.toUpperCase()}
        </div>
        <h1 className="text-3xl font-light mb-2 tracking-tight">{userData.username}</h1>
        <p className="text-gray-400 font-mono mb-10 uppercase tracking-widest text-xs">
          Active Session
        </p>
        <button
          onClick={logout}
          className="w-full py-4 bg-red-500 text-white font-bold hover:bg-red-600 flex gap-3 items-center justify-center transition-colors"
        >
          <LogOut size={20} /> Terminate Session & Sign Out
        </button>
      </div>
    </div>
  );
}
