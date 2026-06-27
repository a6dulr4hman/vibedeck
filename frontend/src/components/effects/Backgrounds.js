import { useEffect, useMemo, useRef } from "react";
import { accent as getAccent } from "../../lib/accents";

/* ---------------- Aurora (soft animated blobs) ---------------- */
export function Aurora({ accent = "violet", className = "" }) {
  const a = getAccent(accent);
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute -top-1/3 -left-1/4 h-[80%] w-[70%] rounded-full blur-[90px] opacity-50 animate-aurora"
        style={{ background: `radial-gradient(circle at center, ${a.hex}, transparent 65%)` }} />
      <div className="absolute top-1/4 -right-1/4 h-[75%] w-[65%] rounded-full blur-[100px] opacity-40 animate-aurora"
        style={{ background: `radial-gradient(circle at center, #6366F1, transparent 65%)`, animationDelay: "-8s" }} />
      <div className="absolute -bottom-1/4 left-1/3 h-[70%] w-[60%] rounded-full blur-[110px] opacity-30 animate-aurora"
        style={{ background: `radial-gradient(circle at center, #22D3EE, transparent 65%)`, animationDelay: "-15s" }} />
    </div>
  );
}

/* ---------------- Meteors ---------------- */
export function Meteors({ count = 14 }) {
  const meteors = useMemo(() => Array.from({ length: count }).map(() => ({
    left: `${Math.floor(Math.random() * 100)}%`,
    delay: `${(Math.random() * 5).toFixed(2)}s`,
    duration: `${(Math.random() * 4 + 4).toFixed(2)}s`,
  })), [count]);
  return (
    <div className="absolute inset-0 overflow-hidden">
      {meteors.map((m, i) => (
        <span key={i} className="meteor" style={{ left: m.left, animationDelay: m.delay, animationDuration: m.duration }} />
      ))}
    </div>
  );
}

/* ---------------- Sparkles / starfield ---------------- */
export function Sparkles({ count = 36 }) {
  const stars = useMemo(() => Array.from({ length: count }).map(() => ({
    top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
    size: `${Math.random() * 2 + 1}px`, delay: `${(Math.random() * 3).toFixed(2)}s`,
    dur: `${(Math.random() * 2 + 1.5).toFixed(2)}s`,
  })), [count]);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s, i) => (
        <span key={i} className="absolute rounded-full bg-white"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animation: `twinkle ${s.dur} ease-in-out ${s.delay} infinite` }} />
      ))}
    </div>
  );
}

/* ---------------- Particles (canvas) ---------------- */
export function Particles({ accent = "violet", count = 46 }) {
  const ref = useRef(null);
  const a = getAccent(accent);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, w, h;
    const dots = [];
    const resize = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      w = canvas.width = r.width; h = canvas.height = r.height;
    };
    resize();
    for (let i = 0; i < count; i++) {
      dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.8 + 0.6 });
    }
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = a.hex + "cc";
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [count, a.hex]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full opacity-70" />;
}

/* ---------------- Ripple ---------------- */
export function Ripple({ accent = "violet" }) {
  const a = getAccent(accent);
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="absolute rounded-full border"
          style={{ width: "30cqw", height: "30cqw", borderColor: `${a.hex}55`, animation: `ripplePulse 4s ease-out ${i * 1}s infinite` }} />
      ))}
      <Aurora accent={accent} className="opacity-25" />
    </div>
  );
}

/* ---------------- Warp (perspective grid) ---------------- */
export function Warp({ accent = "violet" }) {
  const a = getAccent(accent);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ perspective: "320px" }}>
      <div className="absolute left-1/2 top-1/2 h-[180%] w-[200%] -translate-x-1/2 retro-grid"
        style={{ transform: "translate(-50%,-30%) rotateX(62deg)", transformOrigin: "center" }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 30%, #07070b 75%)` }} />
      <div className="absolute -top-[10%] left-1/2 h-[50%] w-[60%] -translate-x-1/2 blur-[80px] opacity-40"
        style={{ background: `radial-gradient(ellipse at top, ${a.hex}, transparent 60%)` }} />
    </div>
  );
}

export function RetroGridBg({ accent = "violet" }) {
  return <Warp accent={accent} />;
}

export function GridBg({ accent }) {
  return (<><div className="absolute inset-0 grid-bg" /><Aurora accent={accent} className="opacity-30" /></>);
}
export function DotBg({ accent }) {
  return (<><div className="absolute inset-0 dot-bg" /><Aurora accent={accent} className="opacity-25" /></>);
}

/* ---------------- dispatcher ---------------- */
export function SlideBackground({ type, accent }) {
  switch (type) {
    case "particles": return (<><div className="absolute inset-0" style={{ background: "#07070b" }} /><Particles accent={accent} /><Aurora accent={accent} className="opacity-25" /></>);
    case "meteors": return (<><Aurora accent={accent} className="opacity-70" /><Meteors count={14} /></>);
    case "retro-grid": return <Warp accent={accent} />;
    case "warp": return <Warp accent={accent} />;
    case "dot-pattern": return <DotBg accent={accent} />;
    case "grid": return <GridBg accent={accent} />;
    case "ripple": return <Ripple accent={accent} />;
    case "plain": return <Aurora accent={accent} className="opacity-20" />;
    case "aurora":
    default: return <Aurora accent={accent} />;
  }
}

/* ---------------- light page ambience (app chrome) ---------------- */
export function PageAmbience() {
  return (
    <div className="fixed inset-0 -z-10 bg-[var(--bg)]">
      <div className="absolute top-0 left-0 right-0 h-[60vh] opacity-70"
        style={{ background: "radial-gradient(50% 60% at 50% 0%, rgba(196,181,253,0.35), transparent 70%), radial-gradient(40% 50% at 80% 10%, rgba(255,196,153,0.3), transparent 70%)" }} />
    </div>
  );
}
