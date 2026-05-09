import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

function dc(key: string): string {
  // Mailchimp keys are formatted: <hash>-<dc>
  const m = key.match(/-([a-z0-9]+)$/i);
  if (!m) throw new Error("Invalid Mailchimp key (missing data center suffix)");
  return m[1];
}

async function api(ctx: Ctx, path: string, params?: Record<string, unknown>) {
  const key = ctx.secrets.MAILCHIMP_API_KEY;
  if (!key) throw new Error("MAILCHIMP_API_KEY required");
  const url = new URL(`https://${dc(key)}.api.mailchimp.com/3.0${path}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const auth = Buffer.from(`anystring:${key}`).toString("base64");
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Mailchimp ${res.status}: ${(parsed as { detail?: string })?.detail || text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "mailchimp_get_server_policy", description: "Mailchimp MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "mailchimp_list_audiences", description: "List audience lists.", inputSchema: { type: "object", properties: { count: { type: "number" } } } },
  { name: "mailchimp_list_campaigns", description: "List campaigns.", inputSchema: { type: "object", properties: { count: { type: "number" }, status: { type: "string", description: "save|paused|schedule|sending|sent" } } } },
  { name: "mailchimp_list_members", description: "List members of an audience.", inputSchema: { type: "object", properties: { list_id: { type: "string" }, count: { type: "number" } }, required: ["list_id"] } },
];

const handlers: Record<string, ToolHandler> = {
  mailchimp_get_server_policy: async (_args, ctx) => ({ api_family: "Mailchimp Marketing API 3.0", data_center: ctx.secrets.MAILCHIMP_API_KEY ? dc(ctx.secrets.MAILCHIMP_API_KEY) : null }),
  mailchimp_list_audiences: async (args, ctx) => api(ctx, "/lists", { count: args.count || 25 }),
  mailchimp_list_campaigns: async (args, ctx) => api(ctx, "/campaigns", { count: args.count || 25, status: args.status }),
  mailchimp_list_members: async (args, ctx) => api(ctx, `/lists/${args.list_id}/members`, { count: args.count || 25 }),
};

const template: Template = {
  slug: "mailchimp",
  name: "Mailchimp",
  description: "Read audiences, campaigns, members.",
  icon: "Mailchimp",
  category: "Email",
  version: "1.0",
  auth: "API key",
  setupUrl: "https://us1.admin.mailchimp.com/account/api/",
  setupSteps: [
    "Sign in to Mailchimp → top-right avatar → Account & billing → Extras → API keys.",
    "'Create A Key' → name it 'Monarch'.",
    "Copy the key — note the suffix after the dash (e.g. -us17), that's your data center.",
    "Paste below. The data center is detected automatically.",
  ],
  secretKeys: [{ key: "MAILCHIMP_API_KEY", label: "API Key", helpText: "Format: <hash>-<dc>, e.g. abc123…-us17" }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
