import React from 'react';

export default function ProjectInfo() {
  return (
    <div className="hidden lg:flex w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden paasa-bg">
      {/* Subtle background circles for depth */}
      <div className="absolute -right-32 top-10 w-96 h-96 border-[0.5px] border-[#2dd4a8] opacity-20 rounded-full"></div>
      <div className="absolute -left-20 bottom-10 w-80 h-80 border-[0.5px] border-[#2dd4a8] opacity-10 rounded-full"></div>

      <div className="relative z-10 max-w-xl text-center flex flex-col items-center">
        {/* Paasa logo mock (could be DocGen instead of Paasa) */}
        <div className="text-2xl font-bold mb-12 tracking-tight flex items-center gap-2">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#111" />
            <path d="M2 17L12 22L22 17" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          DocGen
        </div>

        <h1 className="text-5xl paasa-heading mb-6">AI documentation generator.</h1>
        <p className="paasa-subtitle mb-12 uppercase">
          Find the clarity hidden in the code to apply.
        </p>

        <div className="flex items-center w-64 mt-8 opacity-80 hover:opacity-100 transition-opacity">
          <div className="paasa-line"></div>
          <svg className="ml-2 text-[#999999]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>

        {/* Feature List */}
        <div className="mt-20 text-left space-y-8 w-full max-w-sm">
          <div className="flex items-start gap-4">
             <div className="mt-1 w-2 h-2 rounded-full bg-[#2dd4a8]"></div>
             <div>
                <h3 className="font-semibold text-sm">Code Analysis</h3>
                <p className="text-xs text-[#999999] mt-1 font-mono">Automated structural insight</p>
             </div>
          </div>
          <div className="flex items-start gap-4">
             <div className="mt-1 w-2 h-2 rounded-full bg-[#2dd4a8]"></div>
             <div>
                <h3 className="font-semibold text-sm">Export Options</h3>
                <p className="text-xs text-[#999999] mt-1 font-mono">PDF & Word generation</p>
             </div>
          </div>
          <div className="flex items-start gap-4">
             <div className="mt-1 w-2 h-2 rounded-full bg-[#2dd4a8]"></div>
             <div>
                <h3 className="font-semibold text-sm">History Tracking</h3>
                <p className="text-xs text-[#999999] mt-1 font-mono">Secure access anytime</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
