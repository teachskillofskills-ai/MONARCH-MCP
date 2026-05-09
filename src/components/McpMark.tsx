"use client";

// Neutral monogram badge — replaces the colorful brand icons.
// Renders the first 1–2 letters of the passed identifier in a tonal square.

function pickInitials(s: string): string {
  if (!s) return "·";
  // Strip non-alpha chars, take first 1-2 visible letters
  const cleaned = s.replace(/[^A-Za-z0-9]/g, "");
  if (!cleaned) return s.slice(0, 1).toUpperCase();
  if (cleaned.length === 1) return cleaned.toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

export default function McpMark({ icon, size = 32 }: { icon: string; size?: number }) {
  const label = pickInitials(icon);
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: "var(--ink-50)",
      border: "1px solid var(--border)",
      color: "var(--ink-600)",
      display: "grid", placeItems: "center", flex: "0 0 auto",
      fontFamily: "var(--font-mono)",
      fontSize: Math.max(10, Math.round(size * 0.34)),
      fontWeight: 600,
      letterSpacing: "-0.02em",
      userSelect: "none",
    }}>
      {label}
    </div>
  );
}
