import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { accent as getAccent } from "../lib/accents";
import SlideRenderer from "../components/SlideRenderer";
import Icon from "../components/Icon";
import { Spinner } from "../components/ui/Spinner";

const BASE = process.env.REACT_APP_BACKEND_URL;

function deckMode(deck) {
  const t = deck?.theme;
  if (t && typeof t === "object") return t.mode || "dark";
  return t || "dark";
}

export default function Present() {
  const { shareId } = useParams();
  const [deck, setDeck] = useState(null);
  const [status, setStatus] = useState("loading");
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [playing, setPlaying] = useState(false);
  const stageRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${BASE}/api/public/presentations/${shareId}`);
        setDeck(res.data);
        setStatus("ready");
      } catch (e) {
        setStatus("notfound");
      }
    })();
  }, [shareId]);

  const slides = deck?.slides || [];
  const total = slides.length;
  const mode = deckMode(deck);

  const go = useCallback((next) => {
    setDirection(next > index ? 1 : -1);
    setIndex(Math.max(0, Math.min(total - 1, next)));
  }, [index, total]);

  useEffect(() => {
    if (!playing || total === 0) return;
    const t = setTimeout(() => { if (index >= total - 1) setPlaying(false); else go(index + 1); }, 6500);
    return () => clearTimeout(t);
  }, [playing, index, total, go]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(index + 1); }
      else if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  if (status === "loading") return <div className="min-h-screen grid place-items-center text-violet-500"><Spinner size={28} /></div>;
  if (status === "notfound") {
    return (
      <div className="min-h-screen grid place-items-center text-center px-6">
        <div>
          <Icon name="LinkOff" className="h-12 w-12 mx-auto text-muted mb-4" />
          <h2 className="font-display text-2xl text-ink">Presentation unavailable</h2>
          <p className="text-muted mt-2">This share link is invalid or has been turned off.</p>
        </div>
      </div>
    );
  }

  const a = getAccent(slides[index]?.accent);

  return (
    <div className="h-screen flex flex-col overflow-hidden" data-testid="present">
      <header className="flex items-center justify-between px-4 lg:px-6 py-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center"><Icon name="Sparkles" className="h-4 w-4 text-white" /></div>
          <h1 className="font-display text-base font-medium truncate text-ink">{deck?.title}</h1>
        </div>
        <button onClick={toggleFullscreen} className="h-9 w-9 rounded-xl glass grid place-items-center hover:bg-[var(--surface-2)]" data-testid="present-fullscreen">
          <Icon name="Maximize" className="h-5 w-5" />
        </button>
      </header>

      <div ref={stageRef} className="flex-1 min-h-0 grid place-items-center px-4 lg:px-6" style={{ containerType: "size" }}>
        <div className="relative rounded-2xl overflow-hidden border border-[var(--glass-border)] soft-shadow"
          style={{ width: "min(100%, calc(100cqh * 16 / 9))", aspectRatio: "16 / 9" }} data-testid="present-canvas">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={index} custom={direction}
              initial={{ opacity: 0, x: direction * 40, scale: 0.99 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: direction * -40, scale: 0.99 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0">
              {slides[index] && <SlideRenderer slide={slides[index]} mode={mode} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 py-4 flex items-center justify-center">
        <div className="flex items-center gap-2 rounded-full glass-strong px-3 py-2" data-testid="present-controls">
          <button onClick={() => go(index - 1)} disabled={index === 0} className="h-9 w-9 rounded-full hover:bg-[var(--surface-2)] disabled:opacity-30 flex items-center justify-center" data-testid="present-prev">
            <Icon name="ChevronLeft" className="h-5 w-5" />
          </button>
          <button onClick={() => setPlaying((p) => !p)} className="h-11 w-11 rounded-full flex items-center justify-center text-white shadow-[0_6px_20px_rgba(139,92,246,0.4)]" style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }} data-testid="present-play">
            <Icon name={playing ? "Pause" : "Play"} className="h-5 w-5 text-white" />
          </button>
          <button onClick={() => go(index + 1)} disabled={index === total - 1} className="h-9 w-9 rounded-full hover:bg-[var(--surface-2)] disabled:opacity-30 flex items-center justify-center" data-testid="present-next">
            <Icon name="ChevronRight" className="h-5 w-5" />
          </button>
          <div className="px-3 text-sm text-muted font-mono" data-testid="present-counter">{index + 1} / {total}</div>
        </div>
      </div>
    </div>
  );
}
