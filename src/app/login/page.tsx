"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Btn } from "@/components/ui";
import { G, MonarchMark } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("monarch");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Login failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr 1.1fr",
      background: "var(--bg)",
    }}>
      {/* Left — sign in panel */}
      <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
        <form onSubmit={submit} style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--ink-900)", display: "grid", placeItems: "center" }}>
              <MonarchMark size={20} color="#fff"/>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>MONARCH</div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", marginLeft: 4 }}>by TechShu</span>
          </div>

          <h1 style={{ fontSize: 32, lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Sign in to MCP control.
          </h1>
          <p style={{ color: "var(--fg-muted)", fontSize: 14.5, marginBottom: 28 }}>
            One place to manage every connector your team — and your customers — depend on.
          </p>

          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Username">
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="monarch" autoFocus required/>
            </Field>
            <Field label="Password" right={<a href="#" style={{ fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-muted)" }}>Forgot?</a>}>
              <div style={{ position: "relative" }}>
                <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"/>
                <button type="button" onClick={() => setShowPwd((s) => !s)} style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  border: 0, background: "transparent", color: "var(--fg-muted)", cursor: "pointer", padding: 4,
                }}>
                  <G name={showPwd ? "eyeOff" : "eye"} size={16}/>
                </button>
              </div>
            </Field>

            {error && (
              <div style={{
                padding: "10px 12px", borderRadius: 8,
                background: "color-mix(in srgb, var(--danger) 8%, transparent)",
                color: "var(--danger)",
                border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
                fontSize: 13,
              }}>{error}</div>
            )}

            <Btn variant="primary" size="lg" type="submit" disabled={loading} style={{ width: "100%", marginTop: 4 }}>
              {loading ? "Verifying…" : "Continue →"}
            </Btn>
          </div>

          <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-muted)", letterSpacing: "0.04em" }}>
            <span>SINGLE-USER · LOCAL INSTANCE</span>
            <span>v0.2.0</span>
          </div>
        </form>
      </div>

      {/* Right — minimal dark panel */}
      <div style={{
        background: "var(--ink-900)", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.06,
          backgroundImage: "linear-gradient(var(--brand) 1px, transparent 1px), linear-gradient(90deg, var(--brand) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}/>
      </div>
    </div>
  );
}
