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

      {/* Right — visual side */}
      <div style={{
        background: "var(--ink-900)", color: "#fff", padding: 56,
        display: "flex", flexDirection: "column", gap: 40, position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.06,
          backgroundImage: "linear-gradient(var(--brand) 1px, transparent 1px), linear-gradient(90deg, var(--brand) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}/>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "#7CFFB2", boxShadow: "0 0 0 4px rgba(124,255,178,0.18)" }}/>
          Live · Local instance · port 4000
        </div>
        <div style={{ position: "relative", marginTop: "auto" }}>
          <h2 style={{ fontSize: 44, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.025em", marginBottom: 24, maxWidth: 520 }}>
            Reciprocity, in code.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: "rgba(255,255,255,0.72)", maxWidth: 520, marginBottom: 32 }}>
            MONARCH is the central nervous system for the MCPs we run on behalf of clients — auth, rotation, and observability under one roof. Plain controls. Measurable outcomes. No fluff.
          </p>
          <div style={{ display: "flex", gap: 32, fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <Stat n="10" label="MCPs in catalog"/>
            <Stat n="∞" label="instances per template"/>
            <Stat n="100%" label="locally controlled"/>
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          <span>TechShu Digital · Kolkata · est. 2009</span>
          <span>support@techshu.com</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 28, fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "-0.02em" }}>{n}</div>
      <div style={{ color: "rgba(255,255,255,0.55)" }}>{label}</div>
    </div>
  );
}
