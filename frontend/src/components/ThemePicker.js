import { TONES, PALETTES } from "../lib/constants";
import Icon from "./Icon";

// Controlled deck-style picker: tone + color palette + light/dark slides.
export default function ThemePicker({ value, onChange, compact = false }) {
  const v = value || { tone: "formal", palette: "violet", mode: "dark" };
  const set = (patch) => onChange({ ...v, ...patch });

  return (
    <div className="space-y-5" data-testid="theme-picker">
      {/* tone */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted mb-2.5">Tone</div>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => {
            const active = v.tone === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => set({ tone: t.id })}
                data-testid={`tone-${t.id}`}
                className={`rounded-xl px-3.5 py-2 text-sm border transition-all ${
                  active
                    ? "border-violet-400 bg-violet-500/10 text-ink"
                    : "border-[var(--glass-border)] text-muted hover:text-ink hover:bg-[var(--surface-2)]"
                }`}
                title={t.desc}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* palette */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted mb-2.5">Color theme</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PALETTES.map((p) => {
            const active = v.palette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => set({ palette: p.id })}
                data-testid={`palette-${p.id}`}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 border transition-all ${
                  active ? "border-violet-400 bg-violet-500/10" : "border-[var(--glass-border)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span className="flex -space-x-1.5">
                  {p.swatch.map((c, i) => (
                    <span key={i} className="h-4 w-4 rounded-full ring-2 ring-[var(--surface)]" style={{ background: c }} />
                  ))}
                </span>
                <span className={`text-sm ${active ? "text-ink font-medium" : "text-muted"}`}>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* mode */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted mb-2.5">Slide style</div>
        <div className="inline-flex rounded-xl border border-[var(--glass-border)] p-1 bg-[var(--surface-2)]">
          {[
            { id: "dark", label: "Dark", icon: "Moon" },
            { id: "light", label: "Light", icon: "Sun" },
          ].map((m) => {
            const active = v.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => set({ mode: m.id })}
                data-testid={`slide-mode-${m.id}`}
                className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm transition-all ${
                  active ? "bg-[var(--surface)] text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                <Icon name={m.icon} className="h-4 w-4" /> {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
