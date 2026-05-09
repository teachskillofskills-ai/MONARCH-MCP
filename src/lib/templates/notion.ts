import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function api(ctx: Ctx, path: string, body?: unknown, method = "POST") {
  const token = ctx.secrets.NOTION_API_TOKEN;
  if (!token) throw new Error("NOTION_API_TOKEN required");
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Notion ${res.status}: ${(parsed as { message?: string })?.message || text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "notion_get_server_policy", description: "Notion MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "notion_search", description: "Search pages/databases the integration can access.", inputSchema: { type: "object", properties: { query: { type: "string" }, page_size: { type: "number" } } } },
  { name: "notion_get_page", description: "Get a page by ID.", inputSchema: { type: "object", properties: { page_id: { type: "string" } }, required: ["page_id"] } },
  { name: "notion_get_database", description: "Get a database schema by ID.", inputSchema: { type: "object", properties: { database_id: { type: "string" } }, required: ["database_id"] } },
  { name: "notion_query_database", description: "Query rows of a database.", inputSchema: { type: "object", properties: { database_id: { type: "string" }, filter: { type: "object" }, sorts: { type: "array" }, page_size: { type: "number" } }, required: ["database_id"] } },
];

const handlers: Record<string, ToolHandler> = {
  notion_get_server_policy: async () => ({ api_family: "Notion API v2022-06-28" }),
  notion_search: async (args, ctx) => api(ctx, "/search", { query: args.query || "", page_size: args.page_size || 25 }),
  notion_get_page: async (args, ctx) => api(ctx, `/pages/${args.page_id}`, undefined, "GET"),
  notion_get_database: async (args, ctx) => api(ctx, `/databases/${args.database_id}`, undefined, "GET"),
  notion_query_database: async (args, ctx) => api(ctx, `/databases/${args.database_id}/query`, {
    filter: args.filter, sorts: args.sorts, page_size: args.page_size || 25,
  }),
};

const template: Template = {
  slug: "notion",
  name: "Notion",
  description: "Search and read Notion pages/databases via an internal integration.",
  icon: "Notion",
  category: "Productivity",
  version: "1.0",
  auth: "Internal integration token",
  setupUrl: "https://www.notion.so/my-integrations",
  setupSteps: [
    "Open https://www.notion.so/my-integrations → 'New integration'.",
    "Name it 'Monarch', choose your workspace, save.",
    "Copy the 'Internal Integration Secret' (starts with 'secret_…' or 'ntn_…').",
    "Open each Notion page/database you want accessible → '...' menu → 'Add connections' → pick Monarch.",
    "Paste the token below.",
  ],
  secretKeys: [{ key: "NOTION_API_TOKEN", label: "Integration Token" }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
