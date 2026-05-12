"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KBD } from "./ui";
import { G } from "./icons";
import McpMark from "./McpMark";

type Hit = {
  type: "mcp" | "tool" | "template" | "page";
  href: string;
  title: string;
  subtitle: string;
  icon?: string;
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Global keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQ("");
      setHits([]);
    }
  }, [open]);

  // Run search whenever q changes (debounced lightly)
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { hits: Hit[] };
        setHits(data.hits || []);
        setActive(0);
      } finally {
        setLoading(false);
      }
    }, 80);
    return () => clearTimeout(id);
  }, [q, open]);

  function go(hit: Hit) {
    setOpen(false);
    router.push(hit.href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && hits[active]) { e.preventDefault(); go(hits[active]); }
  }

  return (
    <>
      {/* Trigger — replaces the static placeholder pill in the topbar */}
      <button
        className="topbar-search"
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 10px",
          border: "1px solid var(--border)", borderRadius: 8,
          background: "var(--ink-50)", width: 320, height: 36,
          color: "var(--fg-muted)", cursor: "pointer",
          fontFamily: "var(--font-body)", fontSize: 13, textAlign: "left",
        }}
      >
        <G name="search" size={14}/>
        <span className="topbar-search-text">Search MCPs, tools, pages…</span>
        <span className="topbar-kbd" style={{ marginLeft: "auto", display: "flex", gap: 4 }}><KBD>⌘</KBD><KBD>K</KBD></span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(10,10,11,0.45)",
            backdropFilter: "blur(2px)",
            display: "grid", placeItems: "start center", paddingTop: "12vh",
            animation: "monarch-fadein 120ms ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 580,
              background: "var(--bg)", borderRadius: 14,
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-xl)",
              overflow: "hidden", animation: "monarch-pop 140ms ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ display: "inline-flex", color: "var(--fg-muted)" }}><G name="search" size={18}/></span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search MCPs, tools, pages…"
                style={{
                  flex: 1, border: 0, padding: 0, fontSize: 16,
                  background: "transparent", outline: "none", boxShadow: "none",
                }}
              />
              <KBD>ESC</KBD>
            </div>

            <div style={{ maxHeight: 420, overflow: "auto", padding: 6 }}>
              {loading && hits.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: "var(--fg-muted)", fontSize: 13 }}>Searching…</div>
              )}
              {!loading && hits.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: "var(--fg-muted)", fontSize: 13 }}>
                  No results for &ldquo;{q}&rdquo;
                </div>
              )}
              {hits.map((h, i) => (
                <button
                  key={`${h.type}-${h.href}-${h.title}-${i}`}
                  onClick={() => go(h)}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%",
                    padding: "10px 12px", borderRadius: 8, border: 0, cursor: "pointer",
                    textAlign: "left",
                    background: i === active ? "var(--ink-50)" : "transparent",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {h.icon ? <McpMark icon={h.icon} size={28}/> : (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: "var(--ink-100)", color: "var(--ink-600)",
                      display: "grid", placeItems: "center",
                    }}><G name={h.type === "page" ? "dashboard" : "zap"} size={14}/></div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{h.title}</span>
                      <TypeBadge type={h.type}/>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.subtitle}</div>
                  </div>
                  {i === active && <span style={{ display: "inline-flex", color: "var(--fg-muted)" }}><G name="arrow" size={14}/></span>}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: "1px solid var(--border)", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>
              <span>{hits.length} results</span>
              <span><KBD>↑</KBD><KBD>↓</KBD> navigate · <KBD>↵</KBD> open · <KBD>ESC</KBD> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TypeBadge({ type }: { type: Hit["type"] }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    mcp:      { bg: "var(--brand-soft)", fg: "var(--brand-ink)" },
    template: { bg: "color-mix(in srgb, var(--success) 12%, transparent)", fg: "var(--success)" },
    tool:     { bg: "var(--ink-100)", fg: "var(--ink-600)" },
    page:     { bg: "color-mix(in srgb, var(--warning) 12%, transparent)", fg: "var(--warning)" },
  };
  const c = colors[type];
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 600, padding: "1px 6px", borderRadius: 999,
      background: c.bg, color: c.fg,
      letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: "var(--font-mono)",
    }}>{type}</span>
  );
}
