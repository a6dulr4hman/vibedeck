export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full bg-[var(--surface)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-ink placeholder:text-zinc-400 outline-none transition-all duration-200 focus:ring-2 focus:ring-violet-400/40 focus:border-violet-300 ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children, htmlFor }) {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
