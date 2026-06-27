import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useApi } from "../lib/api";
import { useMe } from "../lib/useMe";
import { accent as getAccent } from "../lib/accents";
import Navbar from "../components/Navbar";
import Icon from "../components/Icon";
import { Button } from "../components/ui/Button";

const TIERS = [
  { id: "free", label: "Free", price: "$0", period: "forever", tagline: "Start directing decks today.",
    perks: ["Unlimited decks", "PDF & brief generation", "All animated 16:9 layouts", "Public share links"] },
  { id: "pro", label: "Pro", price: "$19", period: "/ month", tagline: "Frontier copy & faster models.", highlight: true,
    perks: ["Everything in Free", "Pro Director models", "Priority generation", "Per-slide AI editing"] },
  { id: "max", label: "Max", price: "$49", period: "/ month", tagline: "The most powerful directors.",
    perks: ["Everything in Pro", "Max Director models", "Highest reasoning depth", "Early access features"] },
];

const RANK = { free: 0, pro: 1, max: 2 };

export default function Pricing() {
  const api = useApi();
  const { tier } = useMe();
  const [models, setModels] = useState([]);
  const [note, setNote] = useState("");

  useEffect(() => { api.get("/models").then((r) => setModels(r.data.models)).catch(() => {}); }, [api]);

  const modelsFor = (t) => models.filter((m) => m.tier === t);

  return (
    <div className="min-h-screen relative">
      <div className="hero-glow" />
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 lg:px-10 pb-28">
        <div className="text-center pt-12 pb-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm text-muted mb-6">
            <span className="h-2 w-2 rounded-full bg-violet-500" /> Simple, model-tiered pricing
          </motion.div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-ink">
            Pick your <span className="text-gradient">Director</span>
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto mt-5">
            Every plan generates unlimited animated decks. Higher tiers unlock more powerful reasoning models.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {TIERS.map((t, i) => {
            const current = tier === t.id;
            const isUpgrade = RANK[t.id] > RANK[tier];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative rounded-3xl p-7 ${t.highlight ? "glass-card ring-2 ring-violet-400" : "glass-card"}`}
                data-testid={`pricing-tier-${t.id}`}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1 text-[11px] font-semibold text-white uppercase tracking-wider">Most popular</span>
                )}
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl font-semibold text-ink">{t.label}</h3>
                  {current && <span className="text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-500 px-2.5 py-1">Your plan</span>}
                </div>
                <p className="text-muted text-sm mt-1">{t.tagline}</p>
                <div className="mt-5 flex items-end gap-1.5">
                  <span className="font-display text-4xl font-semibold text-ink">{t.price}</span>
                  <span className="text-muted text-sm mb-1">{t.period}</span>
                </div>

                <Button
                  variant={t.highlight ? "magic" : "secondary"}
                  className="w-full mt-6"
                  disabled={current}
                  data-testid={`pricing-cta-${t.id}`}
                  onClick={() => setNote(isUpgrade ? `Plan changes are managed by an admin in this demo. Ask an admin to set you to ${t.label}.` : "")}
                >
                  {current ? "Current plan" : isUpgrade ? `Upgrade to ${t.label}` : `Switch to ${t.label}`}
                </Button>

                <ul className="mt-7 space-y-2.5">
                  {t.perks.map((p, k) => (
                    <li key={k} className="flex items-start gap-2.5 text-sm text-ink">
                      <Icon name="Check" className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" /> {p}
                    </li>
                  ))}
                </ul>

                <div className="mt-7 pt-5 border-t border-[var(--glass-border)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted mb-3">Director models</div>
                  <div className="flex flex-wrap gap-2">
                    {modelsFor(t.id).map((m) => {
                      const a = getAccent(m.accent);
                      return (
                        <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full glass px-2.5 py-1 text-xs text-ink">
                          <span className="h-2 w-2 rounded-full" style={{ background: a.hex }} /> {m.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {note && (
          <div className="mt-8 max-w-xl mx-auto flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3" data-testid="pricing-note">
            <Icon name="Info" className="h-4 w-4 shrink-0" /> {note}
          </div>
        )}
      </main>
    </div>
  );
}
