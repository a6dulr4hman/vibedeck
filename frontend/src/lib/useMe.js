import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useApi } from "./api";
import { useVibeAuth } from "./auth";

const MeCtx = createContext(null);

export function MeProvider({ children }) {
  const api = useApi();
  const { isSignedIn, isLoaded } = useVibeAuth();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/me");
      setMe(res.data);
    } catch (e) {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, [api, isSignedIn]);

  useEffect(() => {
    if (isLoaded) refresh();
  }, [isLoaded, isSignedIn, refresh]);

  const tier = me?.tier || "free";
  const isAdmin = !!me?.isAdmin;

  return <MeCtx.Provider value={{ me, tier, isAdmin, loading, refresh }}>{children}</MeCtx.Provider>;
}

export function useMe() {
  return useContext(MeCtx) || { me: null, tier: "free", isAdmin: false, loading: false, refresh: () => {} };
}
