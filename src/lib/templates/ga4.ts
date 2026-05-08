import type { Template, ToolDef, ToolHandler } from "./types";
import { getGoogleAccessToken } from "./_google-oauth";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

function cleanPropertyId(value: unknown, fallback?: string): string {
  const raw = String(value || fallback || "").trim().replace(/^properties\//, "");
  if (!raw) throw new Error("property_id is required");
  return raw;
}

async function gaApi(ctx: Ctx, method: string, path: string, body?: unknown) {
  const token = await getGoogleAccessToken(ctx);
  const url = `https://analyticsdata.googleapis.com/v1beta/${path.replace(/^\/+/, "")}`;
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
    throw new Error(`GA4 API ${res.status}: ${p?.error?.message || text}`);
  }
  return parsed;
}

async function adminApi(ctx: Ctx, path: string) {
  const token = await getGoogleAccessToken(ctx);
  const url = `https://analyticsadmin.googleapis.com/v1beta/${path.replace(/^\/+/, "")}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  if (!res.ok) {
    const p = parsed as { error?: { message?: string } };
    throw new Error(`GA4 Admin API ${res.status}: ${p?.error?.message || text}`);
  }
  return parsed;
}

const tools: ToolDef[] = [
  { name: "ga4_get_server_policy", description: "GA4 MCP server policy.", inputSchema: { type: "object", properties: {} } },
  { name: "ga4_list_accounts", description: "List GA accounts the user has access to.", inputSchema: { type: "object", properties: {} } },
  { name: "ga4_list_properties", description: "List GA4 properties under an account.", inputSchema: { type: "object", properties: { account_id: { type: "string" } }, required: ["account_id"] } },
  { name: "ga4_run_report", description: "Run a custom GA4 report.", inputSchema: { type: "object", properties: { property_id: { type: "string" }, metrics: { type: "array", items: { type: "string" } }, dimensions: { type: "array", items: { type: "string" } }, date_range: { type: "object" }, limit: { type: "number" } }, required: ["property_id", "metrics"] } },
  { name: "ga4_top_pages", description: "Top pages report (last 30 days).", inputSchema: { type: "object", properties: { property_id: { type: "string" }, limit: { type: "number" } }, required: ["property_id"] } },
  { name: "ga4_traffic_sources", description: "Traffic sources / channels.", inputSchema: { type: "object", properties: { property_id: { type: "string" }, limit: { type: "number" } }, required: ["property_id"] } },
  { name: "ga4_realtime_users", description: "Realtime active users.", inputSchema: { type: "object", properties: { property_id: { type: "string" } }, required: ["property_id"] } },
];

function dateRange(input: unknown): { startDate: string; endDate: string }[] {
  const obj = (input || {}) as { start?: string; end?: string };
  return [{
    startDate: obj.start || "30daysAgo",
    endDate: obj.end || "today",
  }];
}

const handlers: Record<string, ToolHandler> = {
  ga4_get_server_policy: async () => ({ api_family: "Google Analytics 4 Data API v1beta" }),
  ga4_list_accounts: async (_args, ctx) => adminApi(ctx, "accounts"),
  ga4_list_properties: async (args, ctx) =>
    adminApi(ctx, `properties?filter=parent:accounts/${String(args.account_id).replace(/^accounts\//, "")}`),
  ga4_run_report: async (args, ctx) => {
    const id = cleanPropertyId(args.property_id);
    const body = {
      dimensions: (args.dimensions as string[] || []).map((n) => ({ name: n })),
      metrics: (args.metrics as string[]).map((n) => ({ name: n })),
      dateRanges: dateRange(args.date_range),
      limit: Number(args.limit || 50),
    };
    return gaApi(ctx, "POST", `properties/${id}:runReport`, body);
  },
  ga4_top_pages: async (args, ctx) => {
    const id = cleanPropertyId(args.property_id);
    return gaApi(ctx, "POST", `properties/${id}:runReport`, {
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }, { name: "averageSessionDuration" }],
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: Number(args.limit || 50),
    });
  },
  ga4_traffic_sources: async (args, ctx) => {
    const id = cleanPropertyId(args.property_id);
    return gaApi(ctx, "POST", `properties/${id}:runReport`, {
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "engagedSessions" }],
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: Number(args.limit || 50),
    });
  },
  ga4_realtime_users: async (args, ctx) => {
    const id = cleanPropertyId(args.property_id);
    return gaApi(ctx, "POST", `properties/${id}:runRealtimeReport`, {
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
    });
  },
};

const template: Template = {
  slug: "ga4",
  name: "Google Analytics 4",
  description: "GA4 Data API + Admin API. Reports, top pages, traffic sources, realtime.",
  icon: "GA4",
  category: "Analytics",
  version: "1.0",
  auth: "OAuth refresh token",
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
