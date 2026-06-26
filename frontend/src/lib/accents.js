// Accent palette shared by the slide renderer and dashboard.
export const ACCENTS = {
  violet: { hex: "#8B5CF6", soft: "rgba(139,92,246,0.18)", from: "#8B5CF6", to: "#6366F1" },
  cyan: { hex: "#22D3EE", soft: "rgba(34,211,238,0.18)", from: "#22D3EE", to: "#0EA5E9" },
  fuchsia: { hex: "#E879F9", soft: "rgba(232,121,249,0.18)", from: "#E879F9", to: "#A855F7" },
  emerald: { hex: "#10B981", soft: "rgba(16,185,129,0.18)", from: "#34D399", to: "#10B981" },
  amber: { hex: "#F59E0B", soft: "rgba(245,158,11,0.18)", from: "#FBBF24", to: "#F59E0B" },
  rose: { hex: "#FB7185", soft: "rgba(251,113,133,0.18)", from: "#FB7185", to: "#F43F5E" },
  blue: { hex: "#3B82F6", soft: "rgba(59,130,246,0.18)", from: "#60A5FA", to: "#3B82F6" },
};

export function accent(name) {
  return ACCENTS[name] || ACCENTS.violet;
}
