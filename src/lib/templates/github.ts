import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function api(ctx: Ctx, path: string, params?: Record<string, unknown>) {
  const token = ctx.secrets.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN required");
  const url = new URL(`https://api.github.com${path}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(parsed as { message?: string })?.message || text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "github_get_server_policy", description: "GitHub MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "github_me", description: "Authenticated user.", inputSchema: { type: "object", properties: {} } },
  { name: "github_list_repos", description: "List repos accessible to the token.", inputSchema: { type: "object", properties: { per_page: { type: "number" }, sort: { type: "string", description: "created|updated|pushed|full_name" } } } },
  { name: "github_get_repo", description: "Get one repo by owner/name.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" } }, required: ["owner", "repo"] } },
  { name: "github_list_issues", description: "List issues in a repo.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, state: { type: "string", description: "open|closed|all" } }, required: ["owner", "repo"] } },
  { name: "github_list_pull_requests", description: "List PRs in a repo.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, state: { type: "string" } }, required: ["owner", "repo"] } },
  { name: "github_list_commits", description: "List recent commits on default branch.", inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, per_page: { type: "number" } }, required: ["owner", "repo"] } },
];

const handlers: Record<string, ToolHandler> = {
  github_get_server_policy: async () => ({ api_family: "GitHub REST API v3" }),
  github_me: async (_args, ctx) => api(ctx, "/user"),
  github_list_repos: async (args, ctx) => api(ctx, "/user/repos", { per_page: args.per_page || 30, sort: args.sort || "updated" }),
  github_get_repo: async (args, ctx) => api(ctx, `/repos/${args.owner}/${args.repo}`),
  github_list_issues: async (args, ctx) => api(ctx, `/repos/${args.owner}/${args.repo}/issues`, { state: args.state || "open", per_page: 50 }),
  github_list_pull_requests: async (args, ctx) => api(ctx, `/repos/${args.owner}/${args.repo}/pulls`, { state: args.state || "open", per_page: 50 }),
  github_list_commits: async (args, ctx) => api(ctx, `/repos/${args.owner}/${args.repo}/commits`, { per_page: args.per_page || 20 }),
};

const template: Template = {
  slug: "github",
  name: "GitHub",
  description: "Read repos, issues, PRs, commits via Personal Access Token.",
  icon: "GitHub",
  category: "Dev",
  version: "1.0",
  auth: "Personal access token",
  setupUrl: "https://github.com/settings/personal-access-tokens/new",
  setupSteps: [
    "Open https://github.com/settings/personal-access-tokens/new (fine-grained).",
    "Token name: 'Monarch'. Repository access: 'All repositories' (or pick).",
    "Repository permissions: Contents (Read), Issues (Read), Pull requests (Read), Metadata (Read).",
    "Generate, copy the token (starts with 'github_pat_…').",
    "Or use a classic token at https://github.com/settings/tokens/new with the 'repo' scope.",
    "Paste below.",
  ],
  secretKeys: [{ key: "GITHUB_TOKEN", label: "GitHub Token" }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
