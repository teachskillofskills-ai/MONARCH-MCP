import type { Template, ToolDef, ToolHandler } from "./types";
import { getGoogleAccessToken } from "./_google-oauth";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function gscApi(ctx: Ctx, method: string, path: string, body?: unknown) {
  const token = await getGoogleAccessToken(ctx);
  const url = `https://searchconsole.googleapis.com/${path.replace(/^\/+/, "")}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  if (!res.ok) {
    const p = parsed as { error?: { message?: string } };
    throw new Error(`Search Console API ${res.status}: ${p?.error?.message || text}`);
  }
  return parsed;
}

const tools: ToolDef[] = [
  { name: "gsc_get_server_policy", description: "Search Console MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "gsc_list_sites", description: "List all verified sites.", inputSchema: { type: "object", properties: {} } },
  { name: "gsc_search_analytics", description: "Custom Search Analytics query.", inputSchema: { type: "object", properties: { site_url: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" }, dimensions: { type: "array", items: { type: "string" } }, row_limit: { type: "number" } }, required: ["site_url"] } },
  { name: "gsc_top_queries", description: "Top search queries by impressions.", inputSchema: { type: "object", properties: { site_url: { type: "string" }, days: { type: "number" }, limit: { type: "number" } }, required: ["site_url"] } },
  { name: "gsc_top_pages", description: "Top landing pages by clicks.", inputSchema: { type: "object", properties: { site_url: { type: "string" }, days: { type: "number" }, limit: { type: "number" } }, required: ["site_url"] } },
  { name: "gsc_inspect_url", description: "URL Inspection API.", inputSchema: { type: "object", properties: { site_url: { type: "string" }, inspection_url: { type: "string" } }, required: ["site_url", "inspection_url"] } },
];

function isoDaysAgo(days: number): string {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const handlers: Record<string, ToolHandler> = {
  gsc_get_server_policy: async () => ({ api_family: "Google Search Console API v1" }),
  gsc_list_sites: async (_args, ctx) => gscApi(ctx, "GET", "webmasters/v3/sites"),
  gsc_search_analytics: async (args, ctx) => {
    const site = encodeURIComponent(String(args.site_url));
    return gscApi(ctx, "POST", `webmasters/v3/sites/${site}/searchAnalytics/query`, {
      startDate: args.start_date || isoDaysAgo(28),
      endDate: args.end_date || isoDaysAgo(1),
      dimensions: args.dimensions || ["query"],
      rowLimit: Number(args.row_limit || 100),
    });
  },
  gsc_top_queries: async (args, ctx) => {
    const site = encodeURIComponent(String(args.site_url));
    return gscApi(ctx, "POST", `webmasters/v3/sites/${site}/searchAnalytics/query`, {
      startDate: isoDaysAgo(Number(args.days || 28)),
      endDate: isoDaysAgo(1),
      dimensions: ["query"],
      rowLimit: Number(args.limit || 100),
    });
  },
  gsc_top_pages: async (args, ctx) => {
    const site = encodeURIComponent(String(args.site_url));
    return gscApi(ctx, "POST", `webmasters/v3/sites/${site}/searchAnalytics/query`, {
      startDate: isoDaysAgo(Number(args.days || 28)),
      endDate: isoDaysAgo(1),
      dimensions: ["page"],
      rowLimit: Number(args.limit || 100),
    });
  },
  gsc_inspect_url: async (args, ctx) => gscApi(ctx, "POST", "v1/urlInspection/index:inspect", {
    siteUrl: args.site_url,
    inspectionUrl: args.inspection_url,
  }),
};

const template: Template = {
  slug: "search-console",
  name: "Google Search Console",
  description: "Search Console API. Sites, search analytics, top queries/pages, URL inspection.",
  icon: "GSC",
  category: "SEO",
  version: "1.0",
  auth: "OAuth refresh token",
  setupUrl: "https://search.google.com/search-console",
  setupSteps: [
    "Verify your sites in Google Search Console first.",
    "Enable the Search Console API in https://console.cloud.google.com/apis/library.",
    "Create OAuth Client ID (Desktop app) and use the OAuth Playground with scope https://www.googleapis.com/auth/webmasters.readonly.",
    "Copy the refresh token. (The same Google OAuth credential can power GA4/Ads/GSC.)",
    "Paste client ID, client secret, refresh token below.",
  ],
  secretKeys: [
    { key: "GOOGLE_OAUTH_CLIENT_ID", label: "OAuth Client ID" },
    { key: "GOOGLE_OAUTH_CLIENT_SECRET", label: "OAuth Client Secret" },
    { key: "GOOGLE_OAUTH_REFRESH_TOKEN", label: "OAuth Refresh Token" },
  ],
  configKeys: [],
  tools,
  handlers,
};

export default template;
