import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Cpu, FileText, Loader2 } from 'lucide-react';

export default function DocumentViewer({ docs, loading, outputRef }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white relative z-0">
      <div ref={outputRef} className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
        {loading && !docs && (
          <div className="flex flex-col items-center justify-center h-full animate-fadeUp">
            <Loader2 className="animate-spin text-[#2dd4a8] mb-6" size={48} strokeWidth={1.5} />
            <p className="text-lg font-medium text-[#111111] paasa-heading">Structuring insights...</p>
            <p className="text-xs text-[#999999] font-mono mt-2 uppercase tracking-widest">Please wait</p>
          </div>
        )}

        {docs ? (
          <div className="max-w-4xl mx-auto animate-fadeUp">
            <div className="bg-white rounded-2xl border border-[#dddddd] shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 border-b border-[#f0f0f0] bg-[#fafafa]">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-[#2dd4a8]" />
                  <span className="text-sm font-semibold text-[#111111] uppercase tracking-wider">Output</span>
                </div>
              </div>

              <div className="p-10 bg-white">
                <div className="prose prose-lg max-w-none text-[#333333]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-4xl font-light mb-8 pb-4 border-b border-[#f0f0f0] text-[#111111] tracking-tight" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-2xl font-medium mt-10 mb-5 text-[#111111] tracking-tight" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-8 mb-4 text-[#333333]" {...props} />,
                      p: ({ node, ...props }) => <p className="mb-6 leading-relaxed text-[15px] text-[#555555]" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-[15px] text-[#555555]" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-[15px] text-[#555555]" {...props} />,
                      li: ({ node, ...props }) => <li className="pl-2" {...props} />,
                      a: ({ node, ...props }) => <a className="text-[#2dd4a8] hover:underline font-medium text-[15px] transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                      pre: ({ node, ...props }) => (
                        <div className="relative my-8 rounded-xl overflow-hidden bg-[#fafafa] border border-[#e5e5e5] shadow-inner">
                          <div className="flex items-center px-4 py-3 bg-[#f5f5f5] border-b border-[#e5e5e5]">
                            <div className="flex gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#e74c3c] opacity-80" />
                              <div className="w-2.5 h-2.5 rounded-full bg-[#f1c40f] opacity-80" />
                              <div className="w-2.5 h-2.5 rounded-full bg-[#2dd4a8] opacity-80" />
                            </div>
                          </div>
                          <pre className="p-5 overflow-x-auto text-[13px] font-mono leading-relaxed text-[#333333]" {...props} />
                        </div>
                      ),
                      code: ({ node, inline, className, children, ...props }) => {
                        if (inline) {
                          return <code className="bg-[#fafafa] text-[#111111] border border-[#eeeeee] px-1.5 py-0.5 rounded text-[13px] font-mono font-medium" {...props}>{children}</code>;
                        }
                        return <code className="text-inherit font-mono" {...props}>{children}</code>;
                      }
                    }}
                  >
                    {docs}
                  </ReactMarkdown>

                  {loading && <span className="inline-block w-2 h-5 bg-[#2dd4a8] ml-1 animate-pulse align-middle"></span>}
                </div>
              </div>
            </div>
          </div>
        ) : !loading && (
          <div className="flex flex-col items-center justify-center h-full opacity-60">
            <Cpu size={64} className="mb-6 text-[#2dd4a8]" strokeWidth={1} />
            <h2 className="text-2xl font-light mb-3 text-[#111111] tracking-tight">Ready to Compile</h2>
            <p className="text-sm text-[#999999] font-mono uppercase tracking-widest">Awaiting input on the left</p>
          </div>
        )}
      </div>
    </div>
  );
}
