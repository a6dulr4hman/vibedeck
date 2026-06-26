import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApi } from "../lib/api";
import { accent as getAccent } from "../lib/accents";
import SlideRenderer from "../components/SlideRenderer";
import GenerationOverlay from "../components/GenerationOverlay";
import Icon from "../components/Icon";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";

const AUTOPLAY_MS = 6500;

export default function Viewer() {
  const { id } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [status, setStatus] = useState("loading");
  const [progress, setProgress] = useState(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const frameRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/presentations/${id}`);
      setDeck(res.data);
      setStatus(res.data.status);
      setProgress(res.data.progress);
    } catch (e) {
      setStatus(e?.response?.status === 404 ? "notfound" : "error");
    }
  }, [api, id]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // poll while processing
  useEffect(() => {
    if (status !== "processing") return;
    const t = setInterval(load, 2200);
    return () => clearInterval(t);
  }, [status, load]);

  const slides = deck?.slides || [];
  const total = slides.length;

  const go = useCallback(
    (next) => {
      setDirection(next > index ? 1 : -1);
      setIndex(Math.max(0, Math.min(total - 1, next)));
    },
    [index, total]
  );

  // autoplay
  useEffect(() => {
    if (!playing || total === 0) return;
    const t = setTimeout(() => {
      if (index >= total - 1) setPlaying(false);
      else go(index + 1);
    }, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, index, total, go]);

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (editOpen) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft") {
        go(index - 1);
      } else if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, editOpen]);

  const toggleFullscreen = () => {
    const el = frameRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const runEdit = async () => {
    if (instruction.trim().length < 3) return;
    setEditing(true);
    setEditError("");
    try {
      const res = await api.post(`/presentations/${id}/edit`, { instruction });
      setDeck(res.data);
      setIndex((i) => Math.min(i, (res.data.slides?.length || 1) - 1));
      setEditOpen(false);
      setInstruction("");
    } catch (e) {
      setEditError(e?.response?.data?.detail || "Edit failed, try rephrasing.");
    } finally {
      setEditing(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-900">
        <Spinner size={28} />
      </div>
    );
  }
  if (status === "processing") {
    return <GenerationOverlay progress={progress} />;
  }
  if (status === "notfound" || status === "error") {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-900 text-center px-6">
        <div>
          <Icon name="FileX2" className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
          <h2 className="font-display text-2xl">Deck not available</h2>
          <p className="text-zinc-400 mt-2">{deck?.error || "We couldn't load this presentation."}</p>
          <Button variant="secondary" onClick={() => navigate("/dashboard")} className="mt-6">
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const a = getAccent(slides[index]?.accent);

  return (
    <div className="min-h-screen flex flex-col bg-ink-900" data-testid="viewer">
      {/* top bar */}
      <div className="flex items-center justify-between px-5 lg:px-8 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate("/dashboard")} className="h-10 w-10 rounded-xl glass flex items-center justify-center hover:bg-white/10" data-testid="viewer-back">
            <Icon name="ArrowLeft" className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-medium truncate max-w-[40vw]">{deck?.title}</h1>
            {deck?.subtitle && <p className="text-xs text-zinc-500 truncate max-w-[40vw]">{deck.subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditOpen(true)} className="rounded-xl glass px-3.5 py-2 text-sm flex items-center gap-2 hover:bg-white/10" data-testid="viewer-edit">
            <Icon name="Wand2" className="h-4 w-4 text-violet-300" /> Edit with AI
          </button>
          <button onClick={toggleFullscreen} className="h-10 w-10 rounded-xl glass flex items-center justify-center hover:bg-white/10" data-testid="viewer-fullscreen">
            <Icon name="Maximize" className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* progress bar */}
      <div className="px-5 lg:px-8">
        <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${a.from}, ${a.to})` }}
            animate={{ width: `${((index + 1) / Math.max(total, 1)) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* canvas */}
      <div ref={frameRef} className="flex-1 grid place-items-center px-5 lg:px-8 py-5 bg-ink-900">
        <div
          className="relative rounded-2xl overflow-hidden shadow-[0_0_90px_rgba(139,92,246,0.18)] border border-white/10"
          style={{ width: "min(95vw, calc((100vh - 230px) * 16 / 9))", aspectRatio: "16 / 9" }}
          data-testid="slide-canvas"
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40, scale: 0.99 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: direction * -40, scale: 0.99 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              {slides[index] && <SlideRenderer slide={slides[index]} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-col items-center gap-4 pb-6">
        <div className="flex items-center gap-2 rounded-full glass-strong px-3 py-2" data-testid="viewer-controls">
          <button onClick={() => go(index - 1)} disabled={index === 0} className="h-10 w-10 rounded-full hover:bg-white/10 disabled:opacity-30 flex items-center justify-center" data-testid="prev-slide">
            <Icon name="ChevronLeft" className="h-5 w-5" />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-[0_6px_20px_rgba(139,92,246,0.4)] hover:scale-105 transition-transform"
            data-testid="play-pause"
          >
            <Icon name={playing ? "Pause" : "Play"} className="h-5 w-5 text-white" />
          </button>
          <button onClick={() => go(index + 1)} disabled={index === total - 1} className="h-10 w-10 rounded-full hover:bg-white/10 disabled:opacity-30 flex items-center justify-center" data-testid="next-slide">
            <Icon name="ChevronRight" className="h-5 w-5" />
          </button>
          <div className="px-3 text-sm text-zinc-400 font-mono" data-testid="slide-counter">
            {index + 1} / {total}
          </div>
        </div>

        {/* thumbnail strip */}
        <div className="flex items-center gap-2 max-w-full overflow-x-auto hide-scrollbar px-4" data-testid="thumbnail-strip">
          {slides.map((s, i) => {
            const sa = getAccent(s.accent);
            return (
              <button
                key={s.id || i}
                onClick={() => go(i)}
                className={`relative h-12 w-20 rounded-lg overflow-hidden border shrink-0 transition-all ${
                  i === index ? "border-white/60 scale-105" : "border-white/10 opacity-60 hover:opacity-100"
                }`}
                style={{ background: `radial-gradient(circle at 30% 20%, ${sa.soft}, #0A0A0E 70%)` }}
                data-testid={`thumb-${i}`}
              >
                <span className="absolute bottom-1 left-1.5 text-[9px] text-white/70 font-mono">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* edit modal */}
      <AnimatePresence>
        {editOpen && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !editing && setEditOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              className="relative w-full max-w-lg rounded-3xl glass-strong p-7"
            >
              <h2 className="font-display text-2xl font-light mb-1">Edit with AI</h2>
              <p className="text-zinc-400 text-sm mb-5">Tell the Director what to change — it re-renders the whole deck.</p>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={4}
                disabled={editing}
                placeholder="e.g. Make slide 3 a bento grid, add a metrics slide about ROI, use a darker emerald theme."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                data-testid="edit-instruction-input"
              />
              {editError && <p className="text-rose-300 text-sm mt-3">{editError}</p>}
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={editing} className="flex-1">Cancel</Button>
                <Button variant="magic" onClick={runEdit} disabled={editing} className="flex-1" data-testid="confirm-edit-button">
                  {editing ? <Spinner size={18} /> : <><Icon name="Sparkles" className="h-4 w-4" /> Apply</>}
                </Button>
              </div>
              {editing && <p className="text-xs text-zinc-500 mt-3 text-center">The Director is rethinking your deck — this can take up to a minute.</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
