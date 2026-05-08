// Shared Google OAuth refresh helper for Google Ads / GA4 / Search Console templates.

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

export async function getGoogleAccessToken(ctx: Ctx): Promise<string> {
  const clientId = ctx.secrets.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = ctx.secrets.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = ctx.secrets.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth secrets (GOOGLE_OAUTH_CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN)");
  }
  const cacheKey = `${clientId}:${refreshToken.slice(0, 24)}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.accessToken;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  let parsed: { access_token?: string; expires_in?: number; error_description?: string };
  try { parsed = JSON.parse(text); } catch { throw new Error(`Google OAuth response not JSON: ${text}`); }
  if (!res.ok || !parsed.access_token) {
    throw new Error(`Google OAuth refresh failed (${res.status}): ${parsed.error_description || text}`);
  }
  tokenCache.set(cacheKey, {
    accessToken: parsed.access_token,
    expiresAt: Date.now() + (parsed.expires_in || 3600) * 1000,
  });
  return parsed.access_token;
}
