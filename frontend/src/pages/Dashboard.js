import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApi } from "../lib/api";
import { accent as getAccent } from "../lib/accents";
import Navbar from "../components/Navbar";
import Icon from "../components/Icon";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import GenerationOverlay from "../components/GenerationOverlay";
import { PageAmbience } from "../components/effects/Backgrounds";

function ModelSelector({ models, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2.5" data-testid="llm-selector">
      {models.map((m) => {
        const a = getAccent(m.accent);
        const active = value === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            data-testid={`llm-option-${m.id}`}
            className={`group flex items-center gap-2.5 rounded-xl px-4 py-2.5 border transition-all duration-200 ${
              active ? "bg-white/10 border-white/25" : "glass hover:bg-white/[0.07]"
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: a.hex, boxShadow: active ? `0 0 10px ${a.hex}` : "none" }}
            />
            <span className={`text-sm font-medium ${active ? "text-white" : "text-zinc-300"}`}>{m.label}</span>
            {m.default && <span className="text-[10px] uppercase tracking-wider text-zinc-500">default</span>}
          </button>
        );
      })}
    </div>
  );
}

function DeckCard({ p, onOpen, onDelete }) {
  const a = getAccent(p.accent);
  const statusColor = { ready: "#10B981", processing: "#F59E0B", failed: "#EF4444" }[p.status] || "#71717a";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-3xl glass overflow-hidden hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={() => onOpen(p)}
      data-testid={`deck-card-${p.id}`}
    >
      {/* thumbnail */}
      <div className="relative aspect-video overflow-hidden" style={{ background: `radial-gradient(circle at 30% 20%, ${a.soft}, transparent 60%), #0A0A0E` }}>
        <div className="absolute inset-0 dot-bg opacity-40" />
        <div
          className="absolute -bottom-10 -right-8 h-40 w-40 rounded-full blur-2xl opacity-50"
          style={{ background: a.hex }}
        />
        <div className="absolute inset-0 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full glass px-2.5 py-1 text-[11px] capitalize" style={{ color: statusColor }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
              {p.status === "processing" ? "Generating…" : p.status}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">{p.sourceType === "pdf" ? "PDF" : "Scratch"}</span>
          </div>
          <div>
            <h3 className="font-display text-lg font-medium text-white line-clamp-2 leading-tight">{p.title}</h3>
            {p.subtitle && <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{p.subtitle}</p>}
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/5">
        <span className="text-xs text-zinc-500">{p.slideCount || 0} slides</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(p);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-rose-400"
          data-testid={`deck-delete-${p.id}`}
        >
          <Icon name="Trash2" className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

function Modal({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-3xl glass-strong p-7"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Dashboard() {
  const api = useApi();
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("k2-think-v2");
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'upload' | 'scratch'
  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [job, setJob] = useState(null); // { id, progress }
  const fileInputRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/presentations");
      setDecks(res.data.presentations || []);
    } catch (e) {
      /* ignore */
    }
  }, [api]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const m = await api.get("/models");
        if (mounted) {
          setModels(m.data.models);
          setModel(m.data.default);
        }
      } catch (e) {
        /* ignore */
      }
      await refresh();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // poll list while any deck is processing
  useEffect(() => {
    const anyProcessing = decks.some((d) => d.status === "processing");
    if (!anyProcessing) return;
    const id = setInterval(refresh, 3500);
    return () => clearInterval(id);
  }, [decks, refresh]);

  // poll the active generation job
  useEffect(() => {
    if (!job) return;
    const id = setInterval(async () => {
      try {
        const res = await api.get(`/presentations/${job.id}`);
        const p = res.data;
        if (p.status === "ready") {
          clearInterval(id);
          setJob(null);
          navigate(`/p/${p.id}`);
        } else if (p.status === "failed") {
          clearInterval(id);
          setJob(null);
          setError(p.error || "Generation failed. Please try another document.");
          refresh();
        } else {
          setJob({ id: p.id, progress: p.progress });
        }
      } catch (e) {
        /* keep polling */
      }
    }, 2200);
    return () => clearInterval(id);
  }, [job, api, navigate, refresh]);

  const handleUpload = async () => {
    if (!file) return;
    setError("");
    const form = new FormData();
    form.append("file", file);
    form.append("model", model);
    try {
      const res = await api.post("/presentations/generate", form);
      setModal(null);
      setFile(null);
      setJob({ id: res.data.id, progress: { step: 1, label: "Reading source material" } });
      refresh();
    } catch (e) {
      setError(e?.response?.data?.detail || "Upload failed");
    }
  };

  const handleScratch = async () => {
    if (topic.trim().length < 4) {
      setError("Please describe your deck in a bit more detail.");
      return;
    }
    setError("");
    try {
      const res = await api.post("/presentations/scratch", { topic, model });
      setModal(null);
      setTopic("");
      setJob({ id: res.data.id, progress: { step: 1, label: "Reading the brief" } });
      refresh();
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not start generation");
    }
  };

  const openDeck = (p) => {
    if (p.status === "ready") navigate(`/p/${p.id}`);
    else if (p.status === "processing") setJob({ id: p.id, progress: p.progress });
    else if (p.status === "failed") setError(p.error || "This deck failed to generate.");
  };

  const deleteDeck = async (p) => {
    setDecks((d) => d.filter((x) => x.id !== p.id));
    try {
      await api.delete(`/presentations/${p.id}`);
    } catch (e) {
      refresh();
    }
  };

  return (
    <div className="min-h-screen relative">
      <PageAmbience accent="violet" />
      <Navbar />

      {job && <GenerationOverlay progress={job.progress} />}

      <main className="mx-auto max-w-7xl px-6 lg:px-10 pb-24">
        {/* header */}
        <div className="pt-6 pb-8">
          <h1 className="font-display text-4xl font-light tracking-tight">Studio</h1>
          <p className="text-zinc-400 mt-1">Direct a new deck or revisit your saved presentations.</p>
        </div>

        {/* model selector */}
        <div className="rounded-3xl glass p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Cpu" className="h-4 w-4 text-violet-300" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Active Director model</span>
          </div>
          <ModelSelector models={models} value={model} onChange={setModel} />
        </div>

        {/* action bento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          <button
            onClick={() => {
              setError("");
              setModal("upload");
            }}
            data-testid="upload-pdf-generate-button"
            className="group relative overflow-hidden rounded-3xl p-8 text-left bg-gradient-to-br from-violet-600/30 to-cyan-500/20 border border-white/10 hover:border-white/25 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-violet-500/30 blur-3xl group-hover:bg-violet-500/40 transition-colors" />
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl glass flex items-center justify-center mb-5">
                <Icon name="Upload" className="h-7 w-7 text-violet-200" />
              </div>
              <h3 className="font-display text-2xl font-medium">Upload PDF & Generate</h3>
              <p className="text-zinc-400 mt-2">Drop a document and let the Director build your deck.</p>
            </div>
          </button>

          <button
            onClick={() => {
              setError("");
              setModal("scratch");
            }}
            data-testid="start-from-scratch-button"
            className="group relative overflow-hidden rounded-3xl p-8 text-left glass hover:bg-white/[0.07] hover:-translate-y-1 transition-all duration-300"
          >
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl glass flex items-center justify-center mb-5">
                <Icon name="PenTool" className="h-7 w-7 text-cyan-200" />
              </div>
              <h3 className="font-display text-2xl font-medium">Start from Scratch</h3>
              <p className="text-zinc-400 mt-2">Describe a topic and generate a deck from a brief.</p>
            </div>
          </button>
        </div>

        {error && !modal && (
          <div className="mb-6 flex items-center gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3" data-testid="dashboard-error">
            <Icon name="AlertCircle" className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* decks */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl font-light">Your decks</h2>
          <span className="text-sm text-zinc-500">{decks.length} total</span>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Spinner size={28} />
          </div>
        ) : decks.length === 0 ? (
          <div className="rounded-3xl glass p-16 text-center" data-testid="empty-state">
            <div className="h-16 w-16 mx-auto rounded-2xl glass flex items-center justify-center mb-5">
              <Icon name="LayoutGrid" className="h-8 w-8 text-zinc-500" />
            </div>
            <h3 className="font-display text-xl font-medium">No decks yet</h3>
            <p className="text-zinc-400 mt-2">Upload a PDF or start from scratch to create your first one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="decks-grid">
            <AnimatePresence>
              {decks.map((p) => (
                <DeckCard key={p.id} p={p} onOpen={openDeck} onDelete={deleteDeck} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* upload modal */}
      <Modal open={modal === "upload"} onClose={() => setModal(null)}>
        <h2 className="font-display text-2xl font-light mb-1">Upload a PDF</h2>
        <p className="text-zinc-400 text-sm mb-6">The Director will summarize it into a cinematic deck.</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          data-testid="pdf-file-input"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-white/15 hover:border-violet-400/50 transition-colors p-8 text-center"
          data-testid="pdf-dropzone"
        >
          <Icon name={file ? "FileCheck2" : "FileUp"} className="h-9 w-9 mx-auto text-violet-300 mb-3" />
          <div className="text-sm text-zinc-300">{file ? file.name : "Click to choose a PDF"}</div>
          {!file && <div className="text-xs text-zinc-500 mt-1">Max ~14k characters are read</div>}
        </button>

        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-3">Director model</div>
          <ModelSelector models={models} value={model} onChange={setModel} />
        </div>

        {error && <p className="text-rose-300 text-sm mt-4" data-testid="modal-error">{error}</p>}

        <div className="flex gap-3 mt-7">
          <Button variant="secondary" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
          <Button variant="magic" onClick={handleUpload} disabled={!file} className="flex-1" data-testid="confirm-upload-button">
            <Icon name="Sparkles" className="h-4 w-4" /> Generate
          </Button>
        </div>
      </Modal>

      {/* scratch modal */}
      <Modal open={modal === "scratch"} onClose={() => setModal(null)}>
        <h2 className="font-display text-2xl font-light mb-1">Start from scratch</h2>
        <p className="text-zinc-400 text-sm mb-6">Describe the deck — topic, audience, key points.</p>

        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={5}
          placeholder="e.g. A Series A pitch for an AI logistics startup that cuts delivery costs by 30%…"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent resize-none"
          data-testid="scratch-topic-input"
        />

        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-3">Director model</div>
          <ModelSelector models={models} value={model} onChange={setModel} />
        </div>

        {error && <p className="text-rose-300 text-sm mt-4" data-testid="modal-error">{error}</p>}

        <div className="flex gap-3 mt-7">
          <Button variant="secondary" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
          <Button variant="magic" onClick={handleScratch} className="flex-1" data-testid="confirm-scratch-button">
            <Icon name="Sparkles" className="h-4 w-4" /> Generate
          </Button>
        </div>
      </Modal>
    </div>
  );
}
