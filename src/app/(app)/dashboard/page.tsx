import Link from "next/link";
import { listMcps } from "@/lib/mcps";
import { listTemplates } from "@/lib/templates";
import { Card, Pill, Btn } from "@/components/ui";
import McpMark from "@/components/McpMark";
import { G } from "@/components/icons";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const mcps = listMcps();
  const templates = listTemplates();
  const totalTools = mcps.reduce((sum, m) => sum + m.enabled_tool_count, 0);
  const liveCount = mcps.filter((m) => m.status === "active").length;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ padding: 24, display: "grid", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            {today} · IST
          </div>
          <h1>Welcome back, Monarch.</h1>
          <p style={{ color: "var(--fg-muted)", marginTop: 6, fontSize: 14.5 }}>
            {mcps.length === 0
              ? "No MCPs yet — let's create your first one."
              : `${liveCount} of ${mcps.length} MCPs live · ${totalTools} tools exposed total.`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/mcps"><Btn variant="secondary" icon={<G name="grid" size={14}/>}>All MCPs</Btn></Link>
          <Link href="/mcps/new"><Btn variant="primary" icon={<G name="plus" size={14}/>}>New MCP</Btn></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <Stat label="Active MCPs" value={String(liveCount)} sub={`${mcps.length} total · ${mcps.length - liveCount} paused`} tone="success"/>
        <Stat label="Tools exposed" value={String(totalTools)} sub="across all MCPs" tone="brand"/>
        <Stat label="Templates" value={String(templates.length)} sub="ready to instantiate" tone="muted"/>
        <Stat label="Endpoints" value={String(mcps.length)} sub="at /api/mcp/*" tone="muted"/>
      </div>

      {/* MCPs table + activity placeholder */}
      <div className="stat-grid-2" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <Card padding={0}>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
            <h3>Your MCPs</h3>
            <Link href="/mcps"><Btn variant="ghost" size="sm">See all <G name="chev" size={12}/></Btn></Link>
          </div>
          {mcps.length === 0 ? (
            <div style={{ padding: 64, textAlign: "center" }}>
              <p style={{ color: "var(--fg-muted)", marginBottom: 16 }}>You haven&apos;t created any MCPs yet.</p>
              <Link href="/mcps/new"><Btn variant="primary" icon={<G name="plus" size={14}/>}>Create your first MCP</Btn></Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["MCP", "Template", "Status", "Tools", "Endpoint"].map((h, i) => (
                    <th key={i} style={{
                      textAlign: i === 3 ? "right" : "left", padding: "10px 20px",
                      fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-muted)",
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      borderBottom: "1px solid var(--border)", fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mcps.slice(0, 8).map((m) => (
                  <tr key={m.id}>
                    <td style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)" }}>
                      <Link href={`/mcps/${m.slug}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <McpMark icon={m.template_icon} size={28}/>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>
                            {m.template_category} · v{m.template_version}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", fontSize: 13, color: "var(--fg-muted)" }}>
                      {m.template_name}
                    </td>
                    <td style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)" }}>
                      <Pill tone={m.status === "active" ? "success" : "muted"} dot>{m.status}</Pill>
                    </td>
                    <td style={{ padding: "10px 20px", textAlign: "right", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                      {m.enabled_tool_count}<span style={{ color: "var(--fg-muted)" }}>/{m.tool_count}</span>
                    </td>
                    <td style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)" }}>
                      <code style={{ fontSize: 11, padding: "2px 8px", background: "var(--ink-50)", borderRadius: 4, color: "var(--brand)" }}>
                        /api/mcp/{m.slug}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card padding={0}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <h3>Quick actions</h3>
          </div>
          <div style={{ padding: 16, display: "grid", gap: 8 }}>
            <Link href="/mcps/new"><Btn variant="secondary" style={{ width: "100%", justifyContent: "flex-start" }} icon={<G name="plus" size={14}/>}>Create new MCP</Btn></Link>
            <Link href="/keys"><Btn variant="secondary" style={{ width: "100%", justifyContent: "flex-start" }} icon={<G name="key" size={14}/>}>Manage key vault</Btn></Link>
            <Link href="/activity"><Btn variant="secondary" style={{ width: "100%", justifyContent: "flex-start" }} icon={<G name="activity" size={14}/>}>View activity log</Btn></Link>
            <Link href="/settings"><Btn variant="secondary" style={{ width: "100%", justifyContent: "flex-start" }} icon={<G name="settings" size={14}/>}>Settings</Btn></Link>
          </div>
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Templates available</div>
            <div style={{ display: "grid", gap: 6 }}>
              {templates.map((t) => (
                <Link key={t.slug} href={`/mcps/new?template=${t.slug}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13 }}>
                  <McpMark icon={t.icon} size={20}/>
                  <span>{t.name}</span>
                  <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)" }}>{t.tools.length}t</span>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "success" | "brand" | "muted" }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-muted)",
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>{label}</div>
        <Pill tone={tone}>●</Pill>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 10, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 6 }}>{sub}</div>
    </Card>
  );
}
