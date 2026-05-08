import type { Template, ToolDef, ToolHandler } from "./types";

function clampLimit(value: unknown, fallback = 100, max = 1000): number {
  return Math.max(1, Math.min(max, Number(value || fallback)));
}

function cleanAccountId(value: unknown, fallback?: string): string {
  const raw = String(value || fallback || "").trim().replace(/^urn:li:sponsoredAccount:/, "");
  if (!raw) throw new Error("ad_account_id is required");
  return raw;
}

function dateLiteral(d: Date): string {
  return `(year:${d.getUTCFullYear()},month:${d.getUTCMonth() + 1},day:${d.getUTCDate()})`;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d;
}

function isoDay(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toISOString().slice(0, 10);
}

const DEFAULT_ANALYTICS_FIELDS = [
  "dateRange", "pivotValues", "impressions", "clicks",
  "costInLocalCurrency", "costInUsd",
  "externalWebsiteConversions", "externalWebsitePostClickConversions",
  "externalWebsitePostViewConversions",
  "oneClickLeads", "oneClickLeadFormOpens",
  "videoViews", "videoCompletions", "landingPageClicks",
  "reactions", "comments", "shares", "follows",
].join(",");

async function api(
  ctx: { secrets: Record<string, string>; config: Record<string, string> },
  method: string,
  pathOrUrl: string,
  body?: unknown
) {
  const token = ctx.secrets.LINKEDIN_ACCESS_TOKEN;
  if (!token) throw new Error("Secret LINKEDIN_ACCESS_TOKEN is not configured for this MCP instance");
  const version = ctx.config.LINKEDIN_API_VERSION || "202604";
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `https://api.linkedin.com${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "LinkedIn-Version": version,
      "X-Restli-Protocol-Version": "2.0.0",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let payload: unknown;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }
  if (!res.ok) {
    const p = payload as { message?: string; code?: string };
    throw new Error(`LinkedIn API ${res.status}${p?.code ? ` ${p.code}` : ""}: ${p?.message || text}`);
  }
  return payload;
}

const tools: ToolDef[] = [
  { name: "linkedin_ads_get_server_policy", description: "Describe the LinkedIn Ads MCP configuration.", inputSchema: { type: "object", properties: {} } },
  { name: "linkedin_ads_me", description: "Return the authenticated LinkedIn member profile.", inputSchema: { type: "object", properties: {} } },
  { name: "linkedin_ads_list_ad_accounts", description: "List ad accounts (one page).", inputSchema: { type: "object", properties: { statuses: { type: "array", items: { type: "string" } }, start: { type: "number" }, count: { type: "number" } } } },
  { name: "linkedin_ads_list_all_ad_accounts", description: "Auto-paginate ALL ad accounts. Returns compact records.", inputSchema: { type: "object", properties: { statuses: { type: "array", items: { type: "string" } }, count: { type: "number" } } } },
  { name: "linkedin_ads_get_ad_account", description: "Fetch one ad account by ID.", inputSchema: { type: "object", properties: { ad_account_id: { type: "string" } }, required: ["ad_account_id"] } },
  { name: "linkedin_ads_list_campaign_groups", description: "List campaign groups under an ad account.", inputSchema: { type: "object", properties: { ad_account_id: { type: "string" }, start: { type: "number" }, count: { type: "number" } }, required: ["ad_account_id"] } },
  { name: "linkedin_ads_list_campaigns", description: "List campaigns under an ad account.", inputSchema: { type: "object", properties: { ad_account_id: { type: "string" }, start: { type: "number" }, count: { type: "number" } }, required: ["ad_account_id"] } },
  { name: "linkedin_ads_list_creatives", description: "List creatives under an ad account.", inputSchema: { type: "object", properties: { ad_account_id: { type: "string" }, start: { type: "number" }, count: { type: "number" } }, required: ["ad_account_id"] } },
  { name: "linkedin_ads_analytics", description: "Pull analytics for an ad account over a date range. Pivot defaults to CAMPAIGN.", inputSchema: { type: "object", properties: { ad_account_id: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" }, pivot: { type: "string" }, time_granularity: { type: "string" }, fields: { type: "string" } }, required: ["ad_account_id", "start_date"] } },
  { name: "linkedin_ads_api_request", description: "Escape hatch: arbitrary GET against LinkedIn API.", inputSchema: { type: "object", properties: { method: { type: "string" }, path: { type: "string" }, body: { type: "object" } }, required: ["path"] } },
];

const handlers: Record<string, ToolHandler> = {
  linkedin_ads_get_server_policy: async (_args, ctx) => ({
    api_family: "LinkedIn Marketing / Advertising API (REST)",
    linkedin_version: ctx.config.LINKEDIN_API_VERSION || "202604",
    auth: "Server holds long-lived access token; no client OAuth needed.",
    expected_scopes: ["r_ads", "r_ads_reporting", "r_basicprofile"],
  }),

  linkedin_ads_me: async (_args, ctx) => api(ctx, "GET", "/v2/me"),

  linkedin_ads_list_ad_accounts: async (args, ctx) => {
    const statuses = (Array.isArray(args.statuses) && args.statuses.length
      ? args.statuses
      : ["ACTIVE", "DRAFT"]
    ).map((s) => String(s).toUpperCase());
    const path = `/rest/adAccounts?q=search&search=(status:(values:List(${statuses.join(",")})))&start=${Number(args.start || 0)}&count=${clampLimit(args.count)}`;
    return api(ctx, "GET", path);
  },

  linkedin_ads_list_all_ad_accounts: async (args, ctx) => {
    const statuses = (Array.isArray(args.statuses) && args.statuses.length
      ? args.statuses
      : ["ACTIVE", "DRAFT"]
    ).map((s) => String(s).toUpperCase());
    const count = clampLimit(args.count, 100, 1000);
    const all: Record<string, unknown>[] = [];
    let start = 0;
    for (;;) {
      const path = `/rest/adAccounts?q=search&search=(status:(values:List(${statuses.join(",")})))&start=${start}&count=${count}`;
      const r = (await api(ctx, "GET", path)) as { elements?: Record<string, unknown>[] };
      const els = r?.elements || [];
      all.push(...els);
      if (els.length < count) break;
      start += count;
    }
    return {
      total_accounts: all.length,
      data: all.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        serving_status: (a.servingStatuses as string[] || []).join("|"),
        type: a.type,
        currency: a.currency,
        is_test: a.test,
        reference_urn: a.reference,
        created: isoDay((a.changeAuditStamps as { created?: { time?: number } } | undefined)?.created?.time),
        last_modified: isoDay((a.changeAuditStamps as { lastModified?: { time?: number } } | undefined)?.lastModified?.time),
      })),
    };
  },

  linkedin_ads_get_ad_account: async (args, ctx) => api(ctx, "GET", `/rest/adAccounts/${cleanAccountId(args.ad_account_id)}`),

  linkedin_ads_list_campaign_groups: async (args, ctx) => api(
    ctx, "GET",
    `/rest/adAccounts/${cleanAccountId(args.ad_account_id)}/adCampaignGroups?q=search&start=${Number(args.start || 0)}&count=${clampLimit(args.count)}`
  ),

  linkedin_ads_list_campaigns: async (args, ctx) => api(
    ctx, "GET",
    `/rest/adAccounts/${cleanAccountId(args.ad_account_id)}/adCampaigns?q=search&start=${Number(args.start || 0)}&count=${clampLimit(args.count)}`
  ),

  linkedin_ads_list_creatives: async (args, ctx) => api(
    ctx, "GET",
    `/rest/adAccounts/${cleanAccountId(args.ad_account_id)}/creatives?q=criteria&start=${Number(args.start || 0)}&count=${clampLimit(args.count)}`
  ),

  linkedin_ads_analytics: async (args, ctx) => {
    const id = cleanAccountId(args.ad_account_id);
    const start = parseDate(args.start_date);
    const end = parseDate(args.end_date) || new Date();
    if (!start) throw new Error("start_date (YYYY-MM-DD) is required");
    const pivot = String(args.pivot || "CAMPAIGN").toUpperCase();
    const granularity = String(args.time_granularity || "DAILY").toUpperCase();
    const fields = String(args.fields || DEFAULT_ANALYTICS_FIELDS);
    const path = `/rest/adAnalytics?q=analytics&pivot=${pivot}&timeGranularity=${granularity}` +
      `&dateRange=(start:${dateLiteral(start)},end:${dateLiteral(end)})` +
      `&accounts=List(urn%3Ali%3AsponsoredAccount%3A${id})&fields=${fields}`;
    return api(ctx, "GET", path);
  },

  linkedin_ads_api_request: async (args, ctx) => {
    if (!args.path) throw new Error("path is required");
    const method = String(args.method || "GET").toUpperCase();
    if (method !== "GET") throw new Error("Only GET allowed (read-only)");
    return api(ctx, method, String(args.path), args.body);
  },
};

const template: Template = {
  slug: "linkedin-ads",
  name: "LinkedIn Ads",
  description: "Read-only access to LinkedIn Marketing / Advertising API. Pulls accounts, campaigns, creatives, analytics.",
  icon: "LinkedIn",
  category: "Ads",
  version: "1.0",
  auth: "OAuth · 60-day token",
  secretKeys: [
    { key: "LINKEDIN_ACCESS_TOKEN", label: "Access Token", helpText: "Long-lived 60-day OAuth access token from LinkedIn Marketing Developer Platform." },
  ],
  configKeys: [
    { key: "LINKEDIN_API_VERSION", label: "API Version", defaultValue: "202604", helpText: "LinkedIn-Version header (YYYYMM)." },
  ],
  tools,
  handlers,
};

export default template;
