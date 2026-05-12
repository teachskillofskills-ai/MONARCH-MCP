"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Btn, Pill } from "@/components/ui";
import { G } from "@/components/icons";

type BlobItem = { url: string; pathname: string; size: number; uploadedAt: string; contentType?: string };
type BlobFolder = { pathname: string };
type Stats = { totalBytes: number; fileCount: number };

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function isImage(pathname: string, ct?: string): boolean {
  if (ct?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(pathname);
}

function leaf(pathname: string): string {
  const trimmed = pathname.replace(/\/$/, "");
  return trimmed.split("/").pop() || pathname;
}

export default function StorageBrowser() {
  const [prefix, setPrefix] = useState("");
  const [blobs, setBlobs] = useState<BlobItem[]>([]);
  const [folders, setFolders] = useState<BlobFolder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/storage/list?prefix=${encodeURIComponent(prefix)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to list");
      setBlobs(j.blobs || []);
      setFolders(j.folders || []);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [prefix]);

  const refreshStats = useCallback(async () => {
    try {
      const r = await fetch("/api/storage/stats");
      const j = await r.json();
      if (r.ok) setStats(j);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { refreshStats(); }, [refreshStats]);

  function enterFolder(folderPath: string) {
    setSelected(new Set());
    setPrefix(folderPath);
  }

  function goUp() {
    setSelected(new Set());
    const parts = prefix.replace(/\/$/, "").split("/").filter(Boolean);
    parts.pop();
    setPrefix(parts.length ? parts.join("/") + "/" : "");
  }

  function toggleSelect(url: string) {
    const next = new Set(selected);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setSelected(next);
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} file${selected.size === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const r = await fetch("/api/storage/file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: Array.from(selected) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setSelected(new Set());
      await Promise.all([refresh(), refreshStats()]);
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  async function renameOne(blob: BlobItem) {
    const current = blob.pathname;
    const next = prompt("Rename to (full pathname):", current);
    if (!next || next === current) return;
    setBusy(true);
    try {
      const r = await fetch("/api/storage/file", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUrl: blob.url, toPathname: next }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      await refresh();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prefix", prefix);
      const r = await fetch("/api/storage/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      await Promise.all([refresh(), refreshStats()]);
    } catch (e) { alert((e as Error).message); }
    finally { setUploading(false); }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
  }

  const breadcrumb = [{ label: "/", path: "" }, ...prefix.split("/").filter(Boolean).map((p, i, all) => ({
    label: p,
    path: all.slice(0, i + 1).join("/") + "/",
  }))];

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Storage</h1>
          <p style={{ color: "var(--fg-muted)", marginTop: 4, fontSize: 14 }}>
            Vercel Blob bucket — browse, upload, rename, delete
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={() => { refresh(); refreshStats(); }} disabled={loading || busy} icon={<G name="refresh" size={14}/>}>
            Refresh
          </Btn>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
              e.target.value = "";
            }}
          />
          <Btn variant="primary" onClick={() => fileInputRef.current?.click()} disabled={uploading} icon={<G name="upload" size={14}/>}>
            {uploading ? "Uploading…" : "Upload file"}
          </Btn>
        </div>
      </div>

      {/* Stats card */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Stat label="Total used" value={stats ? fmtBytes(stats.totalBytes) : "…"} sub="all files combined"/>
        <Stat label="Files" value={stats ? String(stats.fileCount) : "…"} sub="across entire bucket"/>
        <Stat label="Plan" value="Pay-as-you-go" sub="Vercel Blob — no fixed quota"/>
      </div>

      {/* Breadcrumb + selection bar */}
      <Card padding={0}>
        <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--fg-muted)", flexWrap: "wrap" }}>
            {breadcrumb.map((b, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => { setSelected(new Set()); setPrefix(b.path); }} style={{
                  background: "transparent", border: 0, padding: "2px 6px",
                  color: i === breadcrumb.length - 1 ? "var(--fg)" : "var(--fg-muted)",
                  cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 13,
                  textDecoration: i < breadcrumb.length - 1 ? "underline" : "none",
                }}>{b.label || "/"}</button>
                {i < breadcrumb.length - 1 && <span style={{ opacity: 0.4 }}>/</span>}
              </span>
            ))}
          </div>
          {selected.size > 0 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{selected.size} selected</span>
              <Btn variant="secondary" size="sm" onClick={() => setSelected(new Set())}>Clear</Btn>
              <Btn variant="danger" size="sm" onClick={deleteSelected} disabled={busy} icon={<G name="trash" size={12}/>}>Delete</Btn>
            </div>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--fg-muted)" }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: "var(--danger)", fontSize: 13 }}>{error}</div>
        ) : folders.length === 0 && blobs.length === 0 ? (
          <div style={{ padding: 64, textAlign: "center", color: "var(--fg-muted)" }}>
            <p style={{ marginBottom: 16 }}>Empty folder.</p>
            <Btn variant="primary" onClick={() => fileInputRef.current?.click()} icon={<G name="upload" size={14}/>}>
              Upload your first file
            </Btn>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ width: 36, padding: "10px 0 10px 16px" }}/>
                <th style={{ width: 56, padding: "10px 8px" }}/>
                <th style={th("left")}>Name</th>
                <th style={th("right")}>Size</th>
                <th style={th("left")}>Uploaded</th>
                <th style={{ width: 200, padding: "10px 16px" }}/>
              </tr>
            </thead>
            <tbody>
              {prefix && (
                <tr style={{ cursor: "pointer" }} onClick={goUp}>
                  <td/>
                  <td style={{ textAlign: "center", color: "var(--fg-muted)" }}><G name="arrow" size={16}/></td>
                  <td style={td()}><span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>..</span></td>
                  <td colSpan={3}/>
                </tr>
              )}
              {folders.map((f) => (
                <tr key={f.pathname} style={{ cursor: "pointer" }} onClick={() => enterFolder(f.pathname)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ink-50)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td/>
                  <td style={{ textAlign: "center" }}>
                    <FolderIcon/>
                  </td>
                  <td style={td()}>
                    <span style={{ fontWeight: 500 }}>{leaf(f.pathname)}</span>
                    <span style={{ marginLeft: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)" }}>folder</span>
                  </td>
                  <td colSpan={3}/>
                </tr>
              ))}
              {blobs.map((b) => {
                const isSel = selected.has(b.url);
                const img = isImage(b.pathname, b.contentType);
                return (
                  <tr key={b.url}
                      style={{ background: isSel ? "var(--brand-soft)" : "transparent" }}
                      onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "var(--ink-50)"; }}
                      onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ paddingLeft: 16, textAlign: "center" }}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleSelect(b.url)} style={{ width: "auto", margin: 0 }}/>
                    </td>
                    <td style={{ textAlign: "center", padding: "8px 0" }}>
                      {img ? (
                        <button onClick={() => setPreviewUrl(b.url)} style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>
                          <img src={b.url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}/>
                        </button>
                      ) : (
                        <FileIcon name={leaf(b.pathname)}/>
                      )}
                    </td>
                    <td style={td()}>
                      <div style={{ fontWeight: 500 }}>{leaf(b.pathname)}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>{b.pathname}</div>
                    </td>
                    <td style={td("right")}>{fmtBytes(b.size)}</td>
                    <td style={td()}><span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{new Date(b.uploadedAt).toLocaleString()}</span></td>
                    <td style={{ padding: "8px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <IconBtn label="Copy URL" icon="copy" onClick={() => copyUrl(b.url)}/>
                        <a href={`/api/storage/file?url=${encodeURIComponent(b.url)}`} download style={{ textDecoration: "none" }}>
                          <IconBtn label="Download" icon="download"/>
                        </a>
                        <IconBtn label="Rename" icon="edit" onClick={() => renameOne(b)}/>
                        <IconBtn label="Delete" icon="trash" danger onClick={async () => {
                          if (!confirm(`Delete ${leaf(b.pathname)}?`)) return;
                          await fetch("/api/storage/file", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: [b.url] }) });
                          await Promise.all([refresh(), refreshStats()]);
                        }}/>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Preview modal */}
      {previewUrl && (
        <div onClick={() => setPreviewUrl(null)} style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(10,10,11,0.7)", display: "grid", placeItems: "center", padding: 24,
        }}>
          <img src={previewUrl} alt="" style={{
            maxWidth: "92vw", maxHeight: "88vh",
            borderRadius: 12, boxShadow: "var(--shadow-xl)",
          }}/>
        </div>
      )}
    </div>
  );
}

function th(align: "left" | "right" = "left"): React.CSSProperties {
  return {
    textAlign: align, padding: "10px 16px",
    fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-muted)",
    letterSpacing: "0.06em", textTransform: "uppercase",
    borderBottom: "1px solid var(--border)", fontWeight: 500,
  };
}

function td(align: "left" | "right" = "left"): React.CSSProperties {
  return { padding: "8px 16px", textAlign: align, borderBottom: "1px solid var(--border)", fontSize: 13 };
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, marginTop: 6, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function FolderIcon() {
  return (
    <div style={{ width: 36, height: 36, borderRadius: 6, background: "color-mix(in srgb, var(--brand) 12%, transparent)", color: "var(--brand-ink)", display: "grid", placeItems: "center", margin: "0 auto" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/></svg>
    </div>
  );
}

function FileIcon({ name }: { name: string }) {
  const ext = (name.split(".").pop() || "").toUpperCase().slice(0, 4);
  return (
    <div style={{ width: 36, height: 36, borderRadius: 6, background: "var(--ink-100)", color: "var(--ink-600)", display: "grid", placeItems: "center", margin: "0 auto", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600 }}>
      {ext || "F"}
    </div>
  );
}

function IconBtn({ label, icon, onClick, danger }: { label: string; icon: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button title={label} onClick={onClick} style={{
      width: 28, height: 28, padding: 0,
      background: "transparent", border: "1px solid var(--border)",
      color: danger ? "var(--danger)" : "var(--fg-muted)",
      borderRadius: 6, cursor: "pointer", display: "inline-grid", placeItems: "center",
      transition: "all 120ms",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = danger ? "color-mix(in srgb, var(--danger) 8%, transparent)" : "var(--ink-50)"; e.currentTarget.style.color = danger ? "var(--danger)" : "var(--fg)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = danger ? "var(--danger)" : "var(--fg-muted)"; }}
    >
      <G name={icon} size={13}/>
    </button>
  );
}
