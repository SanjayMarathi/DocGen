import { motion } from "framer-motion";
import { X, Plus, Trash2, LogOut } from "lucide-react";
import { Logo } from "./AuthPage";

export default function Sidebar({
  history,
  currentDocId,
  disabled,
  username,
  connection,
  onSelect,
  onDelete,
  onNew,
  onClose,
  onLogout,
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.2 }}
      className="glass-paper fixed inset-y-3 left-3 z-40 flex w-[min(320px,calc(100vw-1.5rem))] flex-col rounded-2xl md:static md:inset-auto md:z-auto md:w-[290px] md:flex-shrink-0"
    >
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="text-lg font-bold tracking-tight">DocGen</span>
        </div>
        <button type="button" onClick={onClose} className="chip !min-w-8 !h-8 !px-0" aria-label="Close sidebar">
          <X size={16} />
        </button>
      </div>

      <div className="px-4 pb-3">
        <button type="button" onClick={onNew} disabled={disabled} className="chip chip-accent !h-10 w-full !text-sm">
          <Plus size={16} /> New document
        </button>
      </div>

      <div className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink/50">History</div>
      <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-3 pb-3" aria-label="Document history">
        {history.length === 0 && (
          <p className="px-2 py-4 text-xs leading-relaxed text-ink/60">
            Nothing here yet. Generate your first document and it will show up here.
          </p>
        )}
        {history.map((doc) => {
          const active = currentDocId === doc.id;
          return (
            <div
              key={doc.id}
              role="button"
              tabIndex={0}
              aria-current={active ? "true" : undefined}
              onClick={() => !disabled && onSelect(doc)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !disabled) {
                  e.preventDefault();
                  onSelect(doc);
                }
              }}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                active ? "border-accent bg-accent/25" : "border-transparent hover:bg-ink/5"
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{doc.topic || "Untitled doc"}</div>
                <div className="mt-0.5 text-[11px] text-ink/60">
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => onDelete(doc.id, e)}
                className="rounded p-1.5 text-ink/50 opacity-100 transition hover:bg-red-500/10 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                aria-label={`Delete ${doc.topic || "document"}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t p-4" style={{ borderColor: "var(--line)" }}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink">
            {username?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{username}</div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink/60">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connection === "online" ? "bg-emerald-500" : connection === "offline" ? "bg-red-500" : "bg-amber-400"
                }`}
              />
              {connection === "online" ? "Connected" : connection === "offline" ? "Offline" : "Checking"}
            </div>
          </div>
        </div>
        <button type="button" onClick={onLogout} className="chip !min-w-9 !px-0 hover:!text-red-600" aria-label="Log out" title="Log out">
          <LogOut size={16} />
        </button>
      </div>
    </motion.aside>
  );
}
