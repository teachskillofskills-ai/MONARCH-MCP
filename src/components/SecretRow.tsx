"use client";

import { useEffect, useRef, useState } from "react";
import { Btn } from "./ui";
import { G } from "./icons";
import McpMark from "./McpMark";

type Props = {
  mcpSlug: string;
  mcpName: string;
  templateIcon: string;
  secretKey: string;
  preview: string;
};

export default function SecretRow({ mcpSlug, mcpName, templateIcon, secretKey, preview }: Props) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  async function reveal() {
    setError(null);
    if (revealed) {
      setRevealed(null);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/secrets/${mcpSlug}/${encodeURIComponent(secretKey)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "failed");
      setRevealed(j.value);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setRevealed(null), 30_000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    setError(null);
    let v = revealed;
    if (!v) {
      try {
        const res = await fetch(`/api/secrets/${mcpSlug}/${encodeURIComponent(secretKey)}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "failed");
        v = j.value;
      } catch (e) { setError((e as Error).message); return; }
    }
    if (!v) return;
    await navigator.clipboard.writeText(v);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function startEdit() {
    setEditValue("");
    setEditing(true);
    setError(null);
  }

  async function saveEdit() {
    if (!editValue.trim()) { setError("Empty value"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/secrets/${mcpSlug}/${encodeURIComponent(secretKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: editValue.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "failed");
      setEditing(false);
      setEditValue("");
      setRevealed(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1.4fr 1.2fr 2.4fr auto",
      alignItems: "center", gap: 16,
      padding: "12px 16px", borderBottom: "1px solid var(--border)",
    }}>
      {/* MCP */}
      <a href={`/mcps/${mcpSlug}`} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 500 }}>
        <McpMark icon={templateIcon} size={28}/>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mcpName}</span>
      </a>

      {/* Key name */}
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg)" }}>{secretKey}</code>

      {/* Value column */}
      {editing ? (
        <input
          type="password"
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
          placeholder="Paste new value…"
          style={{ height: 32, fontFamily: "var(--font-mono)", fontSize: 12 }}
        />
      ) : (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 12,
          color: revealed ? "var(--fg)" : "var(--fg-muted)",
          background: revealed ? "var(--ink-50)" : "transparent",
          border: revealed ? "1px solid var(--border)" : "1px solid transparent",
          borderRadius: 6, padding: revealed ? "6px 10px" : 0,
          overflow: "auto", whiteSpace: "nowrap",
          maxWidth: "100%",
        }}>
          {revealed || preview}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 4 }}>
        {editing ? (
          <>
            <IconBtn label="Save" onClick={saveEdit} disabled={busy || !editValue.trim()} icon="check" variant="brand"/>
            <IconBtn label="Cancel" onClick={() => setEditing(false)} disabled={busy} icon="x"/>
          </>
        ) : (
          <>
            <IconBtn label={revealed ? "Hide" : "Reveal"} onClick={reveal} disabled={busy} icon={revealed ? "eyeOff" : "eye"}/>
            <IconBtn label={copied ? "Copied" : "Copy"} onClick={copy} disabled={busy} icon={copied ? "check" : "copy"}/>
            <IconBtn label="Edit" onClick={startEdit} icon="edit"/>
          </>
        )}
      </div>

      {error && (
        <div style={{ gridColumn: "1 / -1", color: "var(--danger)", fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function IconBtn({ label, icon, onClick, disabled, variant = "secondary" }: {
  label: string; icon: string; onClick: () => void; disabled?: boolean;
  variant?: "secondary" | "brand";
}) {
  const isBrand = variant === "brand";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        width: 32, height: 32, padding: 0,
        display: "inline-grid", placeItems: "center",
        background: isBrand ? "var(--brand)" : "var(--bg)",
        color: isBrand ? "#fff" : "var(--fg-muted)",
        border: `1px solid ${isBrand ? "var(--brand)" : "var(--border)"}`,
        borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "all 120ms",
      }}
      onMouseEnter={(e) => { if (!disabled && !isBrand) e.currentTarget.style.background = "var(--ink-50)"; }}
      onMouseLeave={(e) => { if (!disabled && !isBrand) e.currentTarget.style.background = "var(--bg)"; }}
    >
      <G name={icon} size={14}/>
    </button>
  );
}
