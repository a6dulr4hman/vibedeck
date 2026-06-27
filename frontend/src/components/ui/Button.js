import { motion } from "framer-motion";

export function Button({ children, variant = "primary", className = "", as: As = "button", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed select-none";
  const variants = {
    primary: "bg-ink text-white px-6 py-3 hover:opacity-90 hover:scale-[1.02] active:scale-100",
    magic:
      "px-6 py-3 text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 hover:scale-[1.02] active:scale-100 shadow-[0_8px_24px_rgba(139,92,246,0.3)]",
    peach:
      "px-6 py-3 text-white hover:scale-[1.02] active:scale-100 shadow-[0_8px_24px_rgba(251,146,90,0.35)] bg-gradient-to-r from-[#fbbf90] to-[#fb7185]",
    secondary: "bg-white border border-black/10 text-ink px-6 py-3 hover:bg-black/[0.03] hover:border-black/20",
    ghost: "text-zinc-600 px-4 py-2 hover:text-ink hover:bg-black/5",
    danger: "bg-rose-50 border border-rose-200 text-rose-600 px-5 py-2.5 hover:bg-rose-100",
  };
  return (
    <As className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </As>
  );
}

export function MotionButton(props) {
  return <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} {...props} />;
}
