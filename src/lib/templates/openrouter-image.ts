import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function orApi(ctx: Ctx, body: unknown) {
  const key = ctx.secrets.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY secret is required");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://monarch.local",
      "X-Title": "Project Monarch",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "openrouter_get_server_policy", description: "OpenRouter Image MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "openrouter_image_generate", description: "Generate an image via an OpenRouter image-capable model.", inputSchema: { type: "object", properties: { prompt: { type: "string" }, model: { type: "string", description: "Default: google/gemini-2.5-flash-image" } }, required: ["prompt"] } },
  { name: "openrouter_chat", description: "General chat completion via any OpenRouter model.", inputSchema: { type: "object", properties: { prompt: { type: "string" }, model: { type: "string" }, system: { type: "string" } }, required: ["prompt"] } },
];

const handlers: Record<string, ToolHandler> = {
  openrouter_get_server_policy: async () => ({
    api_family: "OpenRouter (Chat Completions)",
    default_image_model: "google/gemini-2.5-flash-image",
  }),
  openrouter_image_generate: async (args, ctx) => {
    return orApi(ctx, {
      model: args.model || "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: String(args.prompt) }],
      modalities: ["image", "text"],
    });
  },
  openrouter_chat: async (args, ctx) => {
    const messages = [];
    if (args.system) messages.push({ role: "system", content: String(args.system) });
    messages.push({ role: "user", content: String(args.prompt) });
    return orApi(ctx, { model: args.model || "openai/gpt-4o-mini", messages });
  },
};

const template: Template = {
  slug: "openrouter-image",
  name: "OpenRouter Image",
  description: "Image generation + chat via OpenRouter (multi-model gateway).",
  icon: "OpenRouter",
  category: "AI",
  version: "1.0",
  auth: "API key",
  setupUrl: "https://openrouter.ai/keys",
  setupSteps: [
    "Sign up at https://openrouter.ai (you can use Google sign-in).",
    "Add credits ($5 minimum) at https://openrouter.ai/credits.",
    "Go to https://openrouter.ai/keys → Create API key.",
    "Copy the key (starts with 'sk-or-v1-…') and paste below.",
  ],
  secretKeys: [
    { key: "OPENROUTER_API_KEY", label: "OpenRouter API Key" },
  ],
  configKeys: [],
  tools,
  handlers,
};

export default template;
