import { useApi } from "./api";

export function useGenerate() {
  const api = useApi();
  const startScratch = async (topic, model) => {
    const res = await api.post("/presentations/scratch", { topic, model });
    return res.data.id;
  };
  const startPdf = async (file, model) => {
    const form = new FormData();
    form.append("file", file);
    form.append("model", model);
    const res = await api.post("/presentations/generate", form);
    return res.data.id;
  };
  return { startScratch, startPdf };
}

export const PENDING_KEY = "vibedeck_pending";
