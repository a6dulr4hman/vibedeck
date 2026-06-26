import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVibeAuth, DEMO } from "../lib/auth";
import Icon from "./Icon";

export default function Navbar() {
  const { user, signOut } = useVibeAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const email = user?.email || "";
  const initials = (email[0] || "V").toUpperCase();

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5" data-testid="nav-logo">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-[0_4px_20px_rgba(139,92,246,0.4)]">
            <Icon name="Sparkles" className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-medium tracking-tight">VibeDeck</span>
          {DEMO && (
            <span className="ml-1 text-[10px] uppercase tracking-wider text-amber-300 border border-amber-300/30 rounded-full px-2 py-0.5">
              demo
            </span>
          )}
        </Link>

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-3 rounded-full glass pl-3 pr-1.5 py-1.5 hover:bg-white/10 transition-colors"
            data-testid="nav-user-menu"
          >
            <span className="text-sm text-zinc-300 hidden sm:block max-w-[160px] truncate">{email}</span>
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-sm font-semibold">
                {initials}
              </span>
            )}
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 mt-2 w-52 rounded-2xl glass-strong p-2"
              >
                <div className="px-3 py-2 text-xs text-zinc-500 truncate">{email}</div>
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut(() => navigate("/"));
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm text-rose-300 hover:bg-rose-500/10 flex items-center gap-2"
                  data-testid="nav-sign-out"
                >
                  <Icon name="LogOut" className="h-4 w-4" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
