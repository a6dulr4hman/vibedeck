import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApi } from "../lib/api";
import { useMe } from "../lib/useMe";
import { accent as getAccent } from "../lib/accents";
import Icon from "./Icon";

const TIER_RANK = { free: 0, pro: 1, max: 2 };
const TIER_LABEL = { free: "Free", pro: "Pro", max: "Max" };

export default function ModelSelector({ value, onChange, align = "left", compact = false }) {
  const api = useApi();
  const { tier } = useMe();
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [open, setOpen] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const ref = useRef(null);

  useEffect(() => {
    api.get("/models").then((r) => setModels(r.data.models)).catch(() => {});
  }, [api]);

  useEffect(() => {
    setOpenSections({ [tier]: true });
  }, [tier]);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = models.find((m) => m.id === value) || models.find((m) => m.id === "k2-think-v2");
  const ca = getAccent(current?.accent);
  const grouped = { free: [], pro: [], max: [] };
  models.forEach((m) => grouped[m.tier]?.push(m));

  const choose = (m) => {
    const locked = TIER_RANK[m.tier] > TIER_RANK[tier];
    if (locked) { navigate("/pricing"); return; }
    onChange(m.id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="model-selector-trigger"
        className={`inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 hover:bg-white transition-colors ${compact ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm"}`}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: ca.hex }} />
        <span className="font-medium text-ink">{current?.label || "Select model"}</span>
        <Icon name="ChevronDown" className="h-4 w-4 text-zinc-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className={`absolute z-50 mt-2 w-72 rounded-2xl glass-card p-2 ${align === "right" ? "right-0" : "left-0"} bottom-full mb-2`}
            data-testid="model-selector-panel"
          >
            {["free", "pro", "max"].map((t) => {
              const locked = TIER_RANK[t] > TIER_RANK[tier];
              const isOpen = openSections[t] ?? (t === tier);
              return (
                <div key={t} className="mb-1">
                  <button
                    onClick={() => setOpenSections((s) => ({ ...s, [t]: !isOpen }))}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-black/5"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      {TIER_LABEL[t]}
                      {locked && <Icon name="Lock" className="h-3 w-3 text-zinc-400" />}
                    </span>
                    <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} className="h-3.5 w-3.5 text-zinc-400" />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        {grouped[t].map((m) => {
                          const a = getAccent(m.accent);
                          const active = m.id === value;
                          return (
                            <button
                              key={m.id}
                              onClick={() => choose(m)}
                              data-testid={`model-option-${m.id}`}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${active ? "bg-black/5" : "hover:bg-black/5"} ${locked ? "opacity-60" : ""}`}
                            >
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: a.hex }} />
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm font-medium text-ink truncate">{m.label}</span>
                                <span className="block text-[11px] text-zinc-500 truncate">{m.tagline}</span>
                              </span>
                              {locked ? <Icon name="Lock" className="h-3.5 w-3.5 text-zinc-400" /> : active ? <Icon name="Check" className="h-4 w-4 text-violet-500" /> : null}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            <button onClick={() => { setOpen(false); navigate("/pricing"); }} className="w-full mt-1 px-2.5 py-2 rounded-lg text-xs font-medium text-violet-600 hover:bg-violet-50 flex items-center gap-1.5">
              <Icon name="Sparkles" className="h-3.5 w-3.5" /> Upgrade for more models
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
