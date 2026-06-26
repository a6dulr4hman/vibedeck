// Unified auth used across VibeDeck.
//
// Production (your falak.me deployment): real custom Clerk auth.
// Preview sandbox: Clerk *production* keys are domain-locked to falak.me and
// cannot run here, so a gated demo mode (REACT_APP_DEMO_AUTH=true) lets the app
// be exercised end-to-end. Demo sessions authenticate to the backend via the
// gated test path (X-Test-User). Set REACT_APP_DEMO_AUTH=false in production.
import { createContext, useContext, useState, useCallback } from "react";
import { useAuth, useUser, useClerk } from "@clerk/clerk-react";

export const DEMO = process.env.REACT_APP_DEMO_AUTH === "true";

/* ----------------------------- demo mode ----------------------------- */
const DemoCtx = createContext(null);
const STORAGE_KEY = "vibedeck_demo_user";

export function DemoAuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const signInDemo = useCallback((email) => {
    const clean = (email || "guest").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 24) || "guest";
    const u = { id: `demo_${clean}`, email: email || "demo@vibedeck.app" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const signOut = useCallback((cb) => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    if (cb) cb();
  }, []);

  return <DemoCtx.Provider value={{ user, signInDemo, signOut }}>{children}</DemoCtx.Provider>;
}

function useDemoAuth() {
  const ctx = useContext(DemoCtx);
  return {
    isLoaded: true,
    isSignedIn: !!ctx?.user,
    user: ctx?.user ? { email: ctx.user.email, imageUrl: null } : null,
    getAuthHeaders: async () => (ctx?.user ? { "X-Test-User": ctx.user.id } : {}),
    signOut: ctx?.signOut || (() => {}),
    signInDemo: ctx?.signInDemo || (() => {}),
  };
}

/* ----------------------------- clerk mode ----------------------------- */
function useClerkAuth() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  return {
    isLoaded,
    isSignedIn,
    user: user
      ? { email: user.primaryEmailAddress?.emailAddress, imageUrl: user.imageUrl }
      : null,
    getAuthHeaders: async () => {
      try {
        const t = await getToken();
        return t ? { Authorization: `Bearer ${t}` } : {};
      } catch {
        return {};
      }
    },
    signOut: (cb) => signOut(cb),
    signInDemo: () => {},
  };
}

export const useVibeAuth = DEMO ? useDemoAuth : useClerkAuth;
