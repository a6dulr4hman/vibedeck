import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useVibeAuth } from "../lib/auth";
import { useGenerate, PENDING_KEY } from "../lib/useGenerate";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import HeroPrompt from "../components/HeroPrompt";
import Icon from "../components/Icon";

const SUGGESTIONS = [
  "A Series A pitch for an AI logistics startup",
  "Q4 business review with key metrics",
  "Product launch for a smart home device",
  "Climate tech research summary",
];

const FEATURES = [
  { icon: "FileText", title: "PDF → Deck", text: "Drop a document; the Director extracts the story and discards filler." },
  { icon: "Brain", title: "Reasoning Director", text: "K2 Think choreographs a Hook → Problem → Solution → Proof arc." },
  { icon: "Clapperboard", title: "Cinematic 16:9", text: "Real MagicUI & Aceternity components animate every slide." },
];

export default function Landing() {
  const { isSignedIn, isLoaded } = useVibeAuth();
  const { startScratch } = useGenerate();
  const navigate = useNavigate();
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    localStorage.removeItem(PENDING_KEY);
    try {
      const { topic, model } = JSON.parse(raw);
      if (topic && topic.trim().length >= 4) {
        setContinuing(true);
        startScratch(topic, model).then((id) => navigate(`/p/${id}`)).catch(() => setContinuing(false));
      }
    } catch (e) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="hero-glow" />
      <Navbar />

      <section className="relative mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm text-zinc-600 mb-8">
          <span className="h-2 w-2 rounded-full bg-violet-500" /> The Autonomous Presentation Director
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-5xl sm:text-6xl lg:text-[68px] font-semibold leading-[1.03] tracking-tight text-ink">
          Transform your ideas<br />into <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">cinematic stories</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-zinc-500 text-lg max-w-xl mx-auto mt-6">
          Describe a topic or drop a PDF. VibeDeck directs an animated, 16:9 presentation in seconds.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-10">
          {continuing ? (
            <div className="glass-card rounded-3xl p-10 max-w-2xl mx-auto soft-shadow">
              <Icon name="Sparkles" className="h-8 w-8 mx-auto text-violet-500 animate-pulse" />
              <p className="mt-3 text-ink font-medium">Picking up where you left off…</p>
            </div>
          ) : (
            <HeroPrompt />
          )}
        </motion.div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {SUGGESTIONS.map((s, i) => (
            <span key={i} className="text-xs text-zinc-500 rounded-full border border-black/10 bg-white/60 px-3 py-1.5">{s}</span>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-card rounded-3xl p-7 text-left hover:-translate-y-1 transition-transform">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 border border-black/5 flex items-center justify-center mb-4">
                <Icon name={f.icon} className="h-5 w-5 text-violet-600" />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink">{f.title}</h3>
              <p className="text-zinc-500 mt-2 leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
