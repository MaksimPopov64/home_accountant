import { ImageResponse } from "next/og";

// The app's "Б" mark at any size. `maskable` leaves the safe-zone padding Android expects.
export function appIcon(size: number, { maskable = false, rounded = true } = {}) {
  const glyph = Math.round(size * (maskable ? 0.42 : 0.56));
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          borderRadius: rounded && !maskable ? Math.round(size * 0.22) : 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: glyph,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        Б
      </div>
    ),
    { width: size, height: size },
  );
}
