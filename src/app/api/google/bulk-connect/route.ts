import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { GOOGLE_TEMPLATE_SLUGS } from "@/lib/google-oauth-flow";

export async function POST(req: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    client_id?: string; client_secret?: string; refresh_token?: string;
    scope?: "all" | "missing";
  };
  const clientId = (body.client_id || "").trim();
  const clientSecret = (body.client_secret || "").trim();
  const refreshToken = (body.refresh_token || "").trim();
  const scope = body.scope || "all";

  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({ error: "client_id, client_secret, refresh_token all required" }, { status: 400 });
  }

  // Quickly verify the refresh token actually works by trying to mint an access token
  let verifyError: string | null = null;
  try {
    const verify = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId, client_secret: clientSecret,
        refresh_token: refreshToken, grant_type: "refresh_token",
      }),
    });
    if (!verify.ok) {
      const txt = await verify.text();
      verifyError = `Refresh check failed (${verify.status}): ${txt.slice(0, 300)}`;
    }
  } catch (e) {
    verifyError = `Could not reach Google to verify: ${(e as Error).message}`;
  }
  if (verifyError) {
    return NextResponse.json({ error: verifyError }, { status: 400 });
  }

  // Find target MCPs
  const db = getDb();
  const placeholders = GOOGLE_TEMPLATE_SLUGS.map(() => "?").join(",");
  const mcps = db.prepare(
    `SELECT m.id, m.slug, m.name FROM mcps m
     JOIN mcp_templates t ON t.id = m.template_id
     WHERE t.module IN (${placeholders})`
  ).all(...GOOGLE_TEMPLATE_SLUGS) as { id: number; slug: string; name: string }[];

  let targets = mcps;
  if (scope === "missing") {
    const missing = mcps.filter((m) => {
      const has = db.prepare(
        "SELECT 1 FROM mcp_secrets WHERE mcp_id = ? AND key = 'GOOGLE_OAUTH_REFRESH_TOKEN'"
      ).get(m.id);
      return !has;
    });
    targets = missing;
  }

  const upsert = db.prepare(
    `INSERT INTO mcp_secrets (mcp_id, key, encrypted_value) VALUES (?, ?, ?)
     ON CONFLICT(mcp_id, key) DO UPDATE SET encrypted_value = excluded.encrypted_value`
  );
  for (const m of targets) {
    upsert.run(m.id, "GOOGLE_OAUTH_CLIENT_ID", encrypt(clientId));
    upsert.run(m.id, "GOOGLE_OAUTH_CLIENT_SECRET", encrypt(clientSecret));
    upsert.run(m.id, "GOOGLE_OAUTH_REFRESH_TOKEN", encrypt(refreshToken));
  }

  return NextResponse.json({
    ok: true,
    applied_to: targets.length,
    mcps: targets.map((t) => t.slug),
    skipped: mcps.length - targets.length,
  });
}

// Returns: list of Google MCPs and which already have a saved refresh token.
export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDb();
  const placeholders = GOOGLE_TEMPLATE_SLUGS.map(() => "?").join(",");
  const mcps = db.prepare(
    `SELECT m.id, m.slug, m.name, m.description, t.module AS template
     FROM mcps m JOIN mcp_templates t ON t.id = m.template_id
     WHERE t.module IN (${placeholders})
     ORDER BY t.module, m.slug`
  ).all(...GOOGLE_TEMPLATE_SLUGS) as { id: number; slug: string; name: string; description: string | null; template: string }[];

  const enriched = mcps.map((m) => {
    const has = db.prepare(
      "SELECT 1 FROM mcp_secrets WHERE mcp_id = ? AND key = 'GOOGLE_OAUTH_REFRESH_TOKEN'"
    ).get(m.id);
    return { slug: m.slug, name: m.name, description: m.description, template: m.template, connected: !!has };
  });

  // Form defaults — read from env so we never commit secrets to source.
  return NextResponse.json({
    mcps: enriched,
    defaults: {
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
    },
  });
}
