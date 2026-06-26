import { useMemo } from "react";
import { accent as getAccent } from "../../lib/accents";

// ---- Aurora: soft animated mesh blobs behind content ----
export function Aurora({ accent = "violet", className = "" }) {
  const a = getAccent(accent);
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute -top-1/3 -left-1/4 h-[80%] w-[70%] rounded-full blur-[90px] opacity-50 animate-aurora"
        style={{ background: `radial-gradient(circle at center, ${a.hex}, transparent 65%)` }}
      />
      <div
        className="absolute top-1/4 -right-1/4 h-[75%] w-[65%] rounded-full blur-[100px] opacity-40 animate-aurora"
        style={{
          background: `radial-gradient(circle at center, #6366F1, transparent 65%)`,
          animationDelay: "-8s",
        }}
      />
      <div
        className="absolute -bottom-1/4 left-1/3 h-[70%] w-[60%] rounded-full blur-[110px] opacity-30 animate-aurora"
        style={{
          background: `radial-gradient(circle at center, #22D3EE, transparent 65%)`,
          animationDelay: "-15s",
        }}
      />
    </div>
  );
}

// ---- Meteors: falling light streaks ----
export function Meteors({ count = 16 }) {
  const meteors = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: `${Math.floor(Math.random() * 100)}%`,
        delay: `${(Math.random() * 5).toFixed(2)}s`,
        duration: `${(Math.random() * 4 + 4).toFixed(2)}s`,
      })),
    [count]
  );
  return (
    <div className="absolute inset-0 overflow-hidden">
      {meteors.map((m, i) => (
        <span
          key={i}
          className="meteor"
          style={{ left: m.left, animationDelay: m.delay, animationDuration: m.duration }}
        />
      ))}
    </div>
  );
}

// ---- Sparkles / star field ----
export function Sparkles({ count = 40 }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: `${Math.random() * 2 + 1}px`,
        delay: `${(Math.random() * 3).toFixed(2)}s`,
        dur: `${(Math.random() * 2 + 1.5).toFixed(2)}s`,
      })),
    [count]
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animation: `twinkle ${s.dur} ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function GridBg() {
  return <div className="absolute inset-0 grid-bg" />;
}

export function DotBg() {
  return <div className="absolute inset-0 dot-bg" />;
}

export function Spotlight({ accent = "violet" }) {
  const a = getAccent(accent);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute -top-[20%] left-1/2 -translate-x-1/2 h-[120%] w-[60%] blur-[80px] opacity-40"
        style={{
          background: `radial-gradient(ellipse at top, ${a.hex}, transparent 60%)`,
        }}
      />
      <div className="absolute inset-0 dot-bg opacity-40" />
    </div>
  );
}

// Dispatcher used inside the 16:9 slide canvas.
export function SlideBackground({ type, accent }) {
  switch (type) {
    case "meteors":
      return (
        <>
          <Aurora accent={accent} className="opacity-70" />
          <Meteors count={14} />
        </>
      );
    case "grid":
      return (
        <>
          <GridBg />
          <Aurora accent={accent} className="opacity-40" />
        </>
      );
    case "dots":
      return (
        <>
          <DotBg />
          <Aurora accent={accent} className="opacity-30" />
        </>
      );
    case "spotlight":
      return <Spotlight accent={accent} />;
    case "plain":
      return <Aurora accent={accent} className="opacity-25" />;
    case "aurora":
    default:
      return <Aurora accent={accent} />;
  }
}

// Full-page ambient background for landing / auth / dashboard.
export function PageAmbience({ accent = "violet", meteors = false }) {
  return (
    <div className="fixed inset-0 -z-10 bg-ink-900">
      <Aurora accent={accent} className="opacity-60" />
      {meteors && <Meteors count={18} />}
      <Sparkles count={50} />
      <div className="absolute inset-0 dot-bg opacity-30" />
    </div>
  );
}
