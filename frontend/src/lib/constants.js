// Shared options for the deck setup wizard (tone, color palette, light/dark).
export const TONES = [
  { id: "formal", label: "Formal", desc: "Precise & executive" },
  { id: "playful", label: "Playful", desc: "Energetic & fun" },
  { id: "bold", label: "Bold", desc: "Punchy & confident" },
  { id: "minimal", label: "Minimal", desc: "Clean & spare" },
  { id: "elegant", label: "Elegant", desc: "Refined & premium" },
];

export const PALETTES = [
  { id: "violet", label: "Violet Dream", swatch: ["#8B5CF6", "#E879F9", "#3B82F6"] },
  { id: "ocean", label: "Ocean", swatch: ["#22D3EE", "#3B82F6", "#10B981"] },
  { id: "sunset", label: "Sunset", swatch: ["#F59E0B", "#FB7185", "#E879F9"] },
  { id: "forest", label: "Forest", swatch: ["#10B981", "#22D3EE", "#F59E0B"] },
  { id: "mono", label: "Monochrome", swatch: ["#94A3B8", "#64748B", "#475569"] },
];

export const DEFAULT_DECK_THEME = { tone: "formal", palette: "violet", mode: "dark" };
