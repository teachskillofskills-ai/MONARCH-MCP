import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { current?: string; next?: string };
  const current = (body.current || "").trim();
  const next = (body.next || "").trim();
  if (!current || !next) return NextResponse.json({ error: "Both fields required" }, { status: 400 });
  if (next.length < 4) return NextResponse.json({ error: "Password too short (min 4 chars)" }, { status: 400 });

  const db = getDb();
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string } | undefined;
  if (!row) return NextResponse.json({ error: "user gone" }, { status: 500 });

  if (!(await bcrypt.compare(current, row.password_hash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const hash = await bcrypt.hash(next, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
  return NextResponse.json({ ok: true });
}
