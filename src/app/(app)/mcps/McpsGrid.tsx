"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Pill, Btn } from "@/components/ui";
import McpMark from "@/components/McpMark";
import { G } from "@/components/icons";
import type { McpListItem } from "@/lib/mcps";

export default function McpsGrid({ mcps, categories }: { mcps: McpListItem[]; categories: string[] }) {
  const [cat, setCat] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [q, setQ] = useState("");

  const filtered = mcps.filter((m) =>
    (cat === "All" || m.template_category === cat) &&
    (q === "" || m.name.toLowerCase().includes(q.toLowerCase()) || m.template_name.toLowerCase().includes(q.toLowerCase()))
  );

  const liveCount = mcps.filter((m) => m.status === "active").length;

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>MCP servers</h1>
          <p style={{ color: "var(--fg-muted)", marginTop: 4, fontSize: 14 }}>
            {mcps.length} connectors · {liveCount} live · {mcps.length - liveCount} paused
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/mcps/new"><Btn variant="primary" icon={<G name="plus" size={14}/>}>New MCP</Btn></Link>
        </div>
      </div>

      {/* Filters */}
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", display: "inline-flex" }}>
              <G name="search" size={14}/>
            </span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" style={{ paddingLeft: 32, width: 200, height: 34 }}/>
          </div>
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <button onClick={() => setView("grid")} style={{
              padding: "7px 10px", border: 0, background: view === "grid" ? "var(--ink-900)" : "var(--bg)",
              color: view === "grid" ? "#fff" : "var(--fg-muted)", cursor: "pointer", display: "inline-flex",
            }}><G name="grid" size={14}/></button>
            <button onClick={() => setView("list")} style={{
              padding: "7px 10px", border: 0, background: view === "list" ? "var(--ink-900)" : "var(--bg)",
              color: view === "list" ? "#fff" : "var(--fg-muted)", cursor: "pointer", borderLeft: "1px solid var(--border)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: 48 }}>
            <p style={{ color: "var(--fg-muted)" }}>No MCPs match.</p>
          </div>
        </Card>
      ) : view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map((m) => (
            <Link key={m.id} href={`/mcps/${m.slug}`} style={{ display: "block" }}>
              <Card hover padding={18}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <McpMark icon={m.template_icon} size={40}/>
                  <Pill tone={m.status === "active" ? "success" : "muted"} dot>{m.status}</Pill>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "var(--fg-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {m.template_category} · {m.template_auth}
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <Mini label="Tools" value={`${m.enabled_tool_count}/${m.tool_count}`}/>
                  <Mini label="Secrets" value={String(m.secret_count)}/>
                  <Mini label="v" value={m.template_version}/>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card padding={0}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["MCP", "Category", "Auth", "Status", "Tools", "v", "Updated"].map((h, i) => (
                  <th key={i} style={{
                    textAlign: i >= 4 && i !== 6 ? "right" : "left", padding: "10px 16px",
                    fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-muted)",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    borderBottom: "1px solid var(--border)", fontWeight: 500,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                    <Link href={`/mcps/${m.slug}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <McpMark icon={m.template_icon} size={28}/>
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                    </Link>
                  </td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--fg-muted)" }}>{m.template_category}</td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{m.template_auth}</td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}><Pill tone={m.status === "active" ? "success" : "muted"} dot>{m.status}</Pill></td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                    {m.enabled_tool_count}<span style={{ color: "var(--fg-muted)" }}>/{m.tool_count}</span>
                  </td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-muted)" }}>{m.template_version}</td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--fg-muted)" }}>
                    {new Date(m.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: "var(--fg-muted)", fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, marginTop: 2 }}>{value}</div>
    </div>
  );
}
