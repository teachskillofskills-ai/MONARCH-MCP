"use client";

import { Brand, BRAND_KEYS } from "./icons";

export default function McpMark({ icon, size = 32 }: { icon: string; size?: number }) {
  const Comp = (BRAND_KEYS.includes(icon as keyof typeof Brand) ? Brand[icon as keyof typeof Brand] : Brand.Plug);
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: "var(--bg)", border: "1px solid var(--border)",
      display: "grid", placeItems: "center", flex: "0 0 auto", overflow: "hidden",
    }}>
      <Comp size={Math.round(size * 0.7)}/>
    </div>
  );
}
