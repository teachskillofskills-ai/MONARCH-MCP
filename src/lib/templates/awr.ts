import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function awrApi(ctx: Ctx, params: Record<string, string | number>, responseType: "json" | "text" = "json") {
  const token = ctx.secrets.AWR_API_TOKEN;
  if (!token) throw new Error("AWR_API_TOKEN secret is required");
  const url = new URL("https://api.awrcloud.com/v2/get.php");
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AWR API ${res.status}: ${await res.text()}`);
  if (responseType === "text") return res.text();
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function parseAwrCsv(raw: string): Record<string, string>[] {
  const text = String(raw || "").replace(/<br\s*\/?>/gi, "\n").replace(/\r/g, "").trim();
  if (!text) return [];
  const lines = text.split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ""; });
    return row;
  });
}

const tools: ToolDef[] = [
  { name: "awr_get_server_policy", description: "AWR MCP server policy.", inputSchema: { type: "object", properties: {} } },
  { name: "awr_list_projects", description: "List all AWR projects.", inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } } } },
  { name: "awr_get_project", description: "Get details of a specific project by id.", inputSchema: { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] } },
  { name: "awr_get_project_dates", description: "Get available reporting dates for a project.", inputSchema: { type: "object", properties: { project_id: { type: "string" } }, required: ["project_id"] } },
  { name: "awr_get_project_keywords", description: "Get keywords with rankings for a project (latest snapshot).", inputSchema: { type: "object", properties: { project_id: { type: "string" }, limit: { type: "number" } }, required: ["project_id"] } },
];

const handlers: Record<string, ToolHandler> = {
  awr_get_server_policy: async () => ({
    api_family: "Advanced Web Ranking API v2",
    endpoint: "https://api.awrcloud.com/v2/get.php",
    mode: "read-only",
  }),
  awr_list_projects: async (args, ctx) => {
    const r = (await awrApi(ctx, { action: "projects" })) as { projects?: Record<string, unknown>[] };
    const projects = r.projects || [];
    const q = String(args.query || "").toLowerCase();
    const filtered = q
      ? projects.filter((p) => [p.name, p.id, p.main_website].some((v) => String(v || "").toLowerCase().includes(q)))
      : projects;
    const limit = Math.max(1, Math.min(5000, Number(args.limit || filtered.length || 100)));
    return { total: filtered.length, projects: filtered.slice(0, limit) };
  },
  awr_get_project: async (args, ctx) => {
    const r = (await awrApi(ctx, { action: "projects" })) as { projects?: Record<string, unknown>[] };
    const projects = r.projects || [];
    const project = projects.find((p) => String(p.id) === String(args.project_id));
    if (!project) throw new Error(`Project ${args.project_id} not found`);
    return project;
  },
  awr_get_project_dates: async (args, ctx) => {
    const r = (await awrApi(ctx, { action: "projects" })) as { projects?: Record<string, unknown>[] };
    const project = (r.projects || []).find((p) => String(p.id) === String(args.project_id));
    if (!project) throw new Error(`Project ${args.project_id} not found`);
    return awrApi(ctx, { action: "get_dates", project: String(project.name) });
  },
  awr_get_project_keywords: async (args, ctx) => {
    const text = (await awrApi(ctx, {
      action: "get_keywords",
      projectId: String(args.project_id),
      mode: "plain",
    }, "text")) as string;
    const rows = parseAwrCsv(text);
    const limit = Math.max(1, Math.min(5000, Number(args.limit || 100)));
    return { total: rows.length, keywords: rows.slice(0, limit) };
  },
};

const template: Template = {
  slug: "awr",
  name: "Advanced Web Ranking",
  description: "AWR Cloud API — projects, keyword rankings, historical reporting dates.",
  icon: "AWR",
  category: "SEO",
  version: "1.0",
  auth: "API token",
  secretKeys: [
    { key: "AWR_API_TOKEN", label: "AWR API Token", helpText: "From AWR Cloud → Account → API." },
  ],
  configKeys: [],
  tools,
  handlers,
};

export default template;
