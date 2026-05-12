// Google OAuth 2.0 flow used by the "Connect Google account" button on
// any Google MCP detail page (Ads / GA4 / Search Console / Gmail / etc.).
//
// Reads client_id + client_secret from process.env (set on Render).

const SCOPES_BY_TEMPLATE: Record<string, string[]> = {
  "google-ads":     ["https://www.googleapis.com/auth/adwords"],
  "ga4":            ["https://www.googleapis.com/auth/analytics.readonly"],
  "search-console": ["https://www.googleapis.com/auth/webmasters.readonly"],
  // For future templates:
  "gmail":          ["https://www.googleapis.com/auth/gmail.readonly"],
  "google-drive":   ["https://www.googleapis.com/auth/drive.readonly"],
  "google-calendar":["https://www.googleapis.com/auth/calendar.readonly"],
  "google-sheets":  ["https://www.googleapis.com/auth/spreadsheets.readonly"],
};

export const GOOGLE_TEMPLATE_SLUGS = Object.keys(SCOPES_BY_TEMPLATE);

const USERINFO_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export function getOAuthCreds(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in environment.");
  }
  return { clientId, clientSecret };
}

export function scopesFor(templateSlug: string): string[] {
  const base = SCOPES_BY_TEMPLATE[templateSlug];
  if (!base) throw new Error(`No Google OAuth scope mapping for template '${templateSlug}'`);
  return [...base, ...USERINFO_SCOPES];
}

export function buildAuthUrl(opts: {
  templateSlug: string;
  redirectUri: string;
  state: string;
  loginHint?: string;
}): string {
  const { clientId } = getOAuthCreds();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: scopesFor(opts.templateSlug).join(" "),
    access_type: "offline",
    prompt: "consent",            // force a refresh token even on re-consent
    state: opts.state,
    include_granted_scopes: "true",
  });
  if (opts.loginHint) params.set("login_hint", opts.loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
};

export async function exchangeCode(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getOAuthCreds();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${text}`);
  return JSON.parse(text);
}

export async function getUserInfo(accessToken: string): Promise<{
  email?: string; name?: string; picture?: string; id?: string;
}> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  return res.json();
}

export function isGoogleTemplate(templateSlug: string): boolean {
  return SCOPES_BY_TEMPLATE[templateSlug] !== undefined;
}
