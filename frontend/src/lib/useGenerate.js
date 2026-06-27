import { useApi } from "./api";

export function useGenerate() {
  const api = useApi();
  const startScratch = async (topic, model, theme) => {
    const res = await api.post("/presentations/scratch", { topic, model, theme });
    return res.data.id;
  };
  const startPdf = async (file, model, theme) => {
    const form = new FormData();
    form.append("file", file);
    form.append("model", model);
    if (theme) {
      form.append("tone", theme.tone);
      form.append("palette", theme.palette);
      form.append("slideMode", theme.mode);
    }
    const res = await api.post("/presentations/generate", form);
    return res.data.id;
  };
  return { startScratch, startPdf };
}

export const PENDING_KEY = "vibedeck_pending";
