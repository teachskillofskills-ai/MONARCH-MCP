"use client";

import { CSSProperties, ReactNode, ButtonHTMLAttributes } from "react";

// ── Pill ──────────────────────────────────────────────────────
const TONES = {
  success: { bg: "color-mix(in srgb, var(--success) 12%, transparent)", fg: "var(--success)" },
  warn:    { bg: "color-mix(in srgb, var(--warning) 12%, transparent)", fg: "var(--warning)" },
  danger:  { bg: "color-mix(in srgb, var(--danger) 12%, transparent)",  fg: "var(--danger)" },
  brand:   { bg: "var(--brand-soft)",                                   fg: "var(--brand-ink)" },
  muted:   { bg: "var(--ink-100)",                                      fg: "var(--ink-600)" },
} as const;
export type Tone = keyof typeof TONES;

export function Pill({ tone = "muted", children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  const c = TONES[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px", borderRadius: 999,
      fontSize: 12, fontWeight: 500, letterSpacing: "-0.01em",
      background: c.bg, color: c.fg, whiteSpace: "nowrap",
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: c.fg }}/>}
      {children}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "brand" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
};

export function Btn({ variant = "secondary", size = "md", icon, children, style, ...rest }: BtnProps) {
  const sizes = { sm: { p: "6px 10px", f: 12, h: 28 }, md: { p: "8px 14px", f: 13, h: 34 }, lg: { p: "10px 18px", f: 14, h: 40 } };
  const s = sizes[size];
  const variants = {
    primary:   { bg: "var(--ink-900)", fg: "#fff",            bd: "var(--ink-900)" },
    secondary: { bg: "var(--bg)",      fg: "var(--fg)",       bd: "var(--border)" },
    ghost:     { bg: "transparent",    fg: "var(--fg)",       bd: "transparent" },
    brand:     { bg: "var(--brand)",   fg: "#fff",            bd: "var(--brand)" },
    danger:    { bg: "transparent",    fg: "var(--danger)",   bd: "var(--border)" },
  };
  const v = variants[variant];
  return (
    <button
      {...rest}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center",
        padding: s.p, height: s.h, fontSize: s.f, fontWeight: 500, letterSpacing: "-0.01em",
        borderRadius: 8, cursor: rest.disabled ? "not-allowed" : "pointer",
        background: v.bg, color: v.fg, border: `1px solid ${v.bd}`,
        opacity: rest.disabled ? 0.5 : 1, transition: "all 120ms",
        fontFamily: "var(--font-body)",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (rest.disabled) return;
        if (variant === "secondary") e.currentTarget.style.background = "var(--ink-50)";
        if (variant === "ghost") e.currentTarget.style.background = "var(--ink-50)";
        if (variant === "primary") e.currentTarget.style.background = "var(--ink-700)";
        if (variant === "brand") e.currentTarget.style.background = "var(--brand-ink)";
      }}
      onMouseLeave={(e) => {
        if (rest.disabled) return;
        e.currentTarget.style.background = v.bg;
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────
export function Card({
  children, padding = 20, onClick, hover, style,
}: {
  children: ReactNode; padding?: number | string; onClick?: () => void; hover?: boolean; style?: CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12,
        padding, cursor: onClick ? "pointer" : "default",
        transition: "border-color 160ms, box-shadow 160ms",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (hover || onClick) {
          e.currentTarget.style.borderColor = "var(--ink-300)";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        }
      }}
      onMouseLeave={(e) => {
        if (hover || onClick) {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >{children}</div>
  );
}

// ── Field ─────────────────────────────────────────────────────
export function Field({
  label, hint, right, children,
}: {
  label: string; hint?: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--fg)", letterSpacing: "-0.005em" }}>{label}</span>
        {right}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 6, fontFamily: "var(--font-mono)" }}>{hint}</div>}
    </label>
  );
}

// ── Avatar ────────────────────────────────────────────────────
export function Avatar({ s, size = 32, mono = false }: { s: string; size?: number; mono?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flex: "0 0 auto",
      background: mono ? "var(--ink-100)" : "var(--brand-soft)",
      color: mono ? "var(--ink-700)" : "var(--brand-ink)",
      display: "grid", placeItems: "center",
      fontFamily: "var(--font-mono)", fontSize: Math.round(size * 0.36), fontWeight: 600,
      letterSpacing: "-0.01em",
    }}>{s}</div>
  );
}

// ── KBD ───────────────────────────────────────────────────────
export function KBD({ children }: { children: ReactNode }) {
  return (
    <kbd style={{
      fontFamily: "var(--font-mono)", fontSize: 11, padding: "2px 6px",
      border: "1px solid var(--border)", borderBottomWidth: 2, borderRadius: 4,
      background: "var(--bg)", color: "var(--fg-muted)",
    }}>{children}</kbd>
  );
}
