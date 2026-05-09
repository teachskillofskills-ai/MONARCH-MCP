import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function api(ctx: Ctx, path: string, params?: Record<string, unknown>) {
  const token = ctx.secrets.HUBSPOT_API_TOKEN;
  if (!token) throw new Error("HUBSPOT_API_TOKEN required");
  const url = new URL(`https://api.hubapi.com${path}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`HubSpot ${res.status}: ${(parsed as { message?: string })?.message || text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "hubspot_get_server_policy", description: "HubSpot MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "hubspot_list_contacts", description: "List contacts.", inputSchema: { type: "object", properties: { limit: { type: "number" }, after: { type: "string" } } } },
  { name: "hubspot_list_companies", description: "List companies.", inputSchema: { type: "object", properties: { limit: { type: "number" }, after: { type: "string" } } } },
  { name: "hubspot_list_deals", description: "List deals.", inputSchema: { type: "object", properties: { limit: { type: "number" }, after: { type: "string" } } } },
  { name: "hubspot_search_contacts", description: "Search contacts by query.", inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } },
];

const handlers: Record<string, ToolHandler> = {
  hubspot_get_server_policy: async () => ({ api_family: "HubSpot CRM API v3" }),
  hubspot_list_contacts: async (args, ctx) => api(ctx, "/crm/v3/objects/contacts", { limit: args.limit || 25, after: args.after }),
  hubspot_list_companies: async (args, ctx) => api(ctx, "/crm/v3/objects/companies", { limit: args.limit || 25, after: args.after }),
  hubspot_list_deals: async (args, ctx) => api(ctx, "/crm/v3/objects/deals", { limit: args.limit || 25, after: args.after }),
  hubspot_search_contacts: async (args, ctx) => {
    const token = ctx.secrets.HUBSPOT_API_TOKEN;
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: String(args.query), limit: args.limit || 25 }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HubSpot search ${res.status}: ${text}`);
    return JSON.parse(text);
  },
};

const template: Template = {
  slug: "hubspot",
  name: "HubSpot",
  description: "Read contacts, companies, deals from HubSpot CRM.",
  icon: "HubSpot",
  category: "CRM",
  version: "1.0",
  auth: "Private app token",
  setupUrl: "https://app.hubspot.com/settings",
  setupSteps: [
    "In HubSpot → Settings → Integrations → Private Apps → 'Create a private app'.",
    "Name 'Monarch'. Scopes: crm.objects.contacts.read, crm.objects.companies.read, crm.objects.deals.read.",
    "Save → reveal access token.",
    "Copy and paste below.",
  ],
  secretKeys: [{ key: "HUBSPOT_API_TOKEN", label: "Private App Token" }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
