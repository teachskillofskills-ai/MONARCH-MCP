import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function api(ctx: Ctx, path: string, body?: unknown, method = "POST") {
  const key = ctx.secrets.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY required");
  const res = await fetch(`https://api.anthropic.com/v1${path}`, {
    method,
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(parsed as { error?: { message?: string } })?.error?.message || text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "anthropic_get_server_policy", description: "Anthropic MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "anthropic_messages", description: "Send a message to Claude.", inputSchema: { type: "object", properties: { prompt: { type: "string" }, model: { type: "string", description: "Default claude-haiku-4-5-20251001" }, system: { type: "string" }, max_tokens: { type: "number" } }, required: ["prompt"] } },
  { name: "anthropic_list_models", description: "List available Claude models.", inputSchema: { type: "object", properties: {} } },
];

const handlers: Record<string, ToolHandler> = {
  anthropic_get_server_policy: async () => ({ api_family: "Anthropic Messages API", default_model: "claude-haiku-4-5-20251001" }),
  anthropic_messages: async (args, ctx) => api(ctx, "/messages", {
    model: args.model || "claude-haiku-4-5-20251001",
    max_tokens: Number(args.max_tokens || 1024),
    system: args.system ? String(args.system) : undefined,
    messages: [{ role: "user", content: String(args.prompt) }],
  }),
  anthropic_list_models: async (_args, ctx) => api(ctx, "/models", undefined, "GET"),
};

const template: Template = {
  slug: "anthropic",
  name: "Anthropic Claude",
  description: "Send messages to Claude. Use for chat, coding, summarization, agents.",
  icon: "Anthropic",
  category: "AI",
  version: "1.0",
  auth: "API key",
  setupUrl: "https://console.anthropic.com/settings/keys",
  setupSteps: [
    "Sign up at https://console.anthropic.com.",
    "Add credits (Settings → Billing).",
    "Open Settings → API Keys → 'Create Key'.",
    "Copy the key (starts with 'sk-ant-…') and paste below.",
  ],
  secretKeys: [{ key: "ANTHROPIC_API_KEY", label: "Anthropic API Key" }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
