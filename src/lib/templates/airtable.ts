import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function api(ctx: Ctx, path: string, params?: Record<string, unknown>) {
  const token = ctx.secrets.AIRTABLE_API_TOKEN;
  if (!token) throw new Error("AIRTABLE_API_TOKEN required");
  const url = new URL(`https://api.airtable.com/v0${path}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${(parsed as { error?: { message?: string } | string })?.error || text}`);
  return parsed;
}

async function metaApi(ctx: Ctx, path: string) {
  const token = ctx.secrets.AIRTABLE_API_TOKEN;
  const res = await fetch(`https://api.airtable.com/v0/meta${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Airtable meta ${res.status}: ${text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "airtable_get_server_policy", description: "Airtable MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "airtable_list_bases", description: "List bases the PAT can access.", inputSchema: { type: "object", properties: {} } },
  { name: "airtable_list_tables", description: "List tables in a base.", inputSchema: { type: "object", properties: { base_id: { type: "string" } }, required: ["base_id"] } },
  { name: "airtable_list_records", description: "List records in a table.", inputSchema: { type: "object", properties: { base_id: { type: "string" }, table: { type: "string" }, filter_by_formula: { type: "string" }, max_records: { type: "number" }, view: { type: "string" } }, required: ["base_id", "table"] } },
];

const handlers: Record<string, ToolHandler> = {
  airtable_get_server_policy: async () => ({ api_family: "Airtable Web API v0" }),
  airtable_list_bases: async (_args, ctx) => metaApi(ctx, "/bases"),
  airtable_list_tables: async (args, ctx) => metaApi(ctx, `/bases/${args.base_id}/tables`),
  airtable_list_records: async (args, ctx) => api(ctx, `/${args.base_id}/${encodeURIComponent(String(args.table))}`, {
    filterByFormula: args.filter_by_formula,
    maxRecords: args.max_records || 100,
    view: args.view,
  }),
};

const template: Template = {
  slug: "airtable",
  name: "Airtable",
  description: "Read bases, tables, and records via Airtable Personal Access Token.",
  icon: "Airtable",
  category: "Productivity",
  version: "1.0",
  auth: "Personal access token",
  setupUrl: "https://airtable.com/create/tokens",
  setupSteps: [
    "Go to https://airtable.com/create/tokens.",
    "'Create new token' → name it 'Monarch'.",
    "Add scopes: data.records:read, schema.bases:read.",
    "Add the bases you want accessible (or 'All current and future bases').",
    "Copy the token (starts with 'pat…') and paste below.",
  ],
  secretKeys: [{ key: "AIRTABLE_API_TOKEN", label: "Personal Access Token" }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
