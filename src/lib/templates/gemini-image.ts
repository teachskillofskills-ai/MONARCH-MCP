import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function geminiApi(ctx: Ctx, model: string, body: unknown) {
  const key = ctx.secrets.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY secret is required");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "gemini_get_server_policy", description: "Gemini Image MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "gemini_image_generate", description: "Generate an image from a text prompt using Gemini 2.5 Flash Image.", inputSchema: { type: "object", properties: { prompt: { type: "string" }, model: { type: "string", description: "Default: gemini-2.5-flash-image-preview" } }, required: ["prompt"] } },
];

const handlers: Record<string, ToolHandler> = {
  gemini_get_server_policy: async () => ({
    api_family: "Google Gemini API",
    default_model: "gemini-2.5-flash-image-preview",
  }),
  gemini_image_generate: async (args, ctx) => {
    const model = String(args.model || "gemini-2.5-flash-image-preview");
    const body = {
      contents: [{ parts: [{ text: String(args.prompt) }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    };
    return geminiApi(ctx, model, body);
  },
};

const template: Template = {
  slug: "gemini-image",
  name: "Gemini Image",
  description: "Generate images via Google Gemini's image-generation model.",
  icon: "Gemini",
  category: "AI",
  version: "1.0",
  auth: "API key",
  setupUrl: "https://aistudio.google.com/apikey",
  setupSteps: [
    "Open Google AI Studio at https://aistudio.google.com/apikey.",
    "Click 'Create API key' → choose a Google Cloud project (or create one).",
    "Copy the key (starts with 'AQ.…' or similar).",
    "Paste below. Free tier has rate limits but works for testing.",
  ],
  secretKeys: [
    { key: "GEMINI_API_KEY", label: "Gemini API Key" },
  ],
  configKeys: [],
  tools,
  handlers,
};

export default template;
