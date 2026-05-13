"use client";

import { useEffect, useState } from "react";
import { Btn, Field, Pill } from "./ui";
import { G } from "./icons";

const SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

type McpStatus = { slug: string; name: string; description: string | null; template: string; connected: boolean };

export default function BulkGoogleAuth() {
  const [mcps, setMcps] = useState<McpStatus[] | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [scope, setScope] = useState<"all" | "missing">("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function loadStatus() {
    try {
      const r = await fetch("/api/google/bulk-connect");
      const j = await r.json();
      if (r.ok) {
        setMcps(j.mcps);
        if (j.defaults?.client_id && !clientId) setClientId(j.defaults.client_id);
        if (j.defaults?.client_secret && !clientSecret) setClientSecret(j.defaults.client_secret);
      }
    } catch { /* ignore */ }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadStatus(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!refreshToken.trim()) { setMsg({ tone: "err", text: "Refresh token required" }); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/google/bulk-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, scope }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setMsg({ tone: "ok", text: `Connected ${j.applied_to} MCP${j.applied_to === 1 ? "" : "s"}: ${j.mcps.join(", ")}${j.skipped ? ` (${j.skipped} skipped)` : ""}` });
      setRefreshToken("");
      await loadStatus();
    } catch (e) {
      setMsg({ tone: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  // OAuth Playground deeplink — pre-loads scopes and redirect URI hint.
  // The user still has to paste their client_id/secret in the Playground settings
  // because Playground can't accept those from URL params.
  const playgroundUrl = `https://developers.google.com/oauthplayground/?scopes=${encodeURIComponent(SCOPES.join(" "))}`;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Status of Google MCPs */}
      {mcps && mcps.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Google MCPs ({mcps.length})
          </div>
          {mcps.map((m) => (
            <div key={m.slug} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", borderRadius: 8,
              background: "var(--ink-50)", border: "1px solid var(--border)",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>
                  /api/mcp/{m.slug}
                </div>
              </div>
              {m.connected
                ? <Pill tone="success" dot>Connected</Pill>
                : <Pill tone="muted">No token</Pill>}
            </div>
          ))}
        </div>
      )}

      {/* Step instructions */}
      <div style={{
        padding: 14, borderRadius: 10,
        background: "var(--brand-soft)",
        border: "1px solid color-mix(in srgb, var(--brand) 25%, transparent)",
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--brand-ink)", marginBottom: 8 }}>
          How to get a refresh token (one-time, ~2 min)
        </div>
        <ol style={{ margin: 0, paddingLeft: 22, fontSize: 13, lineHeight: 1.6, color: "var(--brand-ink)" }}>
          <li>
            Open <a href={playgroundUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", fontWeight: 500 }}>OAuth Playground</a>
            {" "}(scopes are pre-filled)
          </li>
          <li>Click the ⚙ gear (top right) → check &quot;Use your own OAuth credentials&quot; → paste the client ID + secret below into Playground</li>
          <li>Click the blue &quot;Authorize APIs&quot; button → sign in with the Google account that owns your Ads/GA4/GSC data → approve</li>
          <li>On the next screen, click &quot;Exchange authorization code for tokens&quot;</li>
          <li>Copy the value of <code>refresh_token</code> from the response → paste it below → click <strong>Apply</strong></li>
        </ol>
      </div>

      {/* Form */}
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <Field label="Client ID" hint="Defaults to SyncMaster.json — change only if using a different OAuth client">
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}/>
        </Field>
        <Field label="Client Secret">
          <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}/>
        </Field>
        <Field label="Refresh Token (paste from OAuth Playground)" hint="Starts with 1//…">
          <input type="password" value={refreshToken} onChange={(e) => setRefreshToken(e.target.value)} placeholder="1//…" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }} required/>
        </Field>

        <Field label="Apply to">
          <select value={scope} onChange={(e) => setScope(e.target.value as "all" | "missing")}>
            <option value="all">All Google MCPs ({mcps?.length || "?"}) — overwrites existing</option>
            <option value="missing">Only MCPs that don&apos;t have a token yet</option>
          </select>
        </Field>

        {msg && (
          <div style={{
            padding: "10px 12px", borderRadius: 8, fontSize: 13,
            background: msg.tone === "ok"
              ? "color-mix(in srgb, var(--success) 10%, transparent)"
              : "color-mix(in srgb, var(--danger) 10%, transparent)",
            color: msg.tone === "ok" ? "var(--success)" : "var(--danger)",
            border: `1px solid color-mix(in srgb, ${msg.tone === "ok" ? "var(--success)" : "var(--danger)"} 25%, transparent)`,
          }}>{msg.text}</div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="primary" type="submit" disabled={busy} icon={<G name="check" size={14}/>}>
            {busy ? "Verifying & saving…" : "Apply to all Google MCPs"}
          </Btn>
          <Btn variant="ghost" type="button" onClick={() => { setRefreshToken(""); setMsg(null); }}>
            Clear
          </Btn>
        </div>
      </form>
    </div>
  );
}
