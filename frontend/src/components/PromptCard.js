import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Plus, Zap, Mic, ArrowRight, Square } from "lucide-react";

const ACCEPT =
  ".py,.js,.jsx,.ts,.tsx,.java,.c,.h,.cpp,.hpp,.cs,.go,.rs,.rb,.php,.kt,.swift,.sql,.sh,.html,.css,.json,.yml,.yaml,.md,.txt";
const MAX_FILE_BYTES = 200 * 1024;

const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * The glass "Prompt" card: [+ upload] [yellow quick-mode]  ...  [mic] [submit/stop].
 * `docked` shrinks it to a bottom bar once a document is on screen.
 */
export default function PromptCard({
  value,
  onChange,
  onSubmit,
  onStop,
  loading,
  quick,
  onToggleQuick,
  docked,
}) {
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState("");

  // Auto-grow the textarea up to a cap.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, docked ? 160 : 260)}px`;
  }, [value, docked]);

  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setNotice("File is too large (max 200 KB).");
      return;
    }
    setNotice("");
    onChange(await file.text());
  };

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    const base = value ? `${value.replace(/\s+$/, "")} ` : "";
    rec.onresult = (ev) => {
      let transcript = "";
      for (let i = 0; i < ev.results.length; i++) transcript += ev.results[i][0].transcript;
      onChange(base + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!loading) onSubmit();
    }
  };

  return (
    <div className="w-full">
      <div
        className={`glass rounded-xl mx-auto w-full ${
          docked ? "max-w-3xl p-3" : "max-w-xl p-4"
        }`}
      >
        {!docked && (
          <>
            <h2 className="text-sm font-semibold">Prompt</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink/70">
              Paste your code or type a topic, or upload a file. DocGen turns it into
              structured, exportable documentation in seconds.
            </p>
          </>
        )}

        <label htmlFor="prompt-input" className="sr-only">
          Code or topic to document
        </label>
        <textarea
          id="prompt-input"
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading}
          rows={docked ? 2 : 4}
          spellCheck={false}
          placeholder={docked ? "Paste more code or type another topic..." : "Paste code or type a topic..."}
          className={`w-full resize-none bg-transparent outline-none placeholder:text-ink/40 disabled:opacity-60 ${
            docked ? "mb-2" : "mt-3 mb-3"
          } ${value ? "font-mono text-[13px]" : "text-sm"}`}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="chip" title="Upload a file" aria-label="Upload a file">
              <Plus size={16} />
              <input type="file" accept={ACCEPT} className="sr-only" onChange={handleFile} disabled={loading} />
            </label>

            <button
              type="button"
              onClick={onToggleQuick}
              aria-pressed={quick}
              title={quick ? "Quick mode: concise docs, fastest response" : "Detailed mode: longer, more thorough docs"}
              aria-label="Toggle quick mode"
              className={`chip ${quick ? "chip-accent" : ""}`}
            >
              <Zap size={16} fill={quick ? "currentColor" : "none"} />
              <span className={docked ? "hidden sm:inline" : ""}>{quick ? "Quick" : "Detailed"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMic}
              disabled={!SpeechRecognition || loading}
              title={SpeechRecognition ? (listening ? "Stop dictation" : "Dictate with your voice") : "Voice input isn't supported in this browser"}
              aria-label="Voice input"
              aria-pressed={listening}
              className="chip relative"
            >
              <Mic size={16} className={listening ? "text-red-600" : ""} />
              {listening && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              )}
            </button>

            {loading ? (
              <button type="button" onClick={onStop} title="Stop generating" aria-label="Stop generating" className="chip">
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!value.trim()}
                title="Generate documentation (Ctrl+Enter)"
                aria-label="Generate documentation"
                className="chip"
              >
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-2 max-w-xl text-center text-[11px] text-ink/60" aria-live="polite">
        {notice || (docked ? "" : `${quick ? "Quick mode on" : "Detailed mode"} · Ctrl + Enter to generate`)}
      </p>
    </div>
  );
}
