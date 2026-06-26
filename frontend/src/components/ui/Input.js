export function Input({ className = "", label, ...props }) {
  return (
    <input
      className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition-all duration-200 focus:ring-2 focus:ring-violet-500/50 focus:border-transparent ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children, htmlFor }) {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
