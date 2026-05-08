import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getDb();
  const dump = {
    exported_at: new Date().toISOString(),
    schema_note: "Secrets remain encrypted with the original master key. Restoring on another machine requires the same MONARCH_MASTER_KEY.",
    users: db.prepare("SELECT id, username, created_at FROM users").all(),
    mcp_templates: db.prepare("SELECT * FROM mcp_templates").all(),
    mcps: db.prepare("SELECT * FROM mcps").all(),
    mcp_secrets: db.prepare("SELECT * FROM mcp_secrets").all(),
    mcp_config: db.prepare("SELECT * FROM mcp_config").all(),
    mcp_tools: db.prepare("SELECT * FROM mcp_tools").all(),
    audit_log: db.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT 1000").all(),
  };

  const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="monarch-export-${date}.json"`,
    },
  });
}
