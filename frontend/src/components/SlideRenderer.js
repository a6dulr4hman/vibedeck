import { motion } from "framer-motion";
import Icon from "./Icon";
import NumberTicker from "./NumberTicker";
import { SlideBackground } from "./effects/Backgrounds";
import EffectsLayer from "./magic/Effects";
import { accent as getAccent } from "../lib/accents";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } };

function AccentText({ a, children, className = "" }) {
  return (
    <span className={className} style={{ backgroundImage: `linear-gradient(120deg, var(--s-grad-start), ${a.from})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
      {children}
    </span>
  );
}

function Eyebrow({ a, text }) {
  if (!text) return null;
  return (
    <motion.div variants={item} className="inline-flex items-center gap-[1cqw] rounded-full px-[1.6cqw] py-[0.7cqw] s-surface" style={{ borderColor: `${a.hex}55` }}>
      <span className="rounded-full" style={{ width: "0.8cqw", height: "0.8cqw", background: a.hex }} />
      <span className="s-eyebrow font-semibold" style={{ color: a.hex }}>{text}</span>
    </motion.div>
  );
}

function IconChip({ a, name, large }) {
  return (
    <div className="flex items-center justify-center rounded-2xl shrink-0" style={{ background: a.soft, border: `1px solid ${a.hex}44`, width: large ? "5cqw" : "4cqw", height: large ? "5cqw" : "4cqw" }}>
      <Icon name={name} className={large ? "s-icon-lg" : "s-icon"} style={{ color: a.hex }} />
    </div>
  );
}

function Cover({ slide, a }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col items-center justify-center text-center s-padx">
      <Eyebrow a={a} text={slide.eyebrow} />
      <motion.h1 variants={item} className="font-display font-light s-title mt-[2.5cqw] max-w-[86%] clamp-3"><AccentText a={a}>{slide.title}</AccentText></motion.h1>
      {slide.subtitle && <motion.p variants={item} className="s-subtitle s-fg-2 mt-[2.5cqw] max-w-[66%] clamp-2">{slide.subtitle}</motion.p>}
    </motion.div>
  );
}

function Statement({ slide, a }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col justify-center s-padx">
      <Eyebrow a={a} text={slide.eyebrow} />
      <motion.h2 variants={item} className="font-display font-light s-title-sm mt-[2.5cqw] max-w-[88%] s-fg clamp-3">{slide.title}</motion.h2>
      <motion.div variants={item} className="mt-[2.5cqw] rounded-full" style={{ width: "14cqw", height: "0.7cqw", background: `linear-gradient(90deg, ${a.from}, ${a.to})` }} />
      {slide.subtitle && <motion.p variants={item} className="s-subtitle s-fg-3 mt-[2.5cqw] max-w-[70%] clamp-2">{slide.subtitle}</motion.p>}
    </motion.div>
  );
}

function Header({ slide, a }) {
  return (
    <>
      <Eyebrow a={a} text={slide.eyebrow} />
      <motion.h2 variants={item} className="font-display font-medium s-h2 mt-[1.6cqw] s-fg clamp-2">{slide.title}</motion.h2>
      {slide.subtitle && <motion.p variants={item} className="s-body s-fg-3 mt-[1.2cqw] max-w-[72%] clamp-2">{slide.subtitle}</motion.p>}
    </>
  );
}

function Agenda({ slide, a }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady overflow-hidden">
      <Header slide={slide} a={a} />
      <div className="mt-[2.5cqw] flex flex-col" style={{ gap: "1.4cqw" }}>
        {slide.items.map((it, i) => (
          <motion.div variants={item} key={i} className="flex items-center gap-[2cqw]">
            <span className="font-display font-light s-h3" style={{ color: a.hex, minWidth: "4cqw" }}>{String(i + 1).padStart(2, "0")}</span>
            <div className="flex-1 pb-[1.2cqw]" style={{ borderBottom: "1px solid var(--s-border)" }}>
              <div className="s-h3 font-medium s-fg clamp-2">{it.title}</div>
              {it.text && <div className="s-small s-fg-3 mt-[0.4cqw] clamp-2">{it.text}</div>}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Bullets({ slide, a }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady overflow-hidden">
      <Header slide={slide} a={a} />
      <div className="mt-[2.2cqw] grid grid-cols-2 gap-x-[3cqw] gap-y-[1.8cqw]">
        {slide.items.map((it, i) => (
          <motion.div variants={item} key={i} className="flex items-start gap-[1.6cqw]">
            <IconChip a={a} name={it.icon} />
            <div className="min-w-0">
              <div className="s-h3 font-semibold s-fg clamp-2">{it.title}</div>
              {it.text && <div className="s-body s-fg-3 mt-[0.6cqw] clamp-2">{it.text}</div>}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Metrics({ slide, a }) {
  const cols = Math.min(slide.metrics.length || 1, 4);
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady overflow-hidden">
      <Header slide={slide} a={a} />
      <div className="mt-[2.2cqw] grid gap-[1.8cqw]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {slide.metrics.map((m, i) => (
          <motion.div variants={item} key={i} className="rounded-3xl s-surface p-[1.6cqw] flex flex-col justify-center" style={{ borderColor: `${a.hex}33` }}>
            <div className="font-display font-light s-metric"><AccentText a={a}><NumberTicker value={m.value} prefix={m.prefix} suffix={m.suffix} /></AccentText></div>
            <div className="s-body s-fg-3 mt-[0.8cqw] clamp-2">{m.label}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function FeatureGrid({ slide, a }) {
  const n = slide.items.length || 1;
  const cols = n <= 2 ? 2 : 3;
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady overflow-hidden">
      <Header slide={slide} a={a} />
      <div className="mt-[3cqw] grid gap-[2cqw]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {slide.items.map((it, i) => (
          <motion.div variants={item} key={i} className="rounded-3xl s-surface p-[1.6cqw] flex flex-col gap-[1.2cqw]" style={{ borderColor: `${a.hex}26` }}>
            <IconChip a={a} name={it.icon} />
            <div className="s-h3 font-semibold s-fg clamp-2">{it.title}</div>
            {it.text && <div className="s-body s-fg-3 clamp-2">{it.text}</div>}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Showcase({ slide, a }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady overflow-hidden">
      <Header slide={slide} a={a} />
      <div className="mt-[2.2cqw] grid grid-cols-3 gap-[1.6cqw]">
        {slide.items.slice(0, 3).map((it, i) => (
          <motion.div variants={item} key={i} className="relative rounded-3xl p-[1.6cqw] flex flex-col gap-[1cqw] overflow-hidden" style={{ border: `1px solid ${a.hex}40`, background: `linear-gradient(160deg, ${a.soft}, var(--s-surface))` }}>
            <IconChip a={a} name={it.icon} large />
            <div className="s-h3 font-semibold s-fg clamp-2">{it.title}</div>
            {it.text && <div className="s-body s-fg-3 clamp-3">{it.text}</div>}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Bento({ slide, a }) {
  const items = slide.items.slice(0, 4);
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady overflow-hidden">
      <Header slide={slide} a={a} />
      <div className="mt-[2.5cqw] grid gap-[1.4cqw]" style={{ gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "1fr", maxHeight: "50cqh" }}>
        {items.map((it, i) => (
          <motion.div variants={item} key={i} className={`rounded-3xl s-surface p-[1.5cqw] flex flex-col justify-between overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : ""}`} style={{ borderColor: `${a.hex}26`, background: i === 0 ? a.soft : undefined }}>
            <IconChip a={a} name={it.icon} large={i === 0} />
            <div>
              <div className={`${i === 0 ? "s-h2" : "s-h3"} font-semibold s-fg clamp-2`}>{it.title}</div>
              {it.text && <div className="s-body s-fg-3 mt-[0.6cqw] clamp-2">{it.text}</div>}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Timeline({ slide, a }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady overflow-hidden">
      <Header slide={slide} a={a} />
      <div className="mt-[4cqw] relative">
        <div className="absolute top-[0.8cqw] left-0 right-0" style={{ height: "0.25cqw", background: `linear-gradient(90deg, ${a.from}, transparent)` }} />
        <div className="grid gap-[1.6cqw]" style={{ gridTemplateColumns: `repeat(${slide.timeline.length || 1}, 1fr)` }}>
          {slide.timeline.map((t, i) => (
            <motion.div variants={item} key={i} className="flex flex-col">
              <span className="rounded-full" style={{ width: "2cqw", height: "2cqw", background: a.hex, boxShadow: `0 0 14px ${a.hex}` }} />
              <div className="s-small font-mono mt-[1.2cqw]" style={{ color: a.hex }}>{t.label}</div>
              <div className="s-h3 font-semibold s-fg mt-[0.6cqw] clamp-2">{t.title}</div>
              {t.text && <div className="s-small s-fg-3 mt-[0.4cqw] clamp-2">{t.text}</div>}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Quote({ slide, a }) {
  const q = slide.quote || { text: slide.title };
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col justify-center s-padx">
      <motion.div variants={item} className="font-display leading-none" style={{ fontSize: "9cqw", color: a.hex, opacity: 0.5 }}>“</motion.div>
      <motion.blockquote variants={item} className="font-display font-light s-quote s-fg -mt-[3cqw] max-w-[85%] clamp-3">{q.text}</motion.blockquote>
      {(q.author || q.role) && (
        <motion.div variants={item} className="mt-[2.5cqw] flex items-center gap-[1.2cqw]">
          <span className="rounded-full" style={{ width: "2.6cqw", height: "0.35cqw", background: a.hex }} />
          <span className="s-body s-fg-2 font-semibold">{q.author}</span>
          {q.role && <span className="s-body s-fg-3">· {q.role}</span>}
        </motion.div>
      )}
    </motion.div>
  );
}

function Comparison({ slide, a }) {
  const c = slide.comparison || { leftTitle: "Before", rightTitle: "After", leftItems: [], rightItems: [] };
  const Col = ({ title, items, highlight }) => (
    <motion.div variants={item} className="rounded-3xl s-surface p-[1.8cqw] flex flex-col overflow-hidden" style={highlight ? { background: a.soft, borderColor: `${a.hex}55` } : undefined}>
      <div className="s-h3 font-semibold mb-[1.6cqw]" style={{ color: highlight ? a.hex : "var(--s-fg)" }}>{title}</div>
      <div className="flex flex-col gap-[1.1cqw]">
        {items.map((x, i) => (
          <div key={i} className="flex items-start gap-[1.1cqw]">
            <Icon name={highlight ? "CheckCircle2" : "XCircle"} className="s-icon shrink-0" style={{ color: highlight ? a.hex : "var(--s-fg-3)", marginTop: "0.2cqw" }} />
            <span className="s-body s-fg-2 clamp-2">{x}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady overflow-hidden">
      <Header slide={slide} a={a} />
      <div className="mt-[2.5cqw] grid grid-cols-2 gap-[2cqw]">
        <Col title={c.leftTitle} items={c.leftItems} highlight={false} />
        <Col title={c.rightTitle} items={c.rightItems} highlight={true} />
      </div>
    </motion.div>
  );
}

function Closing({ slide, a }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 h-full w-full flex flex-col items-center justify-center text-center s-padx">
      <Eyebrow a={a} text={slide.eyebrow || "Thank you"} />
      <motion.h1 variants={item} className="font-display font-light s-title mt-[2.5cqw] max-w-[86%] clamp-3"><AccentText a={a}>{slide.title}</AccentText></motion.h1>
      {slide.subtitle && <motion.p variants={item} className="s-subtitle s-fg-2 mt-[2.5cqw] max-w-[64%] clamp-2">{slide.subtitle}</motion.p>}
    </motion.div>
  );
}

const LAYOUTS = {
  cover: Cover, statement: Statement, agenda: Agenda, bullets: Bullets, metrics: Metrics,
  "feature-grid": FeatureGrid, showcase: Showcase, bento: Bento, timeline: Timeline,
  quote: Quote, comparison: Comparison, closing: Closing,
};

export default function SlideRenderer({ slide, mode = "dark" }) {
  const a = getAccent(slide.accent);
  const Layout = LAYOUTS[slide.layout] || Bullets;
  return (
    <div className="vibe-canvas h-full w-full" data-mode={mode}>
      <SlideBackground type={slide.background} accent={slide.accent} />
      <Layout slide={slide} a={a} />
      <EffectsLayer effects={slide.effects} accent={slide.accent} />
    </div>
  );
}
