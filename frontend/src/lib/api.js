import axios from "axios";
import { useMemo, useRef } from "react";
import { useVibeAuth } from "./auth";

const BASE = process.env.REACT_APP_BACKEND_URL;

export function useApi() {
  const { getAuthHeaders } = useVibeAuth();
  const ref = useRef(getAuthHeaders);
  ref.current = getAuthHeaders;

  return useMemo(() => {
    const instance = axios.create({ baseURL: `${BASE}/api` });
    instance.interceptors.request.use(async (config) => {
      const headers = await ref.current();
      Object.assign(config.headers, headers);
      return config;
    });
    return instance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export const BACKEND_URL = BASE;
