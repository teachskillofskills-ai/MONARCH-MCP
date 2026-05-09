import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function api(ctx: Ctx, path: string, body?: unknown, method = "GET") {
  const token = ctx.secrets.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN required");
  const res = await fetch(`https://api.replicate.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Replicate ${res.status}: ${(parsed as { detail?: string })?.detail || text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "replicate_get_server_policy", description: "Replicate MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "replicate_run_prediction", description: "Run a model prediction. Provide model owner/name and input.", inputSchema: { type: "object", properties: { model: { type: "string", description: "owner/name format, e.g. black-forest-labs/flux-schnell" }, input: { type: "object" } }, required: ["model", "input"] } },
  { name: "replicate_get_prediction", description: "Get prediction status by ID.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "replicate_list_models", description: "List public models (paginated).", inputSchema: { type: "object", properties: {} } },
];

const handlers: Record<string, ToolHandler> = {
  replicate_get_server_policy: async () => ({ api_family: "Replicate API v1" }),
  replicate_run_prediction: async (args, ctx) => {
    const [owner, name] = String(args.model).split("/");
    if (!owner || !name) throw new Error("model must be 'owner/name'");
    return api(ctx, `/models/${owner}/${name}/predictions`, { input: args.input }, "POST");
  },
  replicate_get_prediction: async (args, ctx) => api(ctx, `/predictions/${args.id}`),
  replicate_list_models: async (_args, ctx) => api(ctx, "/models"),
};

const template: Template = {
  slug: "replicate",
  name: "Replicate",
  description: "Run any model on Replicate (Flux, Stable Diffusion, LLMs, etc.).",
  icon: "Replicate",
  category: "AI",
  version: "1.0",
  auth: "API token",
  setupUrl: "https://replicate.com/account/api-tokens",
  setupSteps: [
    "Sign up at https://replicate.com (use GitHub).",
    "Add a payment method — pay per model run, no subscription.",
    "Open https://replicate.com/account/api-tokens → 'Create token'.",
    "Copy (starts with 'r8_…') and paste below.",
  ],
  secretKeys: [{ key: "REPLICATE_API_TOKEN", label: "Replicate API Token" }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
