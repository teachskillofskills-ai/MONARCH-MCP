import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getMcpBySlug } from "@/lib/mcps";
import { updateMcpMeta, updateMcpSecrets } from "@/lib/actions/mcp";
import { isGoogleTemplate } from "@/lib/google-oauth-flow";
import { Card, Pill, Btn, Field } from "@/components/ui";
import McpMark from "@/components/McpMark";
import { G } from "@/components/icons";
import CopyButton from "@/components/CopyButton";
import ToolToggle from "@/components/ToolToggle";
import TestConsole from "@/components/TestConsole";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function McpDetailPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ google_connected?: string; google_error?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = getMcpBySlug(slug);
  if (!data) notFound();
  const { mcp, template, secrets, config, tools } = data;
  const isGoogle = isGoogleTemplate(mcp.template_slug);
  const googleConnected = secrets.some((s) => s.key === "GOOGLE_OAUTH_REFRESH_TOKEN");

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:4000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const localUrl = `${proto}://${host}/api/mcp/${mcp.slug}`;
  const enabledTools = tools.filter((t) => t.enabled);

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <Link href="/mcps" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--fg-muted)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
        ← Back to MCPs
      </Link>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <McpMark icon={(template as { icon?: string })?.icon || "Plug"} size={56}/>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 28, fontWeight: 600 }}>{mcp.name}</h1>
              <Pill tone={mcp.status === "active" ? "success" : "muted"} dot>{mcp.status}</Pill>
            </div>
            <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{mcp.template_name}</span>
              {mcp.description && <span> · {mcp.description}</span>}
            </p>
          </div>
        </div>
        <DeleteButton slug={mcp.slug} name={mcp.name}/>
      </div>

      {/* OAuth callback flash */}
      {sp.google_connected && (
        <div style={{
          padding: "12px 14px", borderRadius: 10,
          background: "color-mix(in srgb, var(--success) 10%, transparent)",
          color: "var(--success)", fontSize: 13.5,
          border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <G name="check" size={18}/>
          <span>
            <strong>Connected!</strong> Refresh token saved.
            {sp.google_connected !== "1" && <> Google account: <code>{sp.google_connected}</code></>}
          </span>
        </div>
      )}
      {sp.google_error && (
        <div style={{
          padding: "12px 14px", borderRadius: 10,
          background: "color-mix(in srgb, var(--danger) 10%, transparent)",
          color: "var(--danger)", fontSize: 13.5,
          border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
        }}>
          Google sign-in failed: <code>{sp.google_error}</code>
        </div>
      )}

      {/* Connect Google card (only on Google MCPs) */}
      {isGoogle && (
        <Card style={{
          background: googleConnected ? "var(--bg)" : "linear-gradient(135deg, #fff 0%, #f0f4ff 100%)",
          border: googleConnected ? "1px solid var(--border)" : "1px solid color-mix(in srgb, var(--brand) 25%, transparent)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: googleConnected ? "color-mix(in srgb, var(--success) 12%, transparent)" : "var(--brand-soft)",
                color: googleConnected ? "var(--success)" : "var(--brand-ink)",
                display: "grid", placeItems: "center", flex: "0 0 auto",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24"><path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.6a4.8 4.8 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6a6 6 0 0 1-9-3.2H2.9v2.7A10 10 0 0 0 12 22z"/><path fill="#FBBC04" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.5H2.9a10 10 0 0 0 0 9z"/><path fill="#EA4335" d="M12 6.2a5.4 5.4 0 0 1 3.8 1.5l2.9-2.9A10 10 0 0 0 2.9 7.5l3.5 2.7c.8-2.5 3.1-4 5.6-4z"/></svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {googleConnected ? "Google account connected" : "Connect Google account"}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2 }}>
                  {googleConnected
                    ? "Refresh token is saved and auto-renews on every API call."
                    : "Sign in with Google to authorize this MCP — no manual OAuth Playground needed."}
                </div>
              </div>
            </div>
            <a href={`/api/google/start?mcp=${mcp.slug}`}>
              <Btn variant={googleConnected ? "secondary" : "primary"} icon={<G name="link" size={14}/>}>
                {googleConnected ? "Reconnect / switch account" : "Connect Google account"}
              </Btn>
            </a>
          </div>
        </Card>
      )}

      {/* Endpoint card */}
      <Card style={{ background: "var(--ink-50)", borderColor: "var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
              MCP Endpoint URL · paste into Claude
            </div>
            <code style={{
              display: "block", fontSize: 14, fontFamily: "var(--font-mono)", color: "var(--brand)",
              background: "var(--bg)", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{localUrl}</code>
          </div>
          <CopyButton value={localUrl}/>
        </div>
      </Card>

      <div className="stat-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Settings */}
        <Card padding={0}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <h3>Settings</h3>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>Display info and serving status</p>
          </div>
          <form action={updateMcpMeta.bind(null, mcp.slug)} style={{ padding: 18, display: "grid", gap: 14 }}>
            <Field label="Display Name">
              <input name="name" defaultValue={mcp.name} required/>
            </Field>
            <Field label="Status">
              <select name="status" defaultValue={mcp.status}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </Field>
            <Field label="Description">
              <input name="description" defaultValue={mcp.description || ""}/>
            </Field>
            <div><Btn variant="primary" type="submit" icon={<G name="check" size={14}/>}>Save</Btn></div>
          </form>
        </Card>

        {/* Secrets & Config */}
        <Card padding={0}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <h3>Secrets &amp; configuration</h3>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>Encrypted at rest with AES-256-GCM. Leave blank to keep current.</p>
          </div>
          <form action={updateMcpSecrets.bind(null, mcp.slug)} style={{ padding: 18, display: "grid", gap: 14 }}>
            {template?.secretKeys.map((s) => {
              const exists = secrets.some((row) => row.key === s.key);
              return (
                <Field key={s.key} label={s.label} hint={s.helpText} right={exists ? <Pill tone="success" dot>Set</Pill> : <Pill tone="muted">Empty</Pill>}>
                  <input name={`secret_${s.key}`} type="password" placeholder={exists ? "•••••••• (current)" : "(not set)"}/>
                </Field>
              );
            })}
            {template?.configKeys.map((c) => {
              const existing = config.find((row) => row.key === c.key)?.value;
              return (
                <Field key={c.key} label={c.label} hint={c.helpText}>
                  <input name={`config_${c.key}`} defaultValue={existing || ""} placeholder={c.defaultValue}/>
                </Field>
              );
            })}
            <div><Btn variant="primary" type="submit" icon={<G name="check" size={14}/>}>Save secrets &amp; config</Btn></div>
          </form>
        </Card>
      </div>

      {/* Tools toggles */}
      <Card padding={0}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3>Tools <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-muted)", fontWeight: 400 }}> · {enabledTools.length}/{tools.length} enabled</span></h3>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>Disabled tools are hidden from <code>tools/list</code>.</p>
          </div>
        </div>
        <div style={{ padding: 8 }}>
          {tools.map((t) => (
            <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <code style={{ fontSize: 13, color: "var(--brand)", fontFamily: "var(--font-mono)" }}>{t.name}</code>
                <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{t.description}</p>
              </div>
              <ToolToggle slug={mcp.slug} toolName={t.name} initial={t.enabled}/>
            </div>
          ))}
        </div>
      </Card>

      {/* Test console */}
      <Card padding={0}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <h3>Test console</h3>
          <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>Call any enabled tool directly. Identical to what Claude does.</p>
        </div>
        <div style={{ padding: 18 }}>
          <TestConsole slug={mcp.slug} tools={enabledTools.map((t) => ({ name: t.name, description: t.description }))}/>
        </div>
      </Card>
    </div>
  );
}
