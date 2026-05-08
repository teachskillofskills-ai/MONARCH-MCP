"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, Btn } from "./ui";
import { G } from "./icons";

export default function UserMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setConfirming(false); }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = username.slice(0, 2).toUpperCase();

  return (
    <>
      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 8px 4px 4px",
            background: open ? "var(--ink-50)" : "transparent",
            border: 0, borderRadius: 999, cursor: "pointer",
            transition: "background 120ms",
          }}
        >
          <Avatar s={initials} size={28}/>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{username}</span>
          <span style={{ display: "inline-flex", color: "var(--fg-muted)", transition: "transform 160ms", transform: open ? "rotate(180deg)" : "rotate(0)" }}>
            <G name="chevDown" size={14}/>
          </span>
        </button>

        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            minWidth: 240, background: "var(--bg)",
            border: "1px solid var(--border)", borderRadius: 12,
            boxShadow: "var(--shadow-lg)", padding: 6,
            zIndex: 50, animation: "monarch-fadein 120ms ease-out",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px 12px", borderBottom: "1px solid var(--border)", marginBottom: 6,
            }}>
              <Avatar s={initials} size={36}/>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{username}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>local · admin</div>
              </div>
            </div>

            <MenuItem icon="settings" label="Settings" href="/settings" onClick={() => setOpen(false)}/>
            <MenuItem icon="key" label="Key vault" href="/keys" onClick={() => setOpen(false)}/>
            <MenuItem icon="activity" label="Activity log" href="/activity" onClick={() => setOpen(false)}/>

            <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }}/>

            <button
              onClick={() => { setOpen(false); setConfirming(true); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "8px 10px", border: 0, borderRadius: 8, cursor: "pointer",
                background: "transparent", color: "var(--danger)", fontSize: 13,
                fontFamily: "var(--font-body)", textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--danger) 8%, transparent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <G name="logout" size={16}/>
              Sign out
            </button>
          </div>
        )}
      </div>

      {confirming && (
        <div
          onClick={() => { if (!loggingOut) setConfirming(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(10,10,11,0.5)",
            backdropFilter: "blur(2px)",
            display: "grid", placeItems: "center",
            animation: "monarch-fadein 160ms ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg)", borderRadius: 14,
              border: "1px solid var(--border)",
              padding: 24, width: "100%", maxWidth: 400,
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
              color: "var(--danger)",
              display: "grid", placeItems: "center", marginBottom: 14,
            }}>
              <G name="logout" size={22}/>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Sign out of Monarch?</h3>
            <p style={{ color: "var(--fg-muted)", fontSize: 13.5, lineHeight: 1.5, marginBottom: 20 }}>
              You&apos;ll need to enter your username and password again to access the dashboard.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setConfirming(false)} disabled={loggingOut}>
                Cancel
              </Btn>
              <Btn variant="primary" onClick={logout} disabled={loggingOut} icon={<G name="logout" size={14}/>}>
                {loggingOut ? "Signing out…" : "Sign out"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuItem({ icon, label, href, onClick }: { icon: string; label: string; href: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px", borderRadius: 8,
      fontSize: 13, color: "var(--fg)", textDecoration: "none",
      transition: "background 120ms",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ink-50)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ display: "inline-flex", color: "var(--fg-muted)" }}><G name={icon} size={16}/></span>
      {label}
    </Link>
  );
}
