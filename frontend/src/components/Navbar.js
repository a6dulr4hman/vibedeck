import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVibeAuth, DEMO } from "../lib/auth";
import { useMe } from "../lib/useMe";
import { useTheme } from "../lib/theme";
import Icon from "./Icon";
import { Button } from "./ui/Button";

const TIER_LABEL = { free: "Free", pro: "Pro", max: "Max" };

export default function Navbar({ floating = false }) {
  const { isSignedIn, user, signOut } = useVibeAuth();
  const { tier, isAdmin } = useMe();
  const { mode, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const email = user?.email || "";
  const initials = (email[0] || "V").toUpperCase();

  return (
    <header className={floating ? "sticky top-0 z-40 bg-[var(--bg)]/70 backdrop-blur-xl" : "relative z-40"}>
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" data-testid="nav-logo">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_4px_16px_rgba(139,92,246,0.35)]">
            <Icon name="Sparkles" className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">VibeDeck</span>
          {DEMO && <span className="ml-1 text-[10px] uppercase tracking-wider text-amber-600 border border-amber-300 rounded-full px-2 py-0.5">demo</span>}
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-zinc-600">
          <Link to="/pricing" className="hover:text-ink transition-colors" data-testid="nav-pricing">Pricing</Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggle}
            data-testid="theme-toggle"
            title={mode === "dark" ? "Switch to light" : "Switch to dark"}
            className="h-10 w-10 rounded-full glass grid place-items-center text-muted hover:text-ink transition-colors"
          >
            <Icon name={mode === "dark" ? "Sun" : "Moon"} className="h-5 w-5" />
          </button>
          {isSignedIn ? (
            <>
              <Button as={Link} to="/dashboard" variant="secondary" className="px-4 py-2 text-sm" data-testid="nav-projects">
                <Icon name="LayoutGrid" className="h-4 w-4" /> Projects
              </Button>
              <div className="relative" ref={ref}>
                <button onClick={() => setOpen((o) => !o)} data-testid="nav-account" className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-sm font-semibold text-white">
                  {user?.imageUrl ? <img src={user.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : initials}
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ duration: 0.16 }} className="absolute right-0 mt-2 w-56 rounded-2xl glass-card p-2">
                      <div className="px-3 py-2">
                        <div className="text-sm font-medium text-ink truncate">{email}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 inline-flex items-center gap-1">
                          <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 font-semibold">{TIER_LABEL[tier]} plan</span>
                        </div>
                      </div>
                      <Link to="/pricing" onClick={() => setOpen(false)} className="w-full text-left px-3 py-2 rounded-xl text-sm text-zinc-700 hover:bg-black/5 flex items-center gap-2"><Icon name="CreditCard" className="h-4 w-4" /> Plans & Pricing</Link>
                      {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} data-testid="nav-admin" className="w-full text-left px-3 py-2 rounded-xl text-sm text-zinc-700 hover:bg-black/5 flex items-center gap-2"><Icon name="ShieldCheck" className="h-4 w-4" /> Admin Panel</Link>}
                      <button onClick={() => { setOpen(false); signOut(() => navigate("/")); }} data-testid="nav-sign-out" className="w-full text-left px-3 py-2 rounded-xl text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"><Icon name="LogOut" className="h-4 w-4" /> Sign out</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Button as={Link} to="/sign-in" variant="ghost" data-testid="nav-sign-in">Sign in</Button>
              <Button as={Link} to="/sign-up" variant="primary" className="px-5 py-2.5 text-sm" data-testid="nav-get-started">Get started</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
