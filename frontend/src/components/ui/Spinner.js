export function Spinner({ size = 20, className = "" }) {
  return (
    <span
      className={`inline-block rounded-full animate-spin ${className}`}
      style={{
        width: size,
        height: size,
        border: "2px solid color-mix(in srgb, currentColor 25%, transparent)",
        borderTopColor: "currentColor",
      }}
    />
  );
}
