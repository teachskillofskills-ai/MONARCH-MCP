import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSystemInfo } from "@/lib/system-info";
import { Card, Pill, Btn, Avatar } from "@/components/ui";
import { G } from "@/components/icons";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import BulkGoogleAuth from "@/components/BulkGoogleAuth";

export const dynamic = "force-dynamic";

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${seconds % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const sys = getSystemInfo();

  return (
    <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 980 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ color: "var(--fg-muted)", marginTop: 4 }}>Account, security, and system information</p>
      </div>

      {/* Account card */}
      <Section title="Account" subtitle="Identity for this Monarch instance">
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 4 }}>
          <Avatar s={user?.username.slice(0, 2).toUpperCase() || "??"} size={48}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{user?.username}</div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>
              user_id={user?.id} · created {user?.created_at?.slice(0, 10)}
            </div>
          </div>
          <Pill tone="brand" dot>local admin</Pill>
        </div>
      </Section>

      {/* Password */}
      <Section title="Change password" subtitle="Updates the bcrypt hash on the user record. Logs you out of nothing — your current session stays valid.">
        <PasswordChangeForm/>
      </Section>

      {/* Bulk Google connection */}
      <Section title="Google authentication" subtitle="Paste a refresh token once → it powers all Google MCPs (Ads, GA4, Search Console)">
        <BulkGoogleAuth/>
      </Section>

      {/* Encryption */}
      <Section title="Encryption" subtitle="Master key controls AES-256-GCM encryption of all stored secrets">
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: sys.master_key_set ? "color-mix(in srgb, var(--success) 12%, transparent)" : "color-mix(in srgb, var(--danger) 12%, transparent)",
            color: sys.master_key_set ? "var(--success)" : "var(--danger)",
            display: "grid", placeItems: "center",
          }}>
            <G name="lock" size={20}/>
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>Master key {sys.master_key_set ? "configured" : "MISSING"}</div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
              fingerprint: <code>{sys.master_key_fingerprint}</code> · stored in <code>MONARCH_MASTER_KEY</code> env var
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 6, lineHeight: 1.45 }}>
              {sys.master_key_set
                ? "If this key is lost, all stored secrets become unrecoverable. Back it up somewhere safe."
                : "Set MONARCH_MASTER_KEY in .env.local and restart — encryption will not work without it."}
            </div>
          </div>
          <Btn variant="secondary" disabled icon={<G name="refresh" size={14}/>} title="Coming in v2">Rotate (soon)</Btn>
        </div>
      </Section>

      {/* System */}
      <Section title="System" subtitle="Live database statistics">
        <div className="stat-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
          <Stat label="MCPs"        value={`${sys.active_mcp_count}/${sys.mcp_count}`} sub="active / total"/>
          <Stat label="Templates"   value={String(sys.template_count)} sub="loaded"/>
          <Stat label="Secrets"     value={String(sys.secret_count)}   sub="encrypted"/>
          <Stat label="Audit rows"  value={String(sys.audit_event_count)} sub="logged"/>
        </div>
        <div className="stat-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <KV k="Database path" v={sys.database_path}/>
          <KV k="Database size" v={`${sys.database_size_kb.toLocaleString()} KB`}/>
          <KV k="Node version" v={sys.node_version}/>
          <KV k="App version" v={`v${sys.version}`}/>
          <KV k="Uptime" v={fmtDuration(sys.uptime_seconds)}/>
          <KV k="Started at" v={new Date(sys.app_started_at).toLocaleString()}/>
        </div>
      </Section>

      {/* Data */}
      <Section title="Data" subtitle="Export everything (encrypted secrets stay encrypted)">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Export DB as JSON</div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4 }}>
              Downloads users, MCPs, templates, secrets (still encrypted), config, tools, and the last 1000 audit rows. Restoring on another machine requires the same MONARCH_MASTER_KEY.
            </div>
          </div>
          <a href="/api/account/export" download>
            <Btn variant="primary" icon={<G name="download" size={14}/>}>Download</Btn>
          </a>
        </div>
      </Section>

      {/* About */}
      <Section title="About" subtitle="">
        <div className="stat-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          <div>
            <strong style={{ color: "var(--fg)" }}>Project Monarch</strong> — single-user MCP control plane.
            Manage every MCP server you run from one place. Built for TechShu.
          </div>
          <div>
            <div>Stack: Next.js 15 · TypeScript · Tailwind v4 · better-sqlite3 · bcryptjs</div>
            <div style={{ marginTop: 6 }}>Encryption: AES-256-GCM · Auth: HMAC cookies</div>
            <div style={{ marginTop: 6 }}>
              <Link href="/keys" style={{ color: "var(--brand)" }}>Key vault</Link>
              {" · "}
              <Link href="/activity" style={{ color: "var(--brand)" }}>Activity</Link>
              {" · "}
              <Link href="/mcps" style={{ color: "var(--brand)" }}>MCPs</Link>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card padding={0}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <h3>{title}</h3>
        {subtitle && <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{subtitle}</p>}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: "var(--ink-50)", border: "1px solid var(--border)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, marginTop: 6, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 12px", borderRadius: 8, background: "var(--ink-50)", border: "1px solid var(--border)",
      gap: 12,
    }}>
      <span style={{ fontSize: 12, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>{k}</span>
      <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }} title={v}>{v}</span>
    </div>
  );
}
