"use client";

import { useState } from "react";
import { Btn, Field } from "./ui";
import { G } from "./icons";

export default function PasswordChangeForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) { setMsg({ tone: "err", text: "New passwords don't match" }); return; }
    if (next.length < 4) { setMsg({ tone: "err", text: "Password must be at least 4 characters" }); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const j = await res.json();
      if (!res.ok) { setMsg({ tone: "err", text: j.error || "Failed" }); return; }
      setMsg({ tone: "ok", text: "Password updated" });
      setCurrent(""); setNext(""); setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <Field label="Current password">
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password"/>
      </Field>
      <Field label="New password" hint="Minimum 4 characters">
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password"/>
      </Field>
      <Field label="Confirm new password">
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password"/>
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

      <div>
        <Btn variant="primary" type="submit" disabled={busy} icon={<G name="lock" size={14}/>}>
          {busy ? "Updating…" : "Update password"}
        </Btn>
      </div>
    </form>
  );
}
