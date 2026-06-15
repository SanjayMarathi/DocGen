import React from "react";
import { Mail, Github } from "lucide-react";

export default function ContactView() {
  return (
    <div className="p-10 max-w-4xl mx-auto animate-fadeUp">
      <h1 className="text-4xl font-light mb-10 tracking-tight">
        Contact Support
      </h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="p-8 border border-[#f0f0f0] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] flex flex-col items-center text-center shadow-sm transition-colors duration-300 group">
          <Mail className="text-gray-400 group-hover:text-[#2dd4a8] transition-colors mb-6" size={40} />
          <h2 className="text-2xl font-bold mb-2 tracking-tight">Email Support</h2>
          <a
            href="mailto:support@docgen.com"
            className="text-[#111111] dark:text-white font-mono hover:text-[#2dd4a8] dark:hover:text-[#2dd4a8] transition-colors"
          >
            support@docgen.com
          </a>
        </div>
        <div className="p-8 border border-[#f0f0f0] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] flex flex-col items-center text-center shadow-sm transition-colors duration-300 group">
          <Github className="text-gray-400 group-hover:text-[#2dd4a8] transition-colors mb-6" size={40} />
          <h2 className="text-2xl font-bold mb-2 tracking-tight">GitHub</h2>
          <a
            href="https://github.com/SanjayMarathi/DocGen"
            className="text-[#111111] dark:text-white font-mono hover:text-[#2dd4a8] dark:hover:text-[#2dd4a8] transition-colors"
          >
            github.com/docgen
          </a>
        </div>
      </div>
    </div>
  );
}
