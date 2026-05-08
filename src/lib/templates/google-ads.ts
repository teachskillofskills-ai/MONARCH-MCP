import type { Template, ToolDef, ToolHandler } from "./types";
import { getGoogleAccessToken } from "./_google-oauth";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

function cleanCustomerId(value: unknown, fallback?: string): string {
  const raw = String(value || fallback || "").trim().replace(/[^0-9]/g, "");
  if (!raw) throw new Error("customer_id is required");
  return raw;
}

async function adsApi(ctx: Ctx, method: string, path: string, body?: unknown) {
  const token = await getGoogleAccessToken(ctx);
  const developerToken = ctx.secrets.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN secret is required");
  const loginCustomerId = ctx.config.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ctx.secrets.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };
  if (loginCustomerId) headers["login-customer-id"] = String(loginCustomerId).replace(/[^0-9]/g, "");

  const version = ctx.config.GOOGLE_ADS_API_VERSION || "v22";
  const url = `https://googleads.googleapis.com/${version}/${path.replace(/^\/+/, "")}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  if (!res.ok) {
    const p = parsed as { error?: { message?: string } };
    throw new Error(`Google Ads API ${res.status}: ${p?.error?.message || text}`);
  }
  return parsed;
}

const tools: ToolDef[] = [
  { name: "google_ads_get_server_policy", description: "Get server policy and configured defaults.", inputSchema: { type: "object", properties: {} } },
  { name: "google_ads_list_accessible_customers", description: "List Google Ads customer resource names accessible to the OAuth user.", inputSchema: { type: "object", properties: {} } },
  { name: "google_ads_run_gaql_query", description: "Run a read-only GAQL SELECT query against a customer.", inputSchema: { type: "object", properties: { customer_id: { type: "string" }, query: { type: "string" }, login_customer_id: { type: "string" } }, required: ["customer_id", "query"] } },
  { name: "google_ads_list_campaigns", description: "List campaigns with metrics for a customer (last 30 days by default).", inputSchema: { type: "object", properties: { customer_id: { type: "string" }, limit: { type: "number" } }, required: ["customer_id"] } },
  { name: "google_ads_list_ad_groups", description: "List ad groups with metrics.", inputSchema: { type: "object", properties: { customer_id: { type: "string" }, campaign_id: { type: "string" }, limit: { type: "number" } }, required: ["customer_id"] } },
  { name: "google_ads_search_terms_report", description: "Get search-term performance report.", inputSchema: { type: "object", properties: { customer_id: { type: "string" }, limit: { type: "number" } }, required: ["customer_id"] } },
];

const handlers: Record<string, ToolHandler> = {
  google_ads_get_server_policy: async (_args, ctx) => ({
    api_family: "Google Ads API v18",
    default_customer_id: ctx.config.GOOGLE_ADS_DEFAULT_CUSTOMER_ID || null,
    login_customer_id: ctx.config.GOOGLE_ADS_LOGIN_CUSTOMER_ID || ctx.secrets.GOOGLE_ADS_LOGIN_CUSTOMER_ID || null,
  }),
  google_ads_list_accessible_customers: async (_args, ctx) =>
    adsApi(ctx, "GET", "customers:listAccessibleCustomers"),
  google_ads_run_gaql_query: async (args, ctx) => {
    const id = cleanCustomerId(args.customer_id);
    const query = String(args.query || "").trim();
    if (!/^select\s/i.test(query)) throw new Error("Only SELECT queries allowed");
    return adsApi(ctx, "POST", `customers/${id}/googleAds:search`, { query, pageSize: 10000 });
  },
  google_ads_list_campaigns: async (args, ctx) => {
    const id = cleanCustomerId(args.customer_id, ctx.config.GOOGLE_ADS_DEFAULT_CUSTOMER_ID);
    const limit = Math.min(1000, Number(args.limit || 100));
    const query = `
      SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
             metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.impressions DESC
      LIMIT ${limit}
    `;
    return adsApi(ctx, "POST", `customers/${id}/googleAds:search`, { query, pageSize: limit });
  },
  google_ads_list_ad_groups: async (args, ctx) => {
    const id = cleanCustomerId(args.customer_id, ctx.config.GOOGLE_ADS_DEFAULT_CUSTOMER_ID);
    const limit = Math.min(1000, Number(args.limit || 100));
    const filters = args.campaign_id ? `AND ad_group.campaign = 'customers/${id}/campaigns/${args.campaign_id}'` : "";
    const query = `
      SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.campaign,
             metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM ad_group
      WHERE segments.date DURING LAST_30_DAYS ${filters}
      ORDER BY metrics.impressions DESC
      LIMIT ${limit}
    `;
    return adsApi(ctx, "POST", `customers/${id}/googleAds:search`, { query, pageSize: limit });
  },
  google_ads_search_terms_report: async (args, ctx) => {
    const id = cleanCustomerId(args.customer_id, ctx.config.GOOGLE_ADS_DEFAULT_CUSTOMER_ID);
    const limit = Math.min(1000, Number(args.limit || 100));
    const query = `
      SELECT search_term_view.search_term, ad_group.id, ad_group.name,
             metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
      FROM search_term_view
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.impressions DESC
      LIMIT ${limit}
    `;
    return adsApi(ctx, "POST", `customers/${id}/googleAds:search`, { query, pageSize: limit });
  },
};

const template: Template = {
  slug: "google-ads",
  name: "Google Ads",
  description: "Read-only Google Ads API. Run GAQL queries, list campaigns/ad-groups, search-term reports.",
  icon: "GoogleAds",
  category: "Ads",
  version: "1.0",
  auth: "OAuth refresh token",
  secretKeys: [
    { key: "GOOGLE_OAUTH_CLIENT_ID", label: "OAuth Client ID" },
    { key: "GOOGLE_OAUTH_CLIENT_SECRET", label: "OAuth Client Secret" },
    { key: "GOOGLE_OAUTH_REFRESH_TOKEN", label: "OAuth Refresh Token" },
    { key: "GOOGLE_ADS_DEVELOPER_TOKEN", label: "Developer Token" },
  ],
  configKeys: [
    { key: "GOOGLE_ADS_API_VERSION", label: "API Version", defaultValue: "v22", helpText: "Google Ads REST version (e.g. v22, v21)." },
    { key: "GOOGLE_ADS_LOGIN_CUSTOMER_ID", label: "Login (Manager) Customer ID" },
    { key: "GOOGLE_ADS_DEFAULT_CUSTOMER_ID", label: "Default Customer ID" },
  ],
  tools,
  handlers,
};

export default template;
