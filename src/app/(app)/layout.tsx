import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const { count } = db.prepare("SELECT COUNT(*) as count FROM mcps").get() as { count: number };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "232px 1fr",
      gridTemplateRows: "auto 1fr",
      gridTemplateAreas: '"side top" "side main"',
      minHeight: "100vh",
      background: "var(--bg-muted)",
    }}>
      <Sidebar mcpCount={count}/>
      <Topbar username={user.username}/>
      <main style={{ gridArea: "main", overflow: "auto" }}>{children}</main>
    </div>
  );
}
