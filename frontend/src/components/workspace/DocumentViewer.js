import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, coy } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Layout, Copy, FileText, Download, Loader2 } from "lucide-react";

export default function DocumentViewer({ docs, loading, outputRef, downloadFile, copyMarkdown, theme }) {
  const isDark = theme === "dark";

  return (
    <div ref={outputRef} className="flex-1 overflow-y-auto p-8 pb-10 scroll-smooth custom-scrollbar">
      {!docs && !loading ? (
        <div className="h-full flex flex-col items-center justify-center opacity-40 text-center animate-fadeUp">
          <Layout size={64} className="mb-6 text-[#2dd4a8]" />
          <h2 className="text-3xl font-light mb-3 tracking-tight">
            Generate Professional Documentation
          </h2>
          <p className="max-w-md text-lg leading-relaxed font-mono text-sm">
            Paste your code below, and let DocGen craft comprehensive
            documentation for you.
          </p>
        </div>
      ) : (
        <div className={`max-w-4xl mx-auto bg-white dark:bg-[#0a0a0a] border ${isDark ? "border-[#2a2a2a]" : "border-[#f0f0f0]"} shadow-sm p-10 min-h-[500px] transition-colors duration-300`}>
          
          <div className={`flex justify-end gap-3 pb-4 border-b ${isDark ? "border-[#2a2a2a]" : "border-[#f0f0f0]"} mb-6`}>
            <button
              onClick={copyMarkdown}
              className="flex items-center gap-1 text-xs font-bold hover:text-[#2dd4a8] transition-colors uppercase"
              title="Copy formatted markdown text"
            >
              <Copy size={14} /> COPY MARKDOWN
            </button>
            <button
              onClick={() => downloadFile("docx")}
              className="flex items-center gap-1 text-xs font-bold hover:text-[#2dd4a8] transition-colors uppercase"
            >
              <FileText size={14} /> DOCX
            </button>
            <button
              onClick={() => downloadFile("pdf")}
              className="flex items-center gap-1 text-xs font-bold hover:text-[#2dd4a8] transition-colors uppercase"
            >
              <Download size={14} /> PDF
            </button>
          </div>

          <div className={`prose max-w-none ${isDark ? "prose-invert" : "prose-neutral"}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 font-mono text-sm" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 font-mono text-sm" {...props} />,
                h1: ({ node, ...props }) => <h1 className="text-3xl font-light mb-4 pb-2 border-b border-[#f0f0f0] dark:border-[#2a2a2a] tracking-tight" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-2xl font-light mt-8 mb-4 tracking-tight" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-6 mb-3 tracking-tight" {...props} />,
                h4: ({ node, ...props }) => <h4 className="text-lg font-bold mt-4 mb-2 tracking-tight" {...props} />,
                h5: ({ node, ...props }) => <h5 className="text-base font-bold mt-3 mb-1 uppercase tracking-wide" {...props} />,
                p: ({ node, ...props }) => <p className="mb-4 leading-relaxed text-[15px]" {...props} />,
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <div className="not-prose my-6 border border-[#f0f0f0] dark:border-[#2a2a2a]">
                      <SyntaxHighlighter
                        style={isDark ? vscDarkPlus : coy}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, fontSize: "13px" }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className={`px-1 py-0.5 font-mono text-[13px] ${isDark ? "bg-[#1a1a1a]" : "bg-[#f5f5f5]"}`} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {docs}
            </ReactMarkdown>

            {loading && (
              <div className="flex items-center gap-2 mt-8 text-[#2dd4a8]">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm font-mono animate-pulse">Generating...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
