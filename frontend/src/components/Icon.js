import * as Lucide from "lucide-react";

export default function Icon({ name, className, strokeWidth = 1.6, style }) {
  const Cmp = (name && Lucide[name]) || Lucide.Sparkles;
  return <Cmp className={className} strokeWidth={strokeWidth} style={style} />;
}
