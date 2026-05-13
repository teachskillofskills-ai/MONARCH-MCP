import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { exchangeCode, getOAuthCreds, getUserInfo } from "@/lib/google-oauth-flow";
import { getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

async function publicBaseUrl(): Promise<string> {
  // Prefer explicitly configured public URL (Render sets RENDER_EXTERNAL_URL automatically)
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  const h = await headers();
  const fwdHost = h.get("x-forwarded-host");
  const host = fwdHost || h.get("host") || "localhost:4000";
  // Skip 0.0.0.0 / internal binds — fall back to localhost
  const cleanHost = /^0\.0\.0\.0|^127\.0\.0\.1/.test(host) ? "localhost:4000" : host;
  const proto = h.get("x-forwarded-proto") || (cleanHost.startsWith("localhost") ? "http" : "https");
  return `${proto}://${cleanHost}`;
}

async function back(mcpSlug: string | null, params: Record<string, string>): Promise<NextResponse> {
  const base = await publicBaseUrl();
  const dest = mcpSlug ? `/mcps/${mcpSlug}` : "/mcps";
  const u = new URL(dest, base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return NextResponse.redirect(u);
}

export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.redirect(new URL("/login", await publicBaseUrl()));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  if (oauthError) return back(null, { google_error: oauthError });
  if (!code || !state) return back(null, { google_error: "missing_code" });

  const jar = await cookies();
  const stateCookie = jar.get(`gauth_${state}`);
  if (!stateCookie) return back(null, { google_error: "invalid_state" });

  let parsed: { slug: string; redirectUri: string };
  try { parsed = JSON.parse(stateCookie.value); }
  catch { return back(null, { google_error: "bad_state" }); }
  jar.delete(`gauth_${state}`);

  const { slug, redirectUri } = parsed;

  let tokens;
  try {
    tokens = await exchangeCode(code, redirectUri);
  } catch (e) {
    return back(slug, { google_error: encodeURIComponent((e as Error).message).slice(0, 200) });
  }

  if (!tokens.refresh_token) {
    // Google only issues refresh_token on first consent unless prompt=consent (which we set).
    // If still missing, user has previously approved this OAuth client without revoking.
    return back(slug, { google_error: "no_refresh_token_revoke_and_retry" });
  }

  const userInfo = await getUserInfo(tokens.access_token).catch(() => ({} as Record<string, string>));
  const db = getDb();
  const mcpRow = db.prepare("SELECT id FROM mcps WHERE slug = ?").get(slug) as { id: number } | undefined;
  if (!mcpRow) return back(null, { google_error: "mcp_not_found" });

  const { clientId, clientSecret } = getOAuthCreds();

  const insertSecret = db.prepare(
    `INSERT INTO mcp_secrets (mcp_id, key, encrypted_value) VALUES (?, ?, ?)
     ON CONFLICT(mcp_id, key) DO UPDATE SET encrypted_value = excluded.encrypted_value`
  );
  insertSecret.run(mcpRow.id, "GOOGLE_OAUTH_CLIENT_ID", encrypt(clientId));
  insertSecret.run(mcpRow.id, "GOOGLE_OAUTH_CLIENT_SECRET", encrypt(clientSecret));
  insertSecret.run(mcpRow.id, "GOOGLE_OAUTH_REFRESH_TOKEN", encrypt(tokens.refresh_token));

  // Stamp the connected user into the description for clarity
  if (userInfo.email) {
    const newDesc = `Connected as ${userInfo.email}`;
    db.prepare("UPDATE mcps SET description = ? WHERE id = ?").run(newDesc, mcpRow.id);
  }

  return back(slug, {
    google_connected: userInfo.email || "1",
    scope: tokens.scope || "",
  });
}
