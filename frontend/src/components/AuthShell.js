import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Icon from "./Icon";

const HIGHLIGHTS = [
  { icon: "FileText", text: "Drop a PDF — get a cinematic deck" },
  { icon: "Brain", text: "K2 Think directs the narrative arc" },
  { icon: "Clapperboard", text: "Animated, strict 16:9 canvases" },
];

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen relative flex">
      <div className="hero-glow" />

      <div className="hidden lg:flex flex-col justify-between w-[46%] p-14 relative">
        <Link to="/" className="flex items-center gap-3" data-testid="auth-logo">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_8px_24px_rgba(139,92,246,0.35)]">
            <Icon name="Sparkles" className="h-6 w-6 text-white" />
          </div>
          <span className="font-display text-2xl font-semibold text-ink">VibeDeck</span>
        </Link>

        <div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="font-display text-5xl font-semibold leading-tight max-w-md text-ink">
            Your autonomous <span className="bg-gradient-to-r from-violet-600 to-orange-400 bg-clip-text text-transparent">presentation director</span>.
          </motion.h2>
          <div className="mt-10 space-y-4">
            {HIGHLIGHTS.map((h, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="flex items-center gap-3 text-zinc-600">
                <div className="h-10 w-10 rounded-xl glass flex items-center justify-center"><Icon name={h.icon} className="h-5 w-5 text-violet-600" /></div>
                <span>{h.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-zinc-400 text-sm">K2 Think · MiniMax · DeepSeek · Gemini · Claude · GPT</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md glass-card rounded-3xl p-8 sm:p-10 soft-shadow">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Icon name="Sparkles" className="h-5 w-5 text-white" /></div>
            <span className="font-display text-xl font-semibold text-ink">VibeDeck</span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="text-zinc-500 mt-2 text-sm">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-zinc-500">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}
