import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useVibeAuth } from "../lib/auth";
import { PageAmbience } from "../components/effects/Backgrounds";
import { Button } from "../components/ui/Button";
import Icon from "../components/Icon";

const FEATURES = [
  { icon: "FileText", title: "PDF → Deck", text: "Drop any document. VibeDeck extracts the story and discards the filler." },
  { icon: "Brain", title: "K2 Think Director", text: "A reasoning model choreographs a Hook → Problem → Solution → Proof arc." },
  { icon: "Clapperboard", title: "Cinematic 16:9", text: "Aurora, meteors, sparkles & number tickers on a strict aspect-video canvas." },
  { icon: "LayoutGrid", title: "11 smart layouts", text: "Covers, metrics, bento, timelines, comparisons — auto-matched to your content." },
  { icon: "Cpu", title: "Multi-LLM router", text: "Switch between K2, Gemini, Claude, DeepSeek & Nemotron per deck." },
  { icon: "Wand2", title: "Edit in plain English", text: "“Make slide 3 darker, swap the timeline for a bento grid.” Done." },
];

export default function Landing() {
  const { isSignedIn } = useVibeAuth();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <PageAmbience accent="violet" meteors />

      {/* nav */}
      <nav className="mx-auto max-w-7xl px-6 lg:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-[0_4px_20px_rgba(139,92,246,0.4)]">
            <Icon name="Sparkles" className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-medium">VibeDeck</span>
        </div>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <Button as={Link} to="/dashboard" variant="secondary" data-testid="landing-dashboard">
              Open dashboard
            </Button>
          ) : (
            <>
              <Button as={Link} to="/sign-in" variant="ghost" data-testid="landing-sign-in">
                Sign in
              </Button>
              <Button as={Link} to="/sign-up" variant="magic" data-testid="landing-sign-up">
                Get started
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* hero */}
      <section className="mx-auto max-w-5xl px-6 text-center pt-20 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-zinc-300 mb-8"
        >
          <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
          The Autonomous Presentation Director
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.04] tracking-tighter"
        >
          Turn dense PDFs into <br />
          <span className="text-gradient">cinematic, animated decks.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto mt-7"
        >
          VibeDeck acts as your art director and choreographer — ingesting documents and stitching
          high-impact, interactive 16:9 presentations in seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex items-center justify-center gap-4 mt-10"
        >
          <Button as={Link} to={isSignedIn ? "/dashboard" : "/sign-up"} variant="magic" className="text-base px-8 py-4" data-testid="hero-cta">
            <Icon name="Upload" className="h-5 w-5" />
            {isSignedIn ? "Open dashboard" : "Start directing — free"}
          </Button>
          <Button as="a" href="#features" variant="secondary" className="text-base px-8 py-4">
            See how it works
          </Button>
        </motion.div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-7xl px-6 lg:px-10 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="rounded-3xl glass p-7 hover:bg-white/[0.07] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-400/20 border border-white/10 flex items-center justify-center mb-5">
                <Icon name={f.icon} className="h-6 w-6 text-violet-200" />
              </div>
              <h3 className="font-display text-xl font-medium">{f.title}</h3>
              <p className="text-zinc-400 mt-2 leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-zinc-600 text-sm">
        VibeDeck · Powered by K2 Think v2, Gemini, Claude, DeepSeek & Nemotron
      </footer>
    </div>
  );
}
