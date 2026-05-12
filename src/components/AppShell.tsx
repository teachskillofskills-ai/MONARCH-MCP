"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({
  username, host, mcpCount, children,
}: {
  username: string; host: string; mcpCount: number; children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  return (
    <div className="app-shell" style={{ background: "var(--bg-muted)" }}>
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <Sidebar mcpCount={mcpCount} host={host}/>
      </div>
      <div className="topbar">
        <Topbar username={username} onMenuClick={() => setSidebarOpen((o) => !o)}/>
      </div>
      <main className="main" style={{ overflow: "auto" }}>{children}</main>

      {sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}/>
      )}
    </div>
  );
}
