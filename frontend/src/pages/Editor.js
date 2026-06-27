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

function deckMode(deck) {
  const t = deck?.theme;
  if (t && typeof t === "object") return t.mode || "dark";
  return t || "dark";
}

export default function Editor() {
  const { id } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [status, setStatus] = useState("loading");
  const [progress, setProgress] = useState(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [chat, setChat] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [share, setShare] = useState({ isPublic: false, shareId: null });
  const [copied, setCopied] = useState(false);
  const stageRef = useRef(null);
  const msgEndRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/presentations/${id}`);
      setDeck(res.data);
      setStatus(res.data.status);
      setProgress(res.data.progress);
      setShare({ isPublic: res.data.isPublic, shareId: res.data.shareId });
    } catch (e) {
      setStatus(e?.response?.status === 404 ? "notfound" : "error");
    }
  }, [api, id]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (status !== "processing") return;
    const t = setInterval(load, 2200);
    return () => clearInterval(t);
  }, [status, load]);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [deck?.messages?.length]);

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

  const sendEdit = async () => {
    const instruction = chat.trim();
    if (instruction.length < 3 || sending) return;
    setSending(true);
    setChatError("");
    setChat("");
    try {
      const res = await api.post(`/presentations/${id}/slides/${index}/edit`, { instruction });
      setDeck(res.data);
    } catch (e) {
      setChatError(e?.response?.data?.detail || "Edit failed — try rephrasing.");
    } finally {
      setSending(false);
    }
  };

  const toggleShare = async () => {
    try {
      const res = await api.post(`/presentations/${id}/share`);
      setShare(res.data);
    } catch (e) { /* ignore */ }
  };

  const shareUrl = share.shareId ? `${window.location.origin}/present/${share.shareId}` : "";
  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const presentFullscreen = () => {
    const el = stageRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  if (status === "loading") return <div className="min-h-screen grid place-items-center text-violet-500"><Spinner size={28} /></div>;
  if (status === "processing") return <GenerationOverlay progress={progress} />;
  if (status === "notfound" || status === "error") {
    return (
      <div className="min-h-screen grid place-items-center text-center px-6">
        <div>
          <Icon name="FileX2" className="h-12 w-12 mx-auto text-muted mb-4" />
          <h2 className="font-display text-2xl text-ink">Deck not available</h2>
          <p className="text-muted mt-2">{deck?.error || "We couldn't load this presentation."}</p>
          <Button variant="secondary" onClick={() => navigate("/dashboard")} className="mt-6">Back to dashboard</Button>
        </div>
      </div>
    );
  }

  const a = getAccent(slides[index]?.accent);
  const messages = deck?.messages || [];

  return (
    <div className="h-screen flex flex-col overflow-hidden" data-testid="editor">
      {/* top bar */}
      <header className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3 border-b border-[var(--glass-border)] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate("/dashboard")} className="h-9 w-9 rounded-xl glass grid place-items-center hover:bg-[var(--surface-2)]" data-testid="editor-back">
            <Icon name="ArrowLeft" className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-base font-medium truncate max-w-[36vw] text-ink">{deck?.title}</h1>
            {deck?.subtitle && <p className="text-xs text-muted truncate max-w-[36vw]">{deck.subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShareOpen((o) => !o)} className="rounded-xl glass px-3.5 py-2 text-sm flex items-center gap-2 hover:bg-[var(--surface-2)] text-ink" data-testid="editor-share">
              <Icon name="Share2" className="h-4 w-4 text-violet-500" /> Share
            </button>
            <AnimatePresence>
              {shareOpen && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  className="absolute right-0 mt-2 w-80 rounded-2xl glass-strong p-4 z-50" data-testid="share-popover">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-ink">Public share link</span>
                    <button onClick={toggleShare} data-testid="share-toggle"
                      className={`relative h-6 w-11 rounded-full transition-colors ${share.isPublic ? "bg-violet-500" : "bg-[var(--surface-2)] border border-[var(--glass-border)]"}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${share.isPublic ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </div>
                  {share.isPublic && share.shareId ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] border border-[var(--glass-border)] px-3 py-2">
                        <input readOnly value={shareUrl} className="flex-1 bg-transparent text-xs text-muted outline-none" data-testid="share-link" />
                        <button onClick={copyLink} className="text-violet-500 hover:text-violet-400" data-testid="share-copy"><Icon name={copied ? "Check" : "Copy"} className="h-4 w-4" /></button>
                      </div>
                      <a href={shareUrl} target="_blank" rel="noreferrer" className="block text-center text-sm text-violet-500 hover:underline">Open presentation ↗</a>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Turn on to create a public, view-only link anyone can open.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={presentFullscreen} className="rounded-xl glass px-3.5 py-2 text-sm flex items-center gap-2 hover:bg-[var(--surface-2)] text-ink" data-testid="editor-present">
            <Icon name="Play" className="h-4 w-4 text-violet-500" /> Present
          </button>
        </div>
      </header>

      {/* body: chat | canvas */}
      <div className="flex flex-1 min-h-0">
        {/* chat panel */}
        <aside className="hidden md:flex w-[360px] shrink-0 flex-col border-r border-[var(--glass-border)] surface" data-testid="chat-panel">
          <div className="px-4 py-3 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2 text-sm font-medium text-ink"><Icon name="MessagesSquare" className="h-4 w-4 text-violet-500" /> AI Editor</div>
            <p className="text-xs text-muted mt-0.5">Editing <span className="text-violet-500 font-medium">slide {index + 1}</span> — switch slides to edit others.</p>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center mt-8">
                <Icon name="Sparkles" className="h-8 w-8 mx-auto text-violet-400 mb-3" />
                <p className="text-sm text-muted">Ask for changes to the current slide.<br />e.g. "make the title punchier", "add a metric", "use 3 bullets".</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "user" ? "bg-violet-500 text-white" : "glass text-ink"}`}>
                  {m.slide && <span className="block text-[10px] uppercase tracking-wider opacity-70 mb-0.5">Slide {m.slide}</span>}
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start"><div className="glass rounded-2xl px-3.5 py-2 text-sm text-muted flex items-center gap-2"><Spinner size={14} /> Re-directing slide {index + 1}…</div></div>
            )}
            <div ref={msgEndRef} />
          </div>

          {chatError && <p className="px-4 text-xs text-rose-500 mb-2">{chatError}</p>}
          <div className="p-3 border-t border-[var(--glass-border)]">
            <div className="flex items-end gap-2 rounded-2xl glass p-2">
              <textarea
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendEdit(); } }}
                rows={1}
                placeholder={`Edit slide ${index + 1}…`}
                disabled={sending}
                className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-zinc-400 outline-none max-h-28"
                data-testid="chat-input"
              />
              <button onClick={sendEdit} disabled={sending || chat.trim().length < 3} data-testid="chat-send"
                className="h-9 w-9 grid place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white disabled:opacity-40 hover:scale-105 transition-transform">
                {sending ? <Spinner size={16} /> : <Icon name="ArrowUp" className="h-4 w-4" strokeWidth={2.5} />}
              </button>
            </div>
          </div>
        </aside>

        {/* canvas + controls */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div ref={stageRef} className="flex-1 min-h-0 grid place-items-center p-4 lg:p-6" style={{ containerType: "size" }}>
            <div className="relative rounded-2xl overflow-hidden border border-[var(--glass-border)] soft-shadow"
              style={{ width: "min(100%, calc(100cqh * 16 / 9))", aspectRatio: "16 / 9" }} data-testid="slide-canvas">
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
                  {slides[index] && <SlideRenderer slide={slides[index]} mode={mode} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* controls */}
          <div className="shrink-0 pb-4 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 rounded-full glass-strong px-3 py-2" data-testid="editor-controls">
              <button onClick={() => go(index - 1)} disabled={index === 0} className="h-9 w-9 rounded-full hover:bg-[var(--surface-2)] disabled:opacity-30 flex items-center justify-center" data-testid="prev-slide">
                <Icon name="ChevronLeft" className="h-5 w-5" />
              </button>
              <button onClick={() => setPlaying((p) => !p)} className="h-11 w-11 rounded-full flex items-center justify-center text-white shadow-[0_6px_20px_rgba(139,92,246,0.4)]" style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }} data-testid="play-pause">
                <Icon name={playing ? "Pause" : "Play"} className="h-5 w-5 text-white" />
              </button>
              <button onClick={() => go(index + 1)} disabled={index === total - 1} className="h-9 w-9 rounded-full hover:bg-[var(--surface-2)] disabled:opacity-30 flex items-center justify-center" data-testid="next-slide">
                <Icon name="ChevronRight" className="h-5 w-5" />
              </button>
              <div className="px-3 text-sm text-muted font-mono" data-testid="slide-counter">{index + 1} / {total}</div>
            </div>

            <div className="flex items-center gap-2 max-w-full overflow-x-auto hide-scrollbar px-4" data-testid="thumbnail-strip">
              {slides.map((s, i) => {
                const sa = getAccent(s.accent);
                return (
                  <button key={s.id || i} onClick={() => go(i)}
                    className={`relative h-11 w-[72px] rounded-lg overflow-hidden border shrink-0 transition-all ${i === index ? "border-violet-400 scale-105" : "border-[var(--glass-border)] opacity-60 hover:opacity-100"}`}
                    style={{ background: `radial-gradient(circle at 30% 20%, ${sa.soft}, ${mode === "light" ? "#fbfbfd" : "#0A0A0E"} 70%)` }}
                    data-testid={`thumb-${i}`}>
                    <span className="absolute bottom-1 left-1.5 text-[9px] font-mono" style={{ color: mode === "light" ? "#0b0b12" : "#fff" }}>{i + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
