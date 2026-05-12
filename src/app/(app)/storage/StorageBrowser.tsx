"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Btn } from "@/components/ui";
import { G } from "@/components/icons";

type BlobItem = { url: string; pathname: string; size: number; uploadedAt: string; contentType?: string };
type BlobFolder = { pathname: string };
type Stats = { totalBytes: number; fileCount: number };
type View = "list" | "grid";
type Sort = "name" | "size-desc" | "newest" | "oldest";

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

function fileExt(pathname: string): string {
  const m = pathname.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : "FILE";
}

export default function StorageBrowser() {
  const [prefix, setPrefix] = useState("");
  const [blobs, setBlobs] = useState<BlobItem[]>([]);
  const [folders, setFolders] = useState<BlobFolder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("list");
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
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
    setStatsLoading(true);
    try {
      const r = await fetch("/api/storage/stats");
      const j = await r.json();
      if (r.ok) setStats(j);
    } catch { /* ignore */ }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { refreshStats(); }, [refreshStats]);

  // Auto-switch to grid view if folder is image-heavy
  useEffect(() => {
    const total = blobs.length;
    const images = blobs.filter((b) => isImage(b.pathname, b.contentType)).length;
    if (total > 0 && images / total > 0.6 && view !== "grid") {
      setView("grid");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix, blobs.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = blobs;
    if (q) arr = arr.filter((b) => leaf(b.pathname).toLowerCase().includes(q) || b.pathname.toLowerCase().includes(q));
    arr = [...arr].sort((a, b) => {
      switch (sort) {
        case "name":      return leaf(a.pathname).localeCompare(leaf(b.pathname));
        case "size-desc": return b.size - a.size;
        case "oldest":    return +new Date(a.uploadedAt) - +new Date(b.uploadedAt);
        default:          return +new Date(b.uploadedAt) - +new Date(a.uploadedAt);
      }
    });
    return arr;
  }, [blobs, query, sort]);

  const filteredFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter((f) => leaf(f.pathname).toLowerCase().includes(q));
  }, [folders, query]);

  function enterFolder(folderPath: string) {
    setSelected(new Set());
    setQuery("");
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

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((b) => b.url)));
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

  async function deleteOne(blob: BlobItem) {
    if (!confirm(`Delete ${leaf(blob.pathname)}?`)) return;
    setBusy(true);
    try {
      await fetch("/api/storage/file", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: [blob.url] }) });
      await Promise.all([refresh(), refreshStats()]);
    } finally { setBusy(false); }
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

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading({ done: 0, total: arr.length });
    try {
      for (let i = 0; i < arr.length; i++) {
        const fd = new FormData();
        fd.append("file", arr[i]);
        fd.append("prefix", prefix);
        const r = await fetch("/api/storage/upload", { method: "POST", body: fd });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(`${arr[i].name}: ${j.error || r.status}`);
        }
        setUploading({ done: i + 1, total: arr.length });
      }
      await Promise.all([refresh(), refreshStats()]);
    } catch (e) { alert((e as Error).message); }
    finally { setUploading(null); }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl((c) => (c === url ? null : c)), 1800);
  }

  const breadcrumb = [{ label: "Root", path: "" }, ...prefix.split("/").filter(Boolean).map((p, i, all) => ({
    label: p,
    path: all.slice(0, i + 1).join("/") + "/",
  }))];

  return (
    <div
      style={{ padding: 24, display: "grid", gap: 16, position: "relative" }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Storage</h1>
          <p style={{ color: "var(--fg-muted)", marginTop: 4, fontSize: 14 }}>
            Browse, upload, rename, delete · drag-and-drop files anywhere on this page
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={() => { refresh(); refreshStats(); }} disabled={loading || busy} icon={<G name="refresh" size={14}/>}>
            Refresh
          </Btn>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Btn variant="primary" onClick={() => fileInputRef.current?.click()} disabled={!!uploading} icon={<G name="upload" size={14}/>}>
            {uploading ? `Uploading ${uploading.done}/${uploading.total}…` : "Upload files"}
          </Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <Stat
          label="Total used"
          value={statsLoading && !stats ? "Calculating…" : (stats ? fmtBytes(stats.totalBytes) : "—")}
          sub={stats ? `${stats.fileCount} files across the whole bucket` : "scanning bucket"}
          loading={statsLoading && !stats}
        />
        <Stat
          label="In this folder"
          value={loading ? "…" : `${blobs.length} files · ${folders.length} folders`}
          sub={blobs.length > 0 ? fmtBytes(blobs.reduce((s, b) => s + b.size, 0)) : "empty"}
          loading={loading}
        />
      </div>

      {/* Toolbar */}
      <Card padding={0}>
        <div style={{
          padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid var(--border)", gap: 12, flexWrap: "wrap",
        }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--fg-muted)", flexWrap: "wrap", minWidth: 0 }}>
            {breadcrumb.map((b, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => { setSelected(new Set()); setPrefix(b.path); }} style={{
                  background: "transparent", border: 0, padding: "4px 6px", borderRadius: 4,
                  color: i === breadcrumb.length - 1 ? "var(--fg)" : "var(--fg-muted)",
                  fontWeight: i === breadcrumb.length - 1 ? 500 : 400,
                  cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 13,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ink-50)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >{b.label}</button>
                {i < breadcrumb.length - 1 && <G name="chev" size={11}/>}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", display: "inline-flex" }}>
                <G name="search" size={13}/>
              </span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter…"
                style={{ paddingLeft: 30, width: 180, height: 30, fontSize: 13 }}/>
            </div>

            {/* Sort */}
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
              style={{ width: "auto", height: 30, fontSize: 13, padding: "0 28px 0 10px" }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A→Z</option>
              <option value="size-desc">Largest first</option>
            </select>

            {/* View toggle */}
            <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <button onClick={() => setView("list")} title="List view" style={{
                padding: "6px 9px", border: 0, cursor: "pointer", display: "inline-flex",
                background: view === "list" ? "var(--ink-900)" : "var(--bg)",
                color: view === "list" ? "#fff" : "var(--fg-muted)",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              </button>
              <button onClick={() => setView("grid")} title="Grid view" style={{
                padding: "6px 9px", border: 0, cursor: "pointer", display: "inline-flex",
                background: view === "grid" ? "var(--ink-900)" : "var(--bg)",
                color: view === "grid" ? "#fff" : "var(--fg-muted)",
                borderLeft: "1px solid var(--border)",
              }}>
                <G name="grid" size={13}/>
              </button>
            </div>
          </div>
        </div>

        {/* Selection bar (slides in when selected) */}
        {selected.size > 0 && (
          <div style={{
            padding: "10px 14px", borderBottom: "1px solid var(--border)",
            background: "var(--brand-soft)", color: "var(--brand-ink)",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{selected.size} selected</span>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn variant="secondary" size="sm" onClick={() => setSelected(new Set())}>Clear</Btn>
              <Btn variant="danger" size="sm" onClick={deleteSelected} disabled={busy} icon={<G name="trash" size={12}/>}>Delete</Btn>
            </div>
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--fg-muted)" }}>Loading files…</div>
        ) : error ? (
          <div style={{ padding: 24, color: "var(--danger)", fontSize: 13 }}>{error}</div>
        ) : filteredFolders.length === 0 && filtered.length === 0 ? (
          <EmptyState onUpload={() => fileInputRef.current?.click()} hasQuery={!!query}/>
        ) : view === "list" ? (
          <ListView
            prefix={prefix}
            folders={filteredFolders}
            blobs={filtered}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onEnterFolder={enterFolder}
            onUp={goUp}
            onPreview={setPreviewUrl}
            onCopyUrl={copyUrl}
            copiedUrl={copiedUrl}
            onRename={renameOne}
            onDelete={deleteOne}
          />
        ) : (
          <GridView
            prefix={prefix}
            folders={filteredFolders}
            blobs={filtered}
            selected={selected}
            onToggleSelect={toggleSelect}
            onEnterFolder={enterFolder}
            onUp={goUp}
            onPreview={setPreviewUrl}
            onCopyUrl={copyUrl}
            copiedUrl={copiedUrl}
            onRename={renameOne}
            onDelete={deleteOne}
          />
        )}
      </Card>

      {/* Preview lightbox */}
      {previewUrl && (
        <div onClick={() => setPreviewUrl(null)} style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(10,10,11,0.85)", display: "grid", placeItems: "center", padding: 24,
          cursor: "zoom-out",
        }}>
          <img src={previewUrl} alt="" style={{ maxWidth: "92vw", maxHeight: "88vh", borderRadius: 8, boxShadow: "var(--shadow-xl)" }}/>
        </div>
      )}

      {/* Drag-drop overlay */}
      {dragOver && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 90,
          background: "color-mix(in srgb, var(--brand) 12%, transparent)",
          border: "3px dashed var(--brand)",
          display: "grid", placeItems: "center", pointerEvents: "none",
        }}>
          <div style={{
            background: "var(--bg)", padding: "20px 30px", borderRadius: 12,
            boxShadow: "var(--shadow-xl)", display: "flex", alignItems: "center", gap: 12,
          }}>
            <G name="upload" size={20}/>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              Drop to upload to {prefix || "root"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function Stat({ label, value, sub, loading }: { label: string; value: string; sub: string; loading?: boolean }) {
  return (
    <div style={{ padding: 16, borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
      {loading && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, var(--brand), transparent)",
          animation: "monarch-shimmer 1.4s infinite",
        }}/>
      )}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, marginTop: 6, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 6 }}>{sub}</div>
      <style>{`@keyframes monarch-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}

function EmptyState({ onUpload, hasQuery }: { onUpload: () => void; hasQuery: boolean }) {
  return (
    <div style={{ padding: 64, textAlign: "center", color: "var(--fg-muted)" }}>
      {hasQuery ? (
        <p>No files match your filter.</p>
      ) : (
        <>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "var(--ink-100)", color: "var(--ink-500)",
            display: "grid", placeItems: "center", margin: "0 auto 16px",
          }}>
            <G name="cloud" size={32}/>
          </div>
          <p style={{ marginBottom: 16, fontSize: 14, color: "var(--fg)" }}>This folder is empty</p>
          <Btn variant="primary" onClick={onUpload} icon={<G name="upload" size={14}/>}>Upload files</Btn>
          <p style={{ fontSize: 12, marginTop: 12, color: "var(--fg-muted)" }}>Or drag and drop anywhere on this page</p>
        </>
      )}
    </div>
  );
}

// ─── List view (table layout) ───────────────────────────────────────

function ListView({
  prefix, folders, blobs, selected, onToggleSelect, onToggleSelectAll,
  onEnterFolder, onUp, onPreview, onCopyUrl, copiedUrl, onRename, onDelete,
}: {
  prefix: string; folders: BlobFolder[]; blobs: BlobItem[];
  selected: Set<string>; onToggleSelect: (u: string) => void; onToggleSelectAll: () => void;
  onEnterFolder: (p: string) => void; onUp: () => void; onPreview: (u: string) => void;
  onCopyUrl: (u: string) => void; copiedUrl: string | null;
  onRename: (b: BlobItem) => void; onDelete: (b: BlobItem) => void;
}) {
  const allSelected = blobs.length > 0 && selected.size === blobs.length;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ width: 36, padding: "10px 0 10px 16px" }}>
            <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} style={{ width: "auto", margin: 0 }}/>
          </th>
          <th style={{ width: 56, padding: "10px 8px" }}/>
          <th style={th("left")}>Name</th>
          <th style={th("right")}>Size</th>
          <th style={th("left")}>Uploaded</th>
          <th style={{ width: 200, padding: "10px 16px" }}/>
        </tr>
      </thead>
      <tbody>
        {prefix && (
          <tr style={{ cursor: "pointer" }} onClick={onUp}>
            <td/>
            <td style={{ textAlign: "center", color: "var(--fg-muted)" }}>↰</td>
            <td style={td()}><span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>.. (parent)</span></td>
            <td colSpan={3}/>
          </tr>
        )}
        {folders.map((f) => (
          <tr key={f.pathname} style={{ cursor: "pointer" }} onClick={() => onEnterFolder(f.pathname)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ink-50)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <td/>
            <td style={{ textAlign: "center" }}><FolderIcon size={36}/></td>
            <td style={td()}>
              <span style={{ fontWeight: 500 }}>{leaf(f.pathname)}</span>
              <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)" }}>folder</span>
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
                <input type="checkbox" checked={isSel} onChange={() => onToggleSelect(b.url)} style={{ width: "auto", margin: 0 }}/>
              </td>
              <td style={{ textAlign: "center", padding: "8px 0" }}>
                {img ? (
                  <button onClick={() => onPreview(b.url)} style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}>
                    <img src={b.url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}/>
                  </button>
                ) : <FileIcon name={leaf(b.pathname)} size={40}/>}
              </td>
              <td style={td()}>
                <div style={{ fontWeight: 500 }}>{leaf(b.pathname)}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>{b.pathname}</div>
              </td>
              <td style={td("right")}>{fmtBytes(b.size)}</td>
              <td style={td()}><span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{new Date(b.uploadedAt).toLocaleString()}</span></td>
              <td style={{ padding: "8px 16px", textAlign: "right" }}>
                <RowActions blob={b} onCopyUrl={onCopyUrl} copied={copiedUrl === b.url} onRename={onRename} onDelete={onDelete}/>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Grid view (tile layout) ────────────────────────────────────────

function GridView({
  prefix, folders, blobs, selected, onToggleSelect,
  onEnterFolder, onUp, onPreview, onCopyUrl, copiedUrl, onRename, onDelete,
}: {
  prefix: string; folders: BlobFolder[]; blobs: BlobItem[];
  selected: Set<string>; onToggleSelect: (u: string) => void;
  onEnterFolder: (p: string) => void; onUp: () => void; onPreview: (u: string) => void;
  onCopyUrl: (u: string) => void; copiedUrl: string | null;
  onRename: (b: BlobItem) => void; onDelete: (b: BlobItem) => void;
}) {
  return (
    <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
      {prefix && (
        <button onClick={onUp} style={tile()}>
          <div style={{ height: 120, display: "grid", placeItems: "center", color: "var(--fg-muted)" }}>↰</div>
          <div style={tileName()}>.. (parent)</div>
        </button>
      )}
      {folders.map((f) => (
        <button key={f.pathname} onClick={() => onEnterFolder(f.pathname)} style={tile()}>
          <div style={{ height: 120, display: "grid", placeItems: "center" }}><FolderIcon size={64}/></div>
          <div style={tileName()}>{leaf(f.pathname)}</div>
          <div style={tileMeta()}>folder</div>
        </button>
      ))}
      {blobs.map((b) => {
        const isSel = selected.has(b.url);
        const img = isImage(b.pathname, b.contentType);
        return (
          <div key={b.url} style={{
            position: "relative", borderRadius: 10,
            border: `1px solid ${isSel ? "var(--brand)" : "var(--border)"}`,
            background: isSel ? "var(--brand-soft)" : "var(--bg)",
            overflow: "hidden", display: "flex", flexDirection: "column",
            transition: "all 120ms",
          }}>
            <input type="checkbox" checked={isSel} onChange={() => onToggleSelect(b.url)}
              style={{
                position: "absolute", top: 8, left: 8, width: "auto", margin: 0, zIndex: 2,
                padding: 0,
              }}/>
            {img ? (
              <button onClick={() => onPreview(b.url)} style={{ background: "var(--ink-50)", border: 0, padding: 0, height: 140, cursor: "zoom-in", display: "block" }}>
                <img src={b.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
              </button>
            ) : (
              <div style={{ height: 140, display: "grid", placeItems: "center", background: "var(--ink-50)" }}>
                <FileIcon name={leaf(b.pathname)} size={64}/>
              </div>
            )}
            <div style={{ padding: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={leaf(b.pathname)}>
                {leaf(b.pathname)}
              </div>
              <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                {fmtBytes(b.size)}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                <RowActions blob={b} onCopyUrl={onCopyUrl} copied={copiedUrl === b.url} onRename={onRename} onDelete={onDelete}/>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RowActions({
  blob, onCopyUrl, copied, onRename, onDelete,
}: {
  blob: BlobItem; onCopyUrl: (u: string) => void; copied: boolean;
  onRename: (b: BlobItem) => void; onDelete: (b: BlobItem) => void;
}) {
  return (
    <div style={{ display: "inline-flex", gap: 4 }}>
      <IconBtn label={copied ? "Copied!" : "Copy URL"} icon={copied ? "check" : "copy"} onClick={() => onCopyUrl(blob.url)} highlight={copied}/>
      <a href={`/api/storage/file?url=${encodeURIComponent(blob.url)}`} download style={{ textDecoration: "none" }}>
        <IconBtn label="Download" icon="download"/>
      </a>
      <IconBtn label="Rename" icon="edit" onClick={() => onRename(blob)}/>
      <IconBtn label="Delete" icon="trash" danger onClick={() => onDelete(blob)}/>
    </div>
  );
}

// ─── Style helpers ──────────────────────────────────────────────────

function tile(): React.CSSProperties {
  return {
    background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10,
    padding: 0, cursor: "pointer", textAlign: "center", fontFamily: "var(--font-body)",
    overflow: "hidden", display: "flex", flexDirection: "column",
  };
}
function tileName(): React.CSSProperties {
  return { padding: "8px 10px 2px", fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
}
function tileMeta(): React.CSSProperties {
  return { padding: "0 10px 10px", fontSize: 11, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" };
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

function FolderIcon({ size = 36 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 6,
      background: "color-mix(in srgb, var(--brand) 12%, transparent)",
      color: "var(--brand-ink)", display: "grid", placeItems: "center", margin: "0 auto",
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/>
      </svg>
    </div>
  );
}

function FileIcon({ name, size = 36 }: { name: string; size?: number }) {
  const ext = fileExt(name).slice(0, 4);
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 6,
      background: "var(--ink-100)", color: "var(--ink-600)",
      display: "grid", placeItems: "center", margin: "0 auto",
      fontFamily: "var(--font-mono)", fontSize: Math.max(8, size * 0.25), fontWeight: 600,
    }}>
      {ext}
    </div>
  );
}

function IconBtn({ label, icon, onClick, danger, highlight }: { label: string; icon: string; onClick?: () => void; danger?: boolean; highlight?: boolean }) {
  return (
    <button title={label} onClick={onClick} style={{
      width: 28, height: 28, padding: 0,
      background: highlight ? "color-mix(in srgb, var(--success) 12%, transparent)" : "transparent",
      border: `1px solid ${highlight ? "color-mix(in srgb, var(--success) 30%, transparent)" : "var(--border)"}`,
      color: highlight ? "var(--success)" : (danger ? "var(--danger)" : "var(--fg-muted)"),
      borderRadius: 6, cursor: "pointer", display: "inline-grid", placeItems: "center",
      transition: "all 120ms",
    }}
    onMouseEnter={(e) => { if (highlight) return; e.currentTarget.style.background = danger ? "color-mix(in srgb, var(--danger) 8%, transparent)" : "var(--ink-50)"; e.currentTarget.style.color = danger ? "var(--danger)" : "var(--fg)"; }}
    onMouseLeave={(e) => { if (highlight) return; e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = danger ? "var(--danger)" : "var(--fg-muted)"; }}
    >
      <G name={icon} size={13}/>
    </button>
  );
}
