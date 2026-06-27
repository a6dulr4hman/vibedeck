import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVibeAuth } from "../lib/auth";
import { useGenerate, PENDING_KEY } from "../lib/useGenerate";
import ModelSelector from "./ModelSelector";
import Icon from "./Icon";
import { Spinner } from "./ui/Spinner";

export default function HeroPrompt() {
  const { isSignedIn } = useVibeAuth();
  const { startScratch, startPdf } = useGenerate();
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [model, setModel] = useState("k2-think-v2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const submit = async () => {
    setError("");
    if (!file && topic.trim().length < 4) {
      setError("Describe your deck (a sentence or two).");
      return;
    }
    if (!isSignedIn) {
      if (!file) localStorage.setItem(PENDING_KEY, JSON.stringify({ topic, model }));
      navigate("/sign-in");
      return;
    }
    setLoading(true);
    try {
      const id = file ? await startPdf(file, model) : await startScratch(topic, model);
      navigate(`/p/${id}`);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not start generation.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card rounded-[28px] p-3 soft-shadow" data-testid="hero-prompt">
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
          rows={3}
          placeholder="Describe what you want to build…"
          className="w-full resize-none bg-transparent px-4 pt-3 text-lg text-ink placeholder:text-zinc-400 outline-none"
          data-testid="hero-input"
        />

        {file && (
          <div className="mx-4 mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs text-violet-700">
            <Icon name="FileText" className="h-3.5 w-3.5" />
            <span className="max-w-[200px] truncate">{file.name}</span>
            <button onClick={() => setFile(null)}><Icon name="X" className="h-3.5 w-3.5" /></button>
          </div>
        )}

        <div className="flex items-center justify-between px-2 pb-1">
          <div className="flex items-center gap-1.5">
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="hero-file-input" />
            <button onClick={() => fileRef.current?.click()} title="Attach a PDF" data-testid="hero-attach" className="h-9 w-9 grid place-items-center rounded-full border border-black/10 text-zinc-600 hover:bg-black/5">
              <Icon name="Plus" className="h-5 w-5" />
            </button>
            <button title="Web sources — coming soon" className="h-9 w-9 grid place-items-center rounded-full border border-black/10 text-zinc-600 hover:bg-black/5">
              <Icon name="Globe" className="h-5 w-5" />
            </button>
            <ModelSelector value={model} onChange={setModel} />
          </div>

          <button
            onClick={submit}
            disabled={loading}
            data-testid="hero-send"
            className="h-11 w-11 grid place-items-center rounded-full text-white shadow-[0_6px_20px_rgba(251,146,90,0.45)] hover:scale-105 transition-transform disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #fbbf90, #fb7185)" }}
          >
            {loading ? <Spinner size={18} /> : <Icon name="ArrowUp" className="h-5 w-5" strokeWidth={2.5} />}
          </button>
        </div>
      </div>
      {error && <p className="text-rose-500 text-sm mt-3 text-center" data-testid="hero-error">{error}</p>}
    </div>
  );
}
