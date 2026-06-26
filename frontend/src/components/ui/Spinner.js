export function Spinner({ size = 20, className = "" }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-white/20 border-t-white animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
