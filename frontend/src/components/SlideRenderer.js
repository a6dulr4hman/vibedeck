import { motion } from "framer-motion";
import Icon from "./Icon";
import NumberTicker from "./NumberTicker";
import { SlideBackground } from "./effects/Backgrounds";
import { accent as getAccent } from "../lib/accents";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

function AccentText({ a, children, className = "" }) {
  return (
    <span
      className={className}
      style={{
        backgroundImage: `linear-gradient(120deg, #ffffff, ${a.from})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {children}
    </span>
  );
}

function Eyebrow({ a, text }) {
  if (!text) return null;
  return (
    <motion.div
      variants={item}
      className="inline-flex items-center gap-[1.2cqw] rounded-full px-[2cqw] py-[1cqw] glass"
      style={{ borderColor: `${a.hex}55` }}
    >
      <span className="rounded-full" style={{ width: "1cqw", height: "1cqw", background: a.hex }} />
      <span className="s-eyebrow font-semibold" style={{ color: a.hex }}>
        {text}
      </span>
    </motion.div>
  );
}

function IconChip({ a, name, large }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl glass shrink-0"
      style={{
        background: a.soft,
        borderColor: `${a.hex}44`,
        width: large ? "6.5cqw" : "5.2cqw",
        height: large ? "6.5cqw" : "5.2cqw",
      }}
    >
      <Icon name={name} className={large ? "s-icon-lg" : "s-icon"} style={{ color: a.hex }} />
    </div>
  );
}

/* ============================================================= layouts */
function Cover({ slide, a }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 h-full w-full flex flex-col items-center justify-center text-center s-padx"
    >
      <Eyebrow a={a} text={slide.eyebrow} />
      <motion.h1 variants={item} className="font-display font-light s-title mt-[3cqw] max-w-[85%]">
        <AccentText a={a}>{slide.title}</AccentText>
      </motion.h1>
      {slide.subtitle && (
        <motion.p variants={item} className="s-subtitle text-zinc-300 mt-[3cqw] max-w-[68%]">
          {slide.subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

function Statement({ slide, a }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 h-full w-full flex flex-col justify-center s-padx"
    >
      <Eyebrow a={a} text={slide.eyebrow} />
      <motion.h2
        variants={item}
        className="font-display font-light s-title-sm mt-[3cqw] max-w-[88%] text-white"
      >
        {slide.title}
      </motion.h2>
      <motion.div
        variants={item}
        className="mt-[3.5cqw] rounded-full"
        style={{ width: "16cqw", height: "0.9cqw", background: `linear-gradient(90deg, ${a.from}, ${a.to})` }}
      />
      {slide.subtitle && (
        <motion.p variants={item} className="s-subtitle text-zinc-400 mt-[3cqw] max-w-[70%]">
          {slide.subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

function Header({ slide, a }) {
  return (
    <>
      <Eyebrow a={a} text={slide.eyebrow} />
      <motion.h2 variants={item} className="font-display font-medium s-h2 mt-[2cqw] text-white">
        {slide.title}
      </motion.h2>
      {slide.subtitle && (
        <motion.p variants={item} className="s-body text-zinc-400 mt-[1.5cqw] max-w-[70%]">
          {slide.subtitle}
        </motion.p>
      )}
    </>
  );
}

function Agenda({ slide, a }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady"
    >
      <Header slide={slide} a={a} />
      <div className="mt-[3cqw] flex flex-col s-gap" style={{ gap: "1.8cqw" }}>
        {slide.items.map((it, i) => (
          <motion.div variants={item} key={i} className="flex items-center gap-[2.5cqw]">
            <span
              className="font-display font-light s-h3"
              style={{ color: a.hex, minWidth: "5cqw" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex-1 border-b border-white/10 pb-[1.5cqw]">
              <div className="s-h3 font-medium text-white">{it.title}</div>
              {it.text && <div className="s-small text-zinc-400 mt-[0.6cqw]">{it.text}</div>}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Bullets({ slide, a }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady"
    >
      <Header slide={slide} a={a} />
      <div className="mt-[3.5cqw] grid grid-cols-2 gap-x-[4cqw] gap-y-[3cqw]">
        {slide.items.map((it, i) => (
          <motion.div variants={item} key={i} className="flex items-start gap-[2cqw]">
            <IconChip a={a} name={it.icon} />
            <div>
              <div className="s-h3 font-semibold text-white">{it.title}</div>
              {it.text && <div className="s-body text-zinc-400 mt-[0.8cqw]">{it.text}</div>}
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
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady"
    >
      <Header slide={slide} a={a} />
      <div className="mt-[4cqw] grid gap-[3cqw]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {slide.metrics.map((m, i) => (
          <motion.div
            variants={item}
            key={i}
            className="rounded-3xl glass p-[2.5cqw] flex flex-col justify-center"
            style={{ borderColor: `${a.hex}33` }}
          >
            <div className="font-display font-light s-metric">
              <AccentText a={a}>
                <NumberTicker value={m.value} prefix={m.prefix} suffix={m.suffix} />
              </AccentText>
            </div>
            <div className="s-body text-zinc-400 mt-[1cqw]">{m.label}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function FeatureGrid({ slide, a }) {
  const n = slide.items.length || 1;
  const cols = n <= 4 ? 2 : 3;
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady"
    >
      <Header slide={slide} a={a} />
      <div className="mt-[3.5cqw] grid gap-[2.5cqw]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {slide.items.map((it, i) => (
          <motion.div
            variants={item}
            key={i}
            className="rounded-3xl glass p-[2.4cqw] flex flex-col gap-[1.4cqw]"
            style={{ borderColor: `${a.hex}26` }}
          >
            <IconChip a={a} name={it.icon} />
            <div className="s-h3 font-semibold text-white">{it.title}</div>
            {it.text && <div className="s-body text-zinc-400">{it.text}</div>}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Bento({ slide, a }) {
  const items = slide.items.slice(0, 6);
  // first item spans 2 columns / 2 rows for visual rhythm
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady"
    >
      <Header slide={slide} a={a} />
      <div
        className="mt-[3cqw] grid gap-[2cqw]"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", gridAutoRows: "1fr", flex: 1, maxHeight: "52cqh" }}
      >
        {items.map((it, i) => (
          <motion.div
            variants={item}
            key={i}
            className={`rounded-3xl glass p-[2cqw] flex flex-col justify-between ${
              i === 0 ? "col-span-2 row-span-2" : "col-span-2"
            }`}
            style={{ borderColor: `${a.hex}26`, background: i === 0 ? a.soft : undefined }}
          >
            <IconChip a={a} name={it.icon} large={i === 0} />
            <div>
              <div className={`${i === 0 ? "s-h2" : "s-h3"} font-semibold text-white`}>{it.title}</div>
              {it.text && <div className="s-body text-zinc-400 mt-[0.8cqw]">{it.text}</div>}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Timeline({ slide, a }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady"
    >
      <Header slide={slide} a={a} />
      <div className="mt-[5cqw] relative">
        <div
          className="absolute top-[1cqw] left-0 right-0"
          style={{ height: "0.3cqw", background: `linear-gradient(90deg, ${a.from}, transparent)` }}
        />
        <div
          className="grid gap-[2cqw]"
          style={{ gridTemplateColumns: `repeat(${slide.timeline.length || 1}, 1fr)` }}
        >
          {slide.timeline.map((t, i) => (
            <motion.div variants={item} key={i} className="flex flex-col">
              <span className="rounded-full" style={{ width: "2.4cqw", height: "2.4cqw", background: a.hex, boxShadow: `0 0 16px ${a.hex}` }} />
              <div className="s-small font-mono mt-[1.6cqw]" style={{ color: a.hex }}>{t.label}</div>
              <div className="s-h3 font-semibold text-white mt-[0.8cqw]">{t.title}</div>
              {t.text && <div className="s-small text-zinc-400 mt-[0.6cqw]">{t.text}</div>}
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
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 h-full w-full flex flex-col justify-center s-padx"
    >
      <motion.div variants={item} className="font-display leading-none" style={{ fontSize: "12cqw", color: a.hex, opacity: 0.5 }}>
        “
      </motion.div>
      <motion.blockquote variants={item} className="font-display font-light s-quote text-white -mt-[4cqw] max-w-[85%]">
        {q.text}
      </motion.blockquote>
      {(q.author || q.role) && (
        <motion.div variants={item} className="mt-[3cqw] flex items-center gap-[1.6cqw]">
          <span className="rounded-full" style={{ width: "3.2cqw", height: "0.4cqw", background: a.hex }} />
          <span className="s-body text-zinc-300 font-semibold">{q.author}</span>
          {q.role && <span className="s-body text-zinc-500">· {q.role}</span>}
        </motion.div>
      )}
    </motion.div>
  );
}

function Comparison({ slide, a }) {
  const c = slide.comparison || { leftTitle: "Before", rightTitle: "After", leftItems: [], rightItems: [] };
  const Col = ({ title, items, highlight }) => (
    <motion.div
      variants={item}
      className="rounded-3xl glass p-[2.6cqw] flex flex-col"
      style={highlight ? { background: a.soft, borderColor: `${a.hex}55` } : {}}
    >
      <div className="s-h3 font-semibold mb-[2cqw]" style={{ color: highlight ? a.hex : "#fff" }}>{title}</div>
      <div className="flex flex-col gap-[1.4cqw]">
        {items.map((x, i) => (
          <div key={i} className="flex items-start gap-[1.4cqw]">
            <Icon
              name={highlight ? "CheckCircle2" : "XCircle"}
              className="s-icon shrink-0"
              style={{ color: highlight ? a.hex : "#71717a", marginTop: "0.2cqw" }}
            />
            <span className="s-body text-zinc-300">{x}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 h-full w-full flex flex-col justify-center s-padx s-pady"
    >
      <Header slide={slide} a={a} />
      <div className="mt-[3cqw] grid grid-cols-2 gap-[2.5cqw]">
        <Col title={c.leftTitle} items={c.leftItems} highlight={false} />
        <Col title={c.rightTitle} items={c.rightItems} highlight={true} />
      </div>
    </motion.div>
  );
}

function Closing({ slide, a }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 h-full w-full flex flex-col items-center justify-center text-center s-padx"
    >
      <Eyebrow a={a} text={slide.eyebrow || "Thank you"} />
      <motion.h1 variants={item} className="font-display font-light s-title mt-[3cqw] max-w-[85%]">
        <AccentText a={a}>{slide.title}</AccentText>
      </motion.h1>
      {slide.subtitle && (
        <motion.p variants={item} className="s-subtitle text-zinc-300 mt-[3cqw] max-w-[64%]">
          {slide.subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

const LAYOUTS = {
  cover: Cover,
  statement: Statement,
  agenda: Agenda,
  bullets: Bullets,
  metrics: Metrics,
  "feature-grid": FeatureGrid,
  bento: Bento,
  timeline: Timeline,
  quote: Quote,
  comparison: Comparison,
  closing: Closing,
};

export default function SlideRenderer({ slide }) {
  const a = getAccent(slide.accent);
  const Layout = LAYOUTS[slide.layout] || Bullets;
  return (
    <div className="vibe-canvas h-full w-full bg-ink-800">
      <SlideBackground type={slide.background} accent={slide.accent} />
      <Layout slide={slide} a={a} />
    </div>
  );
}
