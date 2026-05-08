import { getDb } from "@/lib/db";
import { Card } from "@/components/ui";
import { G } from "@/components/icons";
import SecretRow from "@/components/SecretRow";

export const dynamic = "force-dynamic";

export default function KeyVaultPage() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.id, s.key, s.encrypted_value,
              m.slug AS mcp_slug, m.name AS mcp_name,
              t.icon AS template_icon
       FROM mcp_secrets s
       JOIN mcps m ON m.id = s.mcp_id
       JOIN mcp_templates t ON t.id = m.template_id
       ORDER BY m.slug, s.key`
    )
    .all() as {
      id: number; key: string; encrypted_value: string;
      mcp_slug: string; mcp_name: string; template_icon: string;
    }[];

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Key vault</h1>
          <p style={{ color: "var(--fg-muted)", marginTop: 4 }}>
            {rows.length} secret{rows.length === 1 ? "" : "s"} · all AES-256-GCM encrypted at rest · auto-hide on reveal after 30s
          </p>
        </div>
      </div>

      <Card padding={0}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "1.4fr 1.2fr 2.4fr auto",
          alignItems: "center", gap: 16,
          padding: "10px 16px",
          background: "var(--ink-50)",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--font-mono)", fontSize: 10.5,
          color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500,
        }}>
          <span>MCP</span>
          <span>Key</span>
          <span>Value</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--fg-muted)" }}>
            No secrets stored yet. Add an MCP and provide its credentials.
          </div>
        ) : (
          rows.map((r) => (
            <SecretRow
              key={r.id}
              mcpSlug={r.mcp_slug}
              mcpName={r.mcp_name}
              templateIcon={r.template_icon}
              secretKey={r.key}
              preview={`${"•".repeat(28)}${r.encrypted_value.slice(-6)}`}
            />
          ))
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "var(--brand-soft)",
            color: "var(--brand-ink)", display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <G name="lock" size={18}/>
          </div>
          <div style={{ flex: 1, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55 }}>
            Secrets are encrypted with AES-256-GCM using a master key in <code style={{ background: "var(--ink-50)", padding: "1px 6px", borderRadius: 4 }}>MONARCH_MASTER_KEY</code>. Click the eye to decrypt and view; copy puts it on your clipboard; edit replaces it. Plaintext only lives in memory and (when revealed) in the DOM for up to 30 seconds.
          </div>
        </div>
      </Card>
    </div>
  );
}
