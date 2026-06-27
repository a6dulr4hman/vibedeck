import { useMemo } from "react";
import { accent as getAccent } from "../../lib/accents";
import { Sparkles } from "../effects/Backgrounds";

/* Animated rotating border beam around the canvas frame */
function BorderBeam({ a }) {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <span
        className="absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: `conic-gradient(from 0deg, transparent 0 74%, ${a.hex} 86%, #ffffff 90%, transparent 100%)`,
          animation: "beamRotate 5s linear infinite",
        }}
      />
      <span className="absolute inset-[2px] rounded-[inherit]" style={{ background: "#07070b" }} />
    </span>
  );
}

function ShineBorder({ a }) {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <span
        className="absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: `conic-gradient(from 0deg, ${a.from}, ${a.to}, #ffffff, ${a.from})`,
          opacity: 0.6,
          animation: "beamRotate 9s linear infinite",
        }}
      />
      <span className="absolute inset-[2px] rounded-[inherit]" style={{ background: "#07070b" }} />
    </span>
  );
}

function OrbitingCircles({ a }) {
  return (
    <div className="pointer-events-none absolute -top-[6cqw] -right-[6cqw] opacity-70" style={{ width: "26cqw", height: "26cqw" }}>
      {[1, 2, 3].map((ring, i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border"
          style={{
            borderColor: `${a.hex}30`,
            inset: `${i * 3}cqw`,
            animation: `${i % 2 ? "spinRev" : "spinSlow"} ${10 + i * 4}s linear infinite`,
          }}
        >
          <span
            className="absolute rounded-full"
            style={{ width: "1.2cqw", height: "1.2cqw", background: a.hex, top: "-0.6cqw", left: "50%", boxShadow: `0 0 10px ${a.hex}` }}
          />
        </div>
      ))}
    </div>
  );
}

function Globe({ a }) {
  return (
    <div className="pointer-events-none absolute -bottom-[8cqw] -right-[6cqw] rounded-full overflow-hidden opacity-80"
      style={{ width: "30cqw", height: "30cqw", background: `radial-gradient(circle at 34% 30%, ${a.hex}, #05060c 72%)`, boxShadow: `0 0 50px ${a.hex}44` }}>
      <div className="absolute inset-0 animate-spin-slow"
        style={{
          background: `repeating-linear-gradient(90deg, transparent 0 6%, ${a.hex}55 6% 6.4%), repeating-linear-gradient(0deg, transparent 0 9%, ${a.hex}33 9% 9.3%)`,
          borderRadius: "9999px",
        }} />
    </div>
  );
}

function Marquee({ a }) {
  const tokens = useMemo(() => ["AI", "REALTIME", "SECURE", "SCALABLE", "FAST", "GLOBAL", "SMART", "TRUSTED"], []);
  const row = [...tokens, ...tokens];
  return (
    <div className="pointer-events-none absolute bottom-[2cqw] left-0 right-0 overflow-hidden opacity-50">
      <div className="flex gap-[2cqw] w-max" style={{ animation: "marqueeX 18s linear infinite" }}>
        {row.map((t, i) => (
          <span key={i} className="s-small font-mono rounded-full px-[1.5cqw] py-[0.5cqw] border whitespace-nowrap"
            style={{ borderColor: `${a.hex}33`, color: `${a.hex}` }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function AnimatedGrid() {
  return <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />;
}

export default function EffectsLayer({ effects = [], accent = "violet" }) {
  const a = getAccent(accent);
  if (!effects.length) return null;
  return (
    <>
      {effects.includes("border-beam") && <BorderBeam a={a} />}
      {effects.includes("shine-border") && !effects.includes("border-beam") && <ShineBorder a={a} />}
      {effects.includes("animated-grid") && <AnimatedGrid />}
      {effects.includes("orbiting-circles") && <OrbitingCircles a={a} />}
      {effects.includes("globe") && <Globe a={a} />}
      {effects.includes("marquee") && <Marquee a={a} />}
      {effects.includes("sparkles-text") && <Sparkles count={28} />}
    </>
  );
}
