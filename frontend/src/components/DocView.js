import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";
import { Copy, Check, FileText, Download, AlertTriangle } from "lucide-react";

// PrismLight only bundles the languages we register (the full build ships ~300).
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import ruby from "react-syntax-highlighter/dist/esm/languages/prism/ruby";
import php from "react-syntax-highlighter/dist/esm/languages/prism/php";
import kotlin from "react-syntax-highlighter/dist/esm/languages/prism/kotlin";
import swift from "react-syntax-highlighter/dist/esm/languages/prism/swift";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import powershell from "react-syntax-highlighter/dist/esm/languages/prism/powershell";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import diff from "react-syntax-highlighter/dist/esm/languages/prism/diff";
import docker from "react-syntax-highlighter/dist/esm/languages/prism/docker";

const LANGUAGES = {
  python, javascript, jsx, typescript, tsx, java, c, cpp, csharp, go, rust, ruby, php,
  kotlin, swift, sql, bash, powershell, json, yaml, css, markup, markdown, diff, docker,
};
Object.entries(LANGUAGES).forEach(([name, grammar]) => SyntaxHighlighter.registerLanguage(name, grammar));

const ALIASES = {
  py: "python", js: "javascript", ts: "typescript", sh: "bash", shell: "bash", zsh: "bash",
  html: "markup", xml: "markup", yml: "yaml", "c++": "cpp", "c#": "csharp", cs: "csharp",
  rs: "rust", rb: "ruby", ps1: "powershell", md: "markdown", dockerfile: "docker",
};
const resolveLanguage = (lang) => {
  const key = (lang || "").toLowerCase();
  const name = ALIASES[key] || key;
  return LANGUAGES[name] ? name : "text";
};

function CopyButton({ text, label = "Copy", className = "" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked - nothing useful to do */
    }
  };
  return (
    <button type="button" onClick={copy} className={className || "chip"} aria-label={label}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

function CodeBlock({ language, code, isDark }) {
  return (
    <div className="codeblock">
      <div className="flex items-center justify-between border-b px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/60" style={{ borderColor: "var(--line)" }}>
        <span>{language === "text" ? "code" : language}</span>
        <CopyButton text={code} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-ink/10" />
      </div>
      <SyntaxHighlighter
        style={isDark ? vscDarkPlus : oneLight}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, background: "transparent", padding: "0.9rem 1rem" }}
        codeTagProps={{ style: { background: "transparent" } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// Memoised: while streaming, the parent re-renders often but the markdown only
// needs re-parsing when the text (or theme) actually changes.
const MarkdownBody = memo(function MarkdownBody({ text, isDark }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node, children, ...props }) => (
          <a target="_blank" rel="noreferrer noopener" {...props}>
            {children}
          </a>
        ),
        table: ({ node, ...props }) => (
          <div className="table-wrap">
            <table {...props} />
          </div>
        ),
        pre: ({ children }) => <>{children}</>,
        code({ node, className, children, ...props }) {
          const source = String(children);
          const match = /language-([\w+#-]+)/.exec(className || "");
          const isBlock = Boolean(match) || source.includes("\n");
          if (!isBlock) {
            return (
              <code className="inline-code" {...props}>
                {children}
              </code>
            );
          }
          return <CodeBlock language={resolveLanguage(match?.[1])} code={source.replace(/\n$/, "")} isDark={isDark} />;
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
});

export default function DocView({ text, loading, error, isDark, onDownload }) {
  const hasText = Boolean(text);

  return (
    <article className="glass-paper animate-rise mx-auto w-full max-w-4xl rounded-2xl p-5 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2 border-b pb-4" style={{ borderColor: "var(--line)" }}>
        <CopyButton text={text} />
        <button type="button" className="chip" onClick={() => onDownload("docx")} disabled={!hasText || loading}>
          <FileText size={14} /> DOCX
        </button>
        <button type="button" className="chip" onClick={() => onDownload("pdf")} disabled={!hasText || loading}>
          <Download size={14} /> PDF
        </button>
      </div>

      {!hasText && loading && (
        <div className="flex items-center gap-3 py-6 text-sm text-ink/70" role="status">
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-accent animate-dot-1 ring-1 ring-ink/20" />
            <span className="h-2 w-2 rounded-full bg-accent animate-dot-2 ring-1 ring-ink/20" />
            <span className="h-2 w-2 rounded-full bg-accent animate-dot-3 ring-1 ring-ink/20" />
          </span>
          Reading your input...
        </div>
      )}

      {hasText && (
        <div className="doc">
          <MarkdownBody text={text} isDark={isDark} />
        </div>
      )}

      {hasText && loading && (
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-ink/60" role="status">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent ring-1 ring-ink/20" />
          Generating...
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </article>
  );
}
