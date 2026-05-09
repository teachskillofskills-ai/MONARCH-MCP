"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Btn, Field, Pill } from "@/components/ui";
import { G } from "@/components/icons";
import McpMark from "@/components/McpMark";

type Template = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  auth: string;
  setupUrl: string;
  setupSteps: string[];
  secretKeys: { key: string; label: string; helpText?: string }[];
  configKeys: { key: string; label: string; defaultValue?: string; helpText?: string }[];
  toolCount: number;
};

export default function NewMcpPage() {
  const search = useSearchParams();
  const router = useRouter();

  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [picked, setPicked] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d: { templates: Template[] }) => {
        setTemplates(d.templates);
        const wanted = search.get("template");
        if (wanted) {
          const t = d.templates.find((x) => x.slug === wanted);
          if (t) pickTemplate(t);
        }
      })
      .catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickTemplate(t: Template) {
    setPicked(t);
    const initialConfig: Record<string, string> = {};
    for (const c of t.configKeys) if (c.defaultValue) initialConfig[c.key] = c.defaultValue;
    setConfig(initialConfig);
    setSecrets({});
    if (!name) {
      setName(t.name);
      setSlug(t.slug);
    }
  }

  async function submit() {
    setError(null);
    if (!picked || !name.trim()) {
      setError("Pick a template and give it a name");
      return;
    }
    const fd = new FormData();
    fd.set("template", picked.slug);
    fd.set("name", name.trim());
    fd.set("slug", slug.trim() || name.trim());
    fd.set("description", description.trim());
    for (const [k, v] of Object.entries(secrets)) fd.set(`secret_${k}`, v);
    for (const [k, v] of Object.entries(config)) fd.set(`config_${k}`, v);

    startTransition(async () => {
      const res = await fetch("/api/mcps", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || "Failed to create");
        return;
      }
      router.push(`/mcps/${j.slug}`);
      router.refresh();
    });
  }

  if (templates === null) {
    return <div style={{ padding: 24, color: "var(--fg-muted)" }}>Loading templates…</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 920, display: "grid", gap: 20 }}>
      <Link href="/mcps" style={{ color: "var(--fg-muted)", fontSize: 13, fontFamily: "var(--font-mono)" }}>← Back to MCPs</Link>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Create MCP</h1>
        <p style={{ color: "var(--fg-muted)", marginTop: 4 }}>Pick a template, name it, paste your credentials. Live the moment you save.</p>
      </div>

      {/* Step 1: pick template */}
      <Card padding={0}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <Step n={1}/>
          <h3>Pick a template</h3>
        </div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {templates.map((t) => (
            <button key={t.slug} type="button" onClick={() => pickTemplate(t)} style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8,
              padding: 14, borderRadius: 10, cursor: "pointer", textAlign: "left",
              background: picked?.slug === t.slug ? "var(--brand-soft)" : "var(--bg)",
              border: `1px solid ${picked?.slug === t.slug ? "var(--brand)" : "var(--border)"}`,
              transition: "all 120ms",
              fontFamily: "var(--font-body)",
            }}>
              <McpMark icon={t.icon} size={32}/>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.4 }}>{t.description}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <Pill tone="muted">{t.category}</Pill>
                <Pill tone="muted">{t.toolCount} tools</Pill>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {picked && (
        <>
          <Card padding={0}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <Step n={2}/>
              <h3>Name and URL</h3>
            </div>
            <div style={{ padding: 18, display: "grid", gap: 14 }}>
              <Field label="Display name" hint="Shown in the dashboard">
                <input value={name} onChange={(e) => {
                  setName(e.target.value);
                  if (!slug || slug === picked.slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
                }} placeholder="e.g. LinkedIn — Rachel"/>
              </Field>
              <Field label="Slug" hint={`Endpoint will be /api/mcp/${slug || "<slug>"}`}>
                <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} style={{ fontFamily: "var(--font-mono)" }}/>
              </Field>
              <Field label="Description (optional)">
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this instance for?"/>
              </Field>
            </div>
          </Card>

          {/* Setup instructions */}
          {picked.setupSteps?.length > 0 && (
            <Card padding={0} style={{ background: "var(--brand-soft)", borderColor: "color-mix(in srgb, var(--brand) 30%, transparent)" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid color-mix(in srgb, var(--brand) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ display: "inline-flex", color: "var(--brand-ink)" }}><G name="book" size={16}/></span>
                  <h3 style={{ color: "var(--brand-ink)" }}>How to get your {picked.name} credentials</h3>
                </div>
                {picked.setupUrl && (
                  <a href={picked.setupUrl} target="_blank" rel="noreferrer" style={{
                    fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--brand-ink)",
                    display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "underline",
                  }}>
                    Open dashboard <G name="arrow" size={12}/>
                  </a>
                )}
              </div>
              <ol style={{ padding: "14px 36px", margin: 0, color: "var(--brand-ink)", fontSize: 13, lineHeight: 1.65 }}>
                {picked.setupSteps.map((step, i) => (<li key={i} style={{ marginBottom: 4 }}>{step}</li>))}
              </ol>
            </Card>
          )}

          {(picked.secretKeys.length + picked.configKeys.length > 0) && (
            <Card padding={0}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <Step n={3}/>
                <h3>Credentials &amp; configuration</h3>
              </div>
              <div style={{ padding: 18, display: "grid", gap: 14 }}>
                {picked.secretKeys.map((s) => (
                  <Field key={s.key} label={s.label} hint={s.helpText}>
                    <input type="password" value={secrets[s.key] || ""} onChange={(e) => setSecrets({ ...secrets, [s.key]: e.target.value })} style={{ fontFamily: "var(--font-mono)" }}/>
                  </Field>
                ))}
                {picked.configKeys.map((c) => (
                  <Field key={c.key} label={c.label} hint={c.helpText}>
                    <input value={config[c.key] || ""} onChange={(e) => setConfig({ ...config, [c.key]: e.target.value })} placeholder={c.defaultValue} style={{ fontFamily: "var(--font-mono)" }}/>
                  </Field>
                ))}
              </div>
            </Card>
          )}

          {error && (
            <div style={{ padding: 12, borderRadius: 8, background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)", fontSize: 13, border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={submit} disabled={pending || !name.trim()} icon={<G name="zap" size={14}/>}>
              {pending ? "Creating…" : "Create MCP"}
            </Btn>
            <Link href="/mcps"><Btn variant="ghost">Cancel</Btn></Link>
          </div>
        </>
      )}
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span style={{
      width: 22, height: 22, borderRadius: 999, background: "var(--ink-900)",
      color: "#fff", display: "inline-grid", placeItems: "center",
      fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)",
    }}>{n}</span>
  );
}
