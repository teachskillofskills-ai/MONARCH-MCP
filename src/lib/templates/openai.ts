import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function api(ctx: Ctx, path: string, body?: unknown, method = "POST") {
  const key = ctx.secrets.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY required");
  const res = await fetch(`https://api.openai.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(parsed as { error?: { message?: string } })?.error?.message || text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "openai_get_server_policy", description: "OpenAI MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "openai_chat", description: "Chat completion. Use for any text-in/text-out task.", inputSchema: { type: "object", properties: { prompt: { type: "string" }, model: { type: "string", description: "Default gpt-4o-mini" }, system: { type: "string" }, temperature: { type: "number" } }, required: ["prompt"] } },
  { name: "openai_list_models", description: "List models available to the API key.", inputSchema: { type: "object", properties: {} } },
  { name: "openai_embeddings", description: "Generate embeddings for one or many texts.", inputSchema: { type: "object", properties: { input: {}, model: { type: "string", description: "Default text-embedding-3-small" } }, required: ["input"] } },
];

const handlers: Record<string, ToolHandler> = {
  openai_get_server_policy: async () => ({ api_family: "OpenAI Chat Completions API v1", default_model: "gpt-4o-mini" }),
  openai_chat: async (args, ctx) => {
    const messages = [];
    if (args.system) messages.push({ role: "system", content: String(args.system) });
    messages.push({ role: "user", content: String(args.prompt) });
    return api(ctx, "/chat/completions", {
      model: args.model || "gpt-4o-mini",
      messages,
      temperature: typeof args.temperature === "number" ? args.temperature : 0.7,
    });
  },
  openai_list_models: async (_args, ctx) => api(ctx, "/models", undefined, "GET"),
  openai_embeddings: async (args, ctx) => api(ctx, "/embeddings", {
    model: args.model || "text-embedding-3-small",
    input: args.input,
  }),
};

const template: Template = {
  slug: "openai",
  name: "OpenAI",
  description: "GPT chat completions, embeddings, and model list. Bring-your-own-API-key.",
  icon: "OpenAI",
  category: "AI",
  version: "1.0",
  auth: "API key",
  setupUrl: "https://platform.openai.com/api-keys",
  setupSteps: [
    "Sign in at https://platform.openai.com.",
    "Add a payment method (no free tier; expect cents per call).",
    "Open API keys → 'Create new secret key' → name it 'monarch'.",
    "Copy the key (starts with 'sk-…') and paste below.",
  ],
  secretKeys: [{ key: "OPENAI_API_KEY", label: "OpenAI API Key" }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
