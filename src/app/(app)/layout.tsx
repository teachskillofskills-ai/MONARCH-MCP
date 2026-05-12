import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const { count } = db.prepare("SELECT COUNT(*) as count FROM mcps").get() as { count: number };
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:4000";

  return (
    <AppShell username={user.username} host={host} mcpCount={count}>
      {children}
    </AppShell>
  );
}
