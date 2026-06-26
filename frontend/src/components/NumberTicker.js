import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

// Animated count-up for metric slides. Parses a leading number from `value`
// (e.g. "99.9", "40", "8") and counts to it; non-numeric values render as-is.
export default function NumberTicker({ value, prefix = "", suffix = "", className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const match = String(value).match(/-?\d+(\.\d+)?/);
  const target = match ? parseFloat(match[0]) : null;
  const decimals = match && match[0].includes(".") ? match[0].split(".")[1].length : 0;
  const trailing = match ? String(value).slice(match.index + match[0].length) : "";
  const [display, setDisplay] = useState(target !== null ? "0" : value);

  useEffect(() => {
    if (target === null || !inView) return;
    let raf;
    const start = performance.now();
    const dur = 1300;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay((eased * target).toFixed(decimals));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {target !== null ? display : value}
      {trailing}
      {suffix}
    </span>
  );
}
