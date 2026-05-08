import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function dfsApi(ctx: Ctx, path: string, body: unknown[]) {
  const auth = ctx.secrets.DATAFORSEO_AUTH_BASE64;
  if (!auth) throw new Error("DATAFORSEO_AUTH_BASE64 secret is required");
  const res = await fetch(`https://api.dataforseo.com/v3/${path.replace(/^\/+/, "")}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`DataForSEO ${res.status}: ${text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "kv_get_server_policy", description: "Keyword Volume MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "kv_lookup", description: "Look up monthly search volume for keywords (DataForSEO).", inputSchema: { type: "object", properties: { keywords: { type: "array", items: { type: "string" } }, location_name: { type: "string" }, language_code: { type: "string" } }, required: ["keywords"] } },
];

const handlers: Record<string, ToolHandler> = {
  kv_get_server_policy: async (_args, ctx) => ({
    api_family: "DataForSEO Keywords Data API",
    default_location: ctx.config.DATAFORSEO_DEFAULT_LOCATION_NAME || "Kolkata,India",
    default_language: ctx.config.DATAFORSEO_DEFAULT_LANGUAGE_NAME || "English",
  }),
  kv_lookup: async (args, ctx) => {
    const keywords = (args.keywords as string[]).map(String).filter(Boolean);
    if (!keywords.length) throw new Error("keywords[] required");
    const location_name = String(args.location_name || ctx.config.DATAFORSEO_DEFAULT_LOCATION_NAME || "Kolkata,Kolkata,West Bengal,India");
    const language_code = String(args.language_code || ctx.config.DATAFORSEO_DEFAULT_LANGUAGE_CODE || "en");
    return dfsApi(ctx, "keywords_data/google_ads/search_volume/live", [{
      keywords,
      location_name,
      language_code,
    }]);
  },
};

const template: Template = {
  slug: "keyword-volume",
  name: "Keyword Volume",
  description: "Monthly search volume lookups via DataForSEO Keywords Data API.",
  icon: "DataForSEO",
  category: "SEO",
  version: "1.0",
  auth: "Basic auth",
  secretKeys: [
    { key: "DATAFORSEO_AUTH_BASE64", label: "Basic Auth (base64)", helpText: "base64('email:api-password') from DataForSEO dashboard." },
  ],
  configKeys: [
    { key: "DATAFORSEO_DEFAULT_LOCATION_NAME", label: "Default Location", defaultValue: "Kolkata,Kolkata,West Bengal,India" },
    { key: "DATAFORSEO_DEFAULT_LANGUAGE_CODE", label: "Default Language Code", defaultValue: "en" },
  ],
  tools,
  handlers,
};

export default template;
