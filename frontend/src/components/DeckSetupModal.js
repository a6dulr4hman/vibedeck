import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThemePicker from "./ThemePicker";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";
import Icon from "./Icon";
import { DEFAULT_DECK_THEME } from "../lib/constants";

// Wizard shown before generation: collects tone + palette + light/dark slides.
export default function DeckSetupModal({ open, onClose, onConfirm, loading, summary }) {
  const [theme, setTheme] = useState(DEFAULT_DECK_THEME);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-3xl glass-strong p-7"
            data-testid="deck-setup-modal"
          >
            <div className="flex items-center gap-2.5 mb-1">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center">
                <Icon name="Wand2" className="h-5 w-5 text-white" />
              </div>
              <h2 className="font-display text-2xl font-light text-ink">Style your deck</h2>
            </div>
            {summary && <p className="text-muted text-sm mb-6 line-clamp-2">{summary}</p>}

            <ThemePicker value={theme} onChange={setTheme} />

            <div className="flex gap-3 mt-7">
              <Button variant="secondary" onClick={onClose} disabled={loading} className="flex-1">Back</Button>
              <Button variant="magic" onClick={() => onConfirm(theme)} disabled={loading} className="flex-1" data-testid="deck-setup-generate">
                {loading ? <Spinner size={18} /> : <><Icon name="Sparkles" className="h-4 w-4" /> Generate deck</>}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
