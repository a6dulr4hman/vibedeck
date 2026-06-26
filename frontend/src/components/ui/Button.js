import { motion } from "framer-motion";

export function Button({ children, variant = "primary", className = "", as: As = "button", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed select-none";
  const variants = {
    primary:
      "bg-white text-black px-6 py-3 hover:scale-[1.03] active:scale-100 shadow-[0_4px_24px_rgba(255,255,255,0.12)]",
    magic:
      "relative px-6 py-3 text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 hover:scale-[1.03] active:scale-100 shadow-[0_8px_30px_rgba(139,92,246,0.35)]",
    secondary:
      "bg-white/5 border border-white/10 text-white px-6 py-3 hover:bg-white/10 hover:border-white/20",
    ghost: "text-zinc-300 px-4 py-2 hover:text-white hover:bg-white/5",
    danger:
      "bg-rose-500/10 border border-rose-500/30 text-rose-300 px-5 py-2.5 hover:bg-rose-500/20",
  };
  return (
    <As className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </As>
  );
}

export function MotionButton(props) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    />
  );
}
