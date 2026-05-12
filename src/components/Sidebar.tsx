"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { G, MonarchMark } from "./icons";
import { ReactNode } from "react";

function SidebarItem({
  href, icon, label, count, active,
}: {
  href: string; icon: ReactNode; label: string; count?: ReactNode; active?: boolean;
}) {
  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      padding: "7px 10px", borderRadius: 8, textDecoration: "none",
      background: active ? "var(--ink-900)" : "transparent",
      color: active ? "#fff" : "var(--fg)",
      fontSize: 13.5, fontWeight: active ? 500 : 400,
      transition: "background 120ms",
    }}>
      <span style={{ display: "inline-flex", color: active ? "#fff" : "var(--fg-muted)" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: active ? "rgba(255,255,255,0.6)" : "var(--fg-muted)",
        }}>{count}</span>
      )}
    </Link>
  );
}

export default function Sidebar({ mcpCount, host }: { mcpCount: number; host?: string }) {
  const pathname = usePathname();
  const groups: { label: string; items: { href: string; icon: ReactNode; label: string; count?: ReactNode }[] }[] = [
    { label: "Workspace", items: [
      { href: "/dashboard", icon: <G name="dashboard" size={16}/>, label: "Overview" },
      { href: "/mcps",      icon: <G name="grid" size={16}/>,      label: "MCP servers", count: mcpCount },
      { href: "/market",    icon: <G name="store" size={16}/>,     label: "MCPs Add-Ons" },
      { href: "/studio",    icon: <G name="plus" size={16}/>,      label: "Build your own", count: "NEW" },
    ]},
    { label: "Customers", items: [
      { href: "/customers", icon: <G name="users" size={16}/>, label: "Customers" },
    ]},
    { label: "Operate", items: [
      { href: "/storage",  icon: <G name="cloud" size={16}/>,    label: "Storage" },
      { href: "/keys",     icon: <G name="key" size={16}/>,      label: "Key vault" },
      { href: "/activity", icon: <G name="activity" size={16}/>, label: "Activity" },
      { href: "/settings", icon: <G name="settings" size={16}/>, label: "Settings" },
    ]},
  ];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/mcps") return pathname === "/mcps" || pathname.startsWith("/mcps/");
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside style={{
      gridArea: "side",
      background: "var(--bg)", borderRight: "1px solid var(--border)",
      padding: "14px 12px 16px", display: "flex", flexDirection: "column",
      position: "sticky", top: 0, height: "100vh", overflow: "auto",
    }}>
      <Link href="/dashboard" style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 10px 16px", borderBottom: "1px solid var(--border)", marginBottom: 14,
        textDecoration: "none", color: "inherit",
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: "var(--ink-900)",
          color: "#fff", display: "grid", placeItems: "center",
        }}>
          <MonarchMark size={18} color="#fff"/>
        </div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>MONARCH</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-muted)", marginTop: 2 }}>MCP CONTROL · v0.2.0</div>
        </div>
      </Link>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {groups.map((g) => (
          <div key={g.label}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.08em", color: "var(--fg-muted)",
              textTransform: "uppercase", padding: "4px 10px 6px",
            }}>{g.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {g.items.map((it) => (
                <SidebarItem key={it.href} {...it} active={isActive(it.href)}/>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "var(--ink-50)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-muted)", marginBottom: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--success)" }}/>
          ALL SYSTEMS NOMINAL
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--fg)" }}>
          {mcpCount} MCPs · <span style={{ color: "var(--fg-muted)" }}>{host && !host.startsWith("localhost") ? "live" : "local instance"}</span>
        </div>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-muted)", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {host || "localhost:4000"}
        </div>
      </div>
    </aside>
  );
}
