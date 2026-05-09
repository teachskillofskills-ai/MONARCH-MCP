import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function api(ctx: Ctx, path: string, body?: unknown, method = "GET") {
  const key = ctx.secrets.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY required");
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(parsed as { message?: string })?.message || text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "resend_get_server_policy", description: "Resend MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "resend_send_email", description: "Send an email.", inputSchema: { type: "object", properties: { to: { type: "string" }, from: { type: "string" }, subject: { type: "string" }, html: { type: "string" }, text: { type: "string" } }, required: ["to", "from", "subject"] } },
  { name: "resend_list_domains", description: "List verified sender domains.", inputSchema: { type: "object", properties: {} } },
  { name: "resend_list_audiences", description: "List Resend audiences.", inputSchema: { type: "object", properties: {} } },
];

const handlers: Record<string, ToolHandler> = {
  resend_get_server_policy: async () => ({ api_family: "Resend API" }),
  resend_send_email: async (args, ctx) => api(ctx, "/emails", {
    to: String(args.to), from: String(args.from), subject: String(args.subject),
    html: args.html ? String(args.html) : undefined,
    text: args.text ? String(args.text) : undefined,
  }, "POST"),
  resend_list_domains: async (_args, ctx) => api(ctx, "/domains"),
  resend_list_audiences: async (_args, ctx) => api(ctx, "/audiences"),
};

const template: Template = {
  slug: "resend",
  name: "Resend",
  description: "Send email + manage domains/audiences via the developer-friendly Resend API.",
  icon: "Resend",
  category: "Email",
  version: "1.0",
  auth: "API key",
  setupUrl: "https://resend.com/api-keys",
  setupSteps: [
    "Sign up at https://resend.com (free tier: 100 emails/day).",
    "Add and verify a sender domain under https://resend.com/domains (DNS records).",
    "Open https://resend.com/api-keys → 'Create API Key'.",
    "Copy the key (starts with 're_…') and paste below.",
  ],
  secretKeys: [{ key: "RESEND_API_KEY", label: "API Key" }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
