import type { Template, ToolDef, ToolHandler } from "./types";
import { clampLimit, csv } from "./_helpers";

const DEFAULT_INSIGHT_FIELDS = [
  "account_id","account_name","campaign_id","campaign_name","adset_id","adset_name",
  "ad_id","ad_name","impressions","reach","frequency","clicks","inline_link_clicks",
  "ctr","cpc","cpm","spend","actions","cost_per_action_type","purchase_roas",
  "date_start","date_stop"
].join(",");

const ACCOUNT_FIELDS = "id,account_id,name,account_status,currency,timezone_name,business,amount_spent,balance,spend_cap,disable_reason";
const CAMPAIGN_FIELDS = "id,name,status,effective_status,objective,buying_type,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time,updated_time";
const ADSET_FIELDS = "id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,billing_event,optimization_goal,bid_strategy,start_time,end_time,created_time";
const AD_FIELDS = "id,name,campaign_id,adset_id,status,effective_status,creative,created_time,updated_time";
const CREATIVE_FIELDS = "id,name,title,body,object_story_spec,image_url,thumbnail_url,video_id,call_to_action_type";

function cleanAdAccountId(value: unknown, fallback?: string): string {
  const raw = String(value || fallback || "").trim().replace(/^act_/, "");
  if (!raw) throw new Error("ad_account_id is required");
  return `act_${raw}`;
}

async function api(
  ctx: { secrets: Record<string, string>; config: Record<string, string> },
  method: string,
  path: string,
  params?: Record<string, unknown>,
  payload?: Record<string, unknown>
) {
  const token = ctx.secrets.META_ACCESS_TOKEN;
  if (!token) throw new Error("Secret META_ACCESS_TOKEN is not configured");
  const version = ctx.config.META_GRAPH_API_VERSION || "v25.0";
  const url = new URL(`https://graph.facebook.com/${version}/${path.replace(/^\/+/, "")}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const body = payload
    ? new URLSearchParams(
        Object.entries(payload)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])
      )
    : undefined;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  if (!res.ok) {
    const p = parsed as { error?: { message?: string; code?: number } };
    throw new Error(`Meta API ${res.status}: ${p?.error?.message || text}`);
  }
  return parsed;
}

const tools: ToolDef[] = [
  { name: "meta_ads_get_server_policy", description: "Server policy and Graph API version.", inputSchema: { type: "object", properties: {} } },
  { name: "meta_ads_me", description: "Get the Meta identity for the token.", inputSchema: { type: "object", properties: { fields: { type: "string" } } } },
  { name: "meta_ads_list_ad_accounts", description: "List ad accounts available to the token.", inputSchema: { type: "object", properties: { fields: { type: "string" }, limit: { type: "number" }, after: { type: "string" } } } },
  { name: "meta_ads_list_all_ad_accounts", description: "Auto-paginate ALL accessible ad accounts.", inputSchema: { type: "object", properties: { fields: { type: "string" }, limit: { type: "number" } } } },
  { name: "meta_ads_get_ad_account", description: "Get one ad account by ID.", inputSchema: { type: "object", properties: { ad_account_id: { type: "string" }, fields: { type: "string" } }, required: ["ad_account_id"] } },
  { name: "meta_ads_list_campaigns", description: "List campaigns under an ad account.", inputSchema: { type: "object", properties: { ad_account_id: { type: "string" }, fields: { type: "string" }, effective_status: { type: "array", items: { type: "string" } }, limit: { type: "number" }, after: { type: "string" } }, required: ["ad_account_id"] } },
  { name: "meta_ads_list_adsets", description: "List ad sets under a campaign or ad account.", inputSchema: { type: "object", properties: { ad_account_id: { type: "string" }, campaign_id: { type: "string" }, limit: { type: "number" }, after: { type: "string" } } } },
  { name: "meta_ads_list_ads", description: "List ads under an account/adset/campaign.", inputSchema: { type: "object", properties: { ad_account_id: { type: "string" }, campaign_id: { type: "string" }, adset_id: { type: "string" }, limit: { type: "number" }, after: { type: "string" } } } },
  { name: "meta_ads_list_creatives", description: "List creatives under an ad account.", inputSchema: { type: "object", properties: { ad_account_id: { type: "string" }, limit: { type: "number" }, after: { type: "string" } }, required: ["ad_account_id"] } },
  { name: "meta_ads_insights", description: "Pull insights with date range/preset, level, breakdowns, fields.", inputSchema: { type: "object", properties: { ad_account_id: { type: "string" }, level: { type: "string" }, date_preset: { type: "string" }, time_range: { type: "object" }, fields: { type: "string" }, breakdowns: { type: "array", items: { type: "string" } }, limit: { type: "number" } }, required: ["ad_account_id"] } },
  { name: "meta_ads_api_request", description: "Read-only Graph API GET request.", inputSchema: { type: "object", properties: { path: { type: "string" }, params: { type: "object" } }, required: ["path"] } },
];

const handlers: Record<string, ToolHandler> = {
  meta_ads_get_server_policy: async (_args, ctx) => ({
    api_family: "Meta Graph API / Marketing API",
    graph_api_version: ctx.config.META_GRAPH_API_VERSION || "v25.0",
    write_enabled: false,
  }),
  meta_ads_me: async (args, ctx) => api(ctx, "GET", "me", { fields: args.fields || "id,name" }),
  meta_ads_list_ad_accounts: async (args, ctx) => api(ctx, "GET", "me/adaccounts", {
    fields: args.fields || ACCOUNT_FIELDS, limit: clampLimit(args.limit), after: args.after,
  }),
  meta_ads_list_all_ad_accounts: async (args, ctx) => {
    const all: Record<string, unknown>[] = [];
    let after: string | undefined;
    const limit = clampLimit(args.limit);
    for (;;) {
      const r = (await api(ctx, "GET", "me/adaccounts", {
        fields: args.fields || ACCOUNT_FIELDS, limit, after,
      })) as { data?: Record<string, unknown>[]; paging?: { cursors?: { after?: string }; next?: string } };
      all.push(...(r.data || []));
      after = r.paging?.cursors?.after;
      if (!after || !r.paging?.next) break;
    }
    return { total_accounts: all.length, data: all };
  },
  meta_ads_get_ad_account: async (args, ctx) => api(ctx, "GET", cleanAdAccountId(args.ad_account_id), {
    fields: args.fields || ACCOUNT_FIELDS + ",created_time",
  }),
  meta_ads_list_campaigns: async (args, ctx) => api(ctx, "GET", `${cleanAdAccountId(args.ad_account_id)}/campaigns`, {
    fields: args.fields || CAMPAIGN_FIELDS,
    effective_status: Array.isArray(args.effective_status) && args.effective_status.length ? JSON.stringify(args.effective_status) : undefined,
    limit: clampLimit(args.limit), after: args.after,
  }),
  meta_ads_list_adsets: async (args, ctx) => {
    const path = args.campaign_id ? `${args.campaign_id}/adsets` : `${cleanAdAccountId(args.ad_account_id)}/adsets`;
    return api(ctx, "GET", path, { fields: ADSET_FIELDS, limit: clampLimit(args.limit), after: args.after });
  },
  meta_ads_list_ads: async (args, ctx) => {
    const path = args.adset_id ? `${args.adset_id}/ads`
      : args.campaign_id ? `${args.campaign_id}/ads`
      : `${cleanAdAccountId(args.ad_account_id)}/ads`;
    return api(ctx, "GET", path, { fields: AD_FIELDS, limit: clampLimit(args.limit), after: args.after });
  },
  meta_ads_list_creatives: async (args, ctx) => api(ctx, "GET", `${cleanAdAccountId(args.ad_account_id)}/adcreatives`, {
    fields: CREATIVE_FIELDS, limit: clampLimit(args.limit), after: args.after,
  }),
  meta_ads_insights: async (args, ctx) => api(ctx, "GET", `${cleanAdAccountId(args.ad_account_id)}/insights`, {
    level: args.level || "campaign",
    date_preset: args.date_preset || (args.time_range ? undefined : "last_30d"),
    time_range: args.time_range ? JSON.stringify(args.time_range) : undefined,
    fields: args.fields || DEFAULT_INSIGHT_FIELDS,
    breakdowns: csv(args.breakdowns) || undefined,
    limit: clampLimit(args.limit),
  }),
  meta_ads_api_request: async (args, ctx) => {
    if (!args.path) throw new Error("path is required");
    return api(ctx, "GET", String(args.path), (args.params as Record<string, unknown>) || {});
  },
};

const template: Template = {
  slug: "meta-ads",
  name: "Meta Ads",
  description: "Read-only access to Meta (Facebook/Instagram) Marketing API. Accounts, campaigns, adsets, ads, insights.",
  icon: "Meta",
  category: "Ads",
  version: "1.0",
  auth: "Long-lived access token",
  setupUrl: "https://developers.facebook.com/apps",
  setupSteps: [
    "Go to Meta for Developers → Apps → My Apps → create a 'Business' type app.",
    "Add the 'Marketing API' product to the app.",
    "Open Tools → Graph API Explorer, pick your app + 'Get User Access Token'.",
    "Select scopes: ads_read, read_insights, business_management.",
    "Paste the short-lived token into the Access Token Debugger and click 'Extend Access Token' to get a 60-day version.",
    "Copy the long-lived token and paste it below.",
  ],
  secretKeys: [
    { key: "META_ACCESS_TOKEN", label: "Access Token", helpText: "Long-lived Meta Marketing API access token (ads_read scope)." },
  ],
  configKeys: [
    { key: "META_GRAPH_API_VERSION", label: "Graph API Version", defaultValue: "v25.0" },
  ],
  tools,
  handlers,
};

export default template;
