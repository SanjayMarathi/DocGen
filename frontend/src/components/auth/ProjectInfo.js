import React from 'react';
import { motion } from 'framer-motion';

export default function ProjectInfo() {
  return (
    <div className="hidden lg:flex w-1/2 flex-col items-center p-12 relative overflow-y-auto custom-scrollbar paasa-bg h-screen">
      {/* Subtle background circles for depth */}
      <div className="fixed right-[-100px] top-10 w-96 h-96 border-[0.5px] border-[#2dd4a8] opacity-20 rounded-full pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-xl text-center flex flex-col items-center mt-10">
        <div className="text-2xl font-bold mb-12 tracking-tight flex items-center gap-2">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#111" />
            <path d="M2 17L12 22L22 17" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          DocGen
        </div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl paasa-heading mb-6"
        >
          AI documentation generator.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="paasa-subtitle mb-12 uppercase"
        >
          Find the clarity hidden in the code to apply.
        </motion.p>

        <div className="flex items-center w-64 mt-4 mb-16 opacity-80">
          <div className="paasa-line"></div>
        </div>

        {/* Scrollable Feature List */}
        <div className="text-left space-y-12 w-full pb-20">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="p-6 border border-[#2dd4a8]/30 bg-black/5 dark:bg-white/5 backdrop-blur-sm rounded-lg shadow-sm"
          >
            <h3 className="font-bold text-xl mb-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#2dd4a8]"></span>
              Intelligent Code Analysis
            </h3>
            <p className="text-sm text-[#555] dark:text-gray-400 font-mono leading-relaxed">
              DocGen parses your source code to deeply understand the architecture, context, and logic behind your functions. 
              By leveraging advanced language models like Qwen 2.5 Coder, we automatically generate human-readable explanations 
              so you don't have to write them manually.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="p-6 border border-[#2dd4a8]/30 bg-black/5 dark:bg-white/5 backdrop-blur-sm rounded-lg shadow-sm"
          >
            <h3 className="font-bold text-xl mb-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#2dd4a8]"></span>
              Cloud Firestore Storage
            </h3>
            <p className="text-sm text-[#555] dark:text-gray-400 font-mono leading-relaxed">
              Your generated documentation is securely synced and stored using Firebase's lightning-fast Firestore infrastructure. 
              Never lose track of a document again. Everything is instantly available across your workspace with real-time updates.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="p-6 border border-[#2dd4a8]/30 bg-black/5 dark:bg-white/5 backdrop-blur-sm rounded-lg shadow-sm"
          >
            <h3 className="font-bold text-xl mb-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#2dd4a8]"></span>
              One-Click Export
            </h3>
            <p className="text-sm text-[#555] dark:text-gray-400 font-mono leading-relaxed">
              Export your beautifully formatted Markdown documentation to PDF or DOCX formats with a single click. 
              Perfect for sharing with non-technical stakeholders, uploading to your internal wiki, or including in your final deliverables.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="p-6 border border-[#2dd4a8]/30 bg-black/5 dark:bg-white/5 backdrop-blur-sm rounded-lg shadow-sm"
          >
            <h3 className="font-bold text-xl mb-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#2dd4a8]"></span>
              Dark Mode & Themes
            </h3>
            <p className="text-sm text-[#555] dark:text-gray-400 font-mono leading-relaxed">
              Designed for developers, DocGen includes a fully crafted dark mode UI inspired by modern terminal aesthetics.
              Protect your eyes during late-night coding sessions, or switch back to the clean light mode anytime.
            </p>
          </motion.div>
          
        </div>
      </div>
    </div>
  );
}
