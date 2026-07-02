import React from "react";
import { ShieldCheck, Globe } from "lucide-react";

export default function AboutView() {
  return (
    <div className="p-10 max-w-4xl mx-auto overflow-y-auto animate-fadeUp">
      <h1 className="text-4xl font-light mb-6 tracking-tight">
        About DocGen
      </h1>
      <div className="space-y-8">
        <p className="text-xl leading-relaxed opacity-80 font-mono text-sm">
          DocGen is an AI-powered documentation engine designed to
          transform source code into professional-grade technical
          documents.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 border border-[#f0f0f0] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] shadow-sm transition-colors duration-300">
            <div className="p-3 bg-[#2dd4a8]/10 text-[#2dd4a8] w-fit mb-4">
              <ShieldCheck size={28} />
            </div>
            <h3 className="font-bold text-xl mb-2 tracking-tight">
              Privacy & Security
            </h3>
            <p className="text-sm opacity-70 font-mono">
              Your code stays yours. We prioritize session security and
              leverage industry-standard AI processing.
            </p>
          </div>
          <div className="p-6 border border-[#f0f0f0] dark:border-[#2a2a2a] bg-white dark:bg-[#111111] shadow-sm transition-colors duration-300">
            <div className="p-3 bg-[#2dd4a8]/10 text-[#2dd4a8] w-fit mb-4">
              <Globe size={28} />
            </div>
            <h3 className="font-bold text-xl mb-2 tracking-tight">Format Export</h3>
            <p className="text-sm opacity-70 font-mono">
              Generate files compatible with GitHub, Jira, and internal
              wikis instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
