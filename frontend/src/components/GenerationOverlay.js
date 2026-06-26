import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "./effects/Backgrounds";
import Icon from "./Icon";

const STEPS = [
  { icon: "FileText", label: "Reading source material" },
  { icon: "Brain", label: "Choreographing the narrative arc" },
  { icon: "Palette", label: "Designing slides & art direction" },
  { icon: "Sparkles", label: "Resolving icons & final polish" },
];

export default function GenerationOverlay({ progress }) {
  const [tick, setTick] = useState(0);
  const serverStep = progress?.step;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % STEPS.length), 2600);
    return () => clearInterval(id);
  }, []);

  const active = serverStep ? Math.min(serverStep - 1, STEPS.length - 1) : tick;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/90 backdrop-blur-xl" data-testid="generation-overlay">
      <Sparkles count={60} />
      <div className="relative z-10 w-full max-w-lg px-8 text-center">
        <div className="mx-auto mb-8 relative h-24 w-24">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 blur-2xl opacity-60 animate-pulse" />
          <div className="absolute inset-0 rounded-3xl glass flex items-center justify-center animate-floaty">
            <Icon name="Wand2" className="h-10 w-10 text-violet-300" />
          </div>
        </div>

        <h2 className="font-display text-3xl font-light text-gradient">The Director is at work</h2>
        <p className="text-zinc-400 mt-2 text-sm">Turning your document into a cinematic 16:9 deck</p>

        <div className="mt-10 space-y-3 text-left">
          {STEPS.map((s, i) => {
            const done = i < active;
            const current = i === active;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-500 ${
                  current ? "glass" : "opacity-50"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                    done
                      ? "bg-emerald-500/20 text-emerald-300"
                      : current
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {done ? <Icon name="Check" className="h-5 w-5" /> : <Icon name={s.icon} className="h-5 w-5" />}
                </div>
                <span className={`text-sm ${current ? "text-white" : "text-zinc-400"}`}>{s.label}</span>
                {current && (
                  <span className="ml-auto inline-block h-4 w-4 rounded-full border-2 border-violet-300/30 border-t-violet-300 animate-spin" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
          <AnimatePresence>
            <motion.div
              key={active}
              initial={{ width: "10%" }}
              animate={{ width: `${((active + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
