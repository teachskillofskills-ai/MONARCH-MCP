"use client";

import { usePathname } from "next/navigation";
import { Btn } from "./ui";
import { G } from "./icons";
import UserMenu from "./UserMenu";
import CommandPalette from "./CommandPalette";

const ROUTE_META: Record<string, { title: string; crumbs: string[] }> = {
  "/dashboard":    { title: "Overview",      crumbs: ["MONARCH", "Overview"] },
  "/mcps":         { title: "MCP servers",   crumbs: ["MONARCH", "MCPs"] },
  "/mcps/new":     { title: "Create MCP",    crumbs: ["MONARCH", "MCPs", "New"] },
  "/market":       { title: "MCPs Add-Ons",  crumbs: ["MONARCH", "Add-Ons"] },
  "/studio":       { title: "Build your own MCP", crumbs: ["MONARCH", "Studio"] },
  "/customers":    { title: "Customers",     crumbs: ["MONARCH", "Customers"] },
  "/keys":         { title: "Key vault",     crumbs: ["MONARCH", "Vault"] },
  "/activity":     { title: "Activity",      crumbs: ["MONARCH", "Activity"] },
  "/settings":     { title: "Settings",      crumbs: ["MONARCH", "Settings"] },
};

export default function Topbar({ username }: { username: string }) {
  const pathname = usePathname();
  let meta = ROUTE_META[pathname];
  if (!meta && pathname.startsWith("/mcps/")) meta = { title: "MCP details", crumbs: ["MONARCH", "MCPs"] };
  if (!meta) meta = ROUTE_META["/dashboard"];

  return (
    <header style={{
      gridArea: "top",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 24px", height: 56,
      borderBottom: "1px solid var(--border)", background: "var(--bg)",
      position: "sticky", top: 0, zIndex: 5,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-muted)" }}>
        {meta.crumbs.map((c, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: i === meta.crumbs.length - 1 ? "var(--fg)" : "var(--fg-muted)" }}>{c}</span>
            {i < meta.crumbs.length - 1 && <span style={{ opacity: 0.4 }}>/</span>}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CommandPalette/>
        <Btn variant="ghost" size="sm" icon={<G name="bell" size={16}/>}><span/></Btn>
        <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }}/>
        <UserMenu username={username}/>
      </div>
    </header>
  );
}
