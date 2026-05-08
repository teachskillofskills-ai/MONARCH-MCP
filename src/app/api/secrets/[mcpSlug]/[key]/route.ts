import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { getCurrentUser } from "@/lib/auth";

async function authed(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

function findSecret(mcpSlug: string, key: string) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.id, s.encrypted_value, m.id AS mcp_id, m.name AS mcp_name
       FROM mcp_secrets s
       JOIN mcps m ON m.id = s.mcp_id
       WHERE m.slug = ? AND s.key = ?`
    )
    .get(mcpSlug, key) as
    | { id: number; encrypted_value: string; mcp_id: number; mcp_name: string }
    | undefined;
  return row || null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mcpSlug: string; key: string }> }
) {
  if (!(await authed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { mcpSlug, key } = await params;
  const row = findSecret(mcpSlug, key);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const value = decrypt(row.encrypted_value);
    return NextResponse.json({ key, value });
  } catch (e) {
    return NextResponse.json({ error: `decrypt failed: ${(e as Error).message}` }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ mcpSlug: string; key: string }> }
) {
  if (!(await authed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { mcpSlug, key } = await params;
  const row = findSecret(mcpSlug, key);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { value?: string };
  const value = (body.value || "").trim();
  if (!value) return NextResponse.json({ error: "value required" }, { status: 400 });
  const db = getDb();
  db.prepare("UPDATE mcp_secrets SET encrypted_value = ? WHERE id = ?")
    .run(encrypt(value), row.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ mcpSlug: string; key: string }> }
) {
  if (!(await authed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { mcpSlug, key } = await params;
  const row = findSecret(mcpSlug, key);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = getDb();
  db.prepare("DELETE FROM mcp_secrets WHERE id = ?").run(row.id);
  return NextResponse.json({ ok: true });
}
