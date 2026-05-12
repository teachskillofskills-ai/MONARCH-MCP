import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { exchangeCode, getOAuthCreds, getUserInfo } from "@/lib/google-oauth-flow";
import { getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

function back(url: URL, mcpSlug: string | null, params: Record<string, string>): NextResponse {
  const dest = mcpSlug ? `/mcps/${mcpSlug}` : "/mcps";
  const u = new URL(dest, url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return NextResponse.redirect(u);
}

export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  if (oauthError) return back(req.nextUrl, null, { google_error: oauthError });
  if (!code || !state) return back(req.nextUrl, null, { google_error: "missing_code" });

  const jar = await cookies();
  const stateCookie = jar.get(`gauth_${state}`);
  if (!stateCookie) return back(req.nextUrl, null, { google_error: "invalid_state" });

  let parsed: { slug: string; redirectUri: string };
  try { parsed = JSON.parse(stateCookie.value); }
  catch { return back(req.nextUrl, null, { google_error: "bad_state" }); }
  jar.delete(`gauth_${state}`);

  const { slug, redirectUri } = parsed;

  let tokens;
  try {
    tokens = await exchangeCode(code, redirectUri);
  } catch (e) {
    return back(req.nextUrl, slug, { google_error: encodeURIComponent((e as Error).message).slice(0, 200) });
  }

  if (!tokens.refresh_token) {
    // Google only issues refresh_token on first consent unless prompt=consent (which we set).
    // If still missing, user has previously approved this OAuth client without revoking.
    return back(req.nextUrl, slug, { google_error: "no_refresh_token_revoke_and_retry" });
  }

  const userInfo = await getUserInfo(tokens.access_token).catch(() => ({} as Record<string, string>));
  const db = getDb();
  const mcpRow = db.prepare("SELECT id FROM mcps WHERE slug = ?").get(slug) as { id: number } | undefined;
  if (!mcpRow) return back(req.nextUrl, null, { google_error: "mcp_not_found" });

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

  return back(req.nextUrl, slug, {
    google_connected: userInfo.email || "1",
    scope: tokens.scope || "",
  });
}
