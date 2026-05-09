"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Pill, Btn } from "@/components/ui";
import { G } from "@/components/icons";
import McpMark from "@/components/McpMark";

type Item = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  auth: string;
  secretCount: number;
  toolCount: number;
  installedCount: number;
  firstInstalledSlug: string | null;
};

export default function MarketGrid({ items, categories }: { items: Item[]; categories: string[] }) {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "installed" | "available">("all");

  const filtered = items.filter((t) => {
    if (cat !== "All" && t.category !== cat) return false;
    if (q && !`${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "installed" && t.installedCount === 0) return false;
    if (filter === "available" && t.installedCount > 0) return false;
    return true;
  });

  const installedCount = items.filter((i) => i.installedCount > 0).length;
  const availableCount = items.length - installedCount;

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>MCPs Add-Ons</h1>
          <p style={{ color: "var(--fg-muted)", marginTop: 4, fontSize: 14 }}>
            {items.length} templates · {installedCount} installed · {availableCount} ready to add
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--ink-50)", border: "1px solid var(--border)", borderRadius: 10, alignSelf: "flex-start" }}>
        {[
          ["all",       `All · ${items.length}`],
          ["available", `Available · ${availableCount}`],
          ["installed", `Installed · ${installedCount}`],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key as typeof filter)} style={{
            padding: "6px 14px", borderRadius: 6, border: 0,
            background: filter === key ? "var(--bg)" : "transparent",
            boxShadow: filter === key ? "var(--shadow-xs)" : "none",
            fontSize: 13, fontWeight: filter === key ? 500 : 400,
            color: filter === key ? "var(--fg)" : "var(--fg-muted)",
            cursor: "pointer", fontFamily: "var(--font-body)",
          }}>{label}</button>
        ))}
      </div>

      {/* Category + search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--ink-50)", border: "1px solid var(--border)", borderRadius: 10 }}>
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: "6px 12px", borderRadius: 6, border: 0,
              background: cat === c ? "var(--bg)" : "transparent",
              boxShadow: cat === c ? "var(--shadow-xs)" : "none",
              fontSize: 12.5, fontWeight: cat === c ? 500 : 400,
              color: cat === c ? "var(--fg)" : "var(--fg-muted)",
              cursor: "pointer", fontFamily: "var(--font-body)",
            }}>{c}</button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", display: "inline-flex" }}>
            <G name="search" size={14}/>
          </span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" style={{ paddingLeft: 32, width: 240, height: 34 }}/>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: 48, color: "var(--fg-muted)" }}>
            No templates match.
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {filtered.map((t) => {
            const isInstalled = t.installedCount > 0;
            return (
              <Card key={t.slug} hover padding={18}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <McpMark icon={t.icon} size={40}/>
                  {isInstalled
                    ? <Pill tone="success" dot>{t.installedCount} installed</Pill>
                    : <Pill tone="muted">Available</Pill>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "var(--fg-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {t.category} · {t.auth}
                </div>
                <p style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 10, lineHeight: 1.5, minHeight: 38 }}>
                  {t.description}
                </p>

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                  <span style={{ color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>
                    {t.toolCount} tools · {t.secretCount} secret{t.secretCount === 1 ? "" : "s"}
                  </span>
                  {isInstalled && t.firstInstalledSlug ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/mcps/${t.firstInstalledSlug}`}>
                        <Btn variant="secondary" size="sm">Manage</Btn>
                      </Link>
                      <Link href={`/mcps/new?template=${t.slug}`}>
                        <Btn variant="brand" size="sm" icon={<G name="plus" size={12}/>}>Add another</Btn>
                      </Link>
                    </div>
                  ) : (
                    <Link href={`/mcps/new?template=${t.slug}`}>
                      <Btn variant="primary" size="sm" icon={<G name="plus" size={12}/>}>Install</Btn>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
