import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function api(ctx: Ctx, path: string, body?: unknown, method = "GET") {
  const key = ctx.secrets.SENDGRID_API_KEY;
  if (!key) throw new Error("SENDGRID_API_KEY required");
  const res = await fetch(`https://api.sendgrid.com/v3${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`SendGrid ${res.status}: ${text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "sendgrid_get_server_policy", description: "SendGrid MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "sendgrid_send_mail", description: "Send a single transactional email.", inputSchema: { type: "object", properties: { to: { type: "string" }, from: { type: "string" }, subject: { type: "string" }, text: { type: "string" }, html: { type: "string" } }, required: ["to", "from", "subject"] } },
  { name: "sendgrid_list_templates", description: "List dynamic templates.", inputSchema: { type: "object", properties: {} } },
  { name: "sendgrid_stats", description: "Aggregated stats over a date range.", inputSchema: { type: "object", properties: { start_date: { type: "string", description: "YYYY-MM-DD" }, end_date: { type: "string" } }, required: ["start_date"] } },
];

const handlers: Record<string, ToolHandler> = {
  sendgrid_get_server_policy: async () => ({ api_family: "SendGrid v3 API" }),
  sendgrid_send_mail: async (args, ctx) => api(ctx, "/mail/send", {
    personalizations: [{ to: [{ email: String(args.to) }] }],
    from: { email: String(args.from) },
    subject: String(args.subject),
    content: [
      args.text ? { type: "text/plain", value: String(args.text) } : null,
      args.html ? { type: "text/html", value: String(args.html) } : null,
    ].filter(Boolean),
  }, "POST"),
  sendgrid_list_templates: async (_args, ctx) => api(ctx, "/templates?generations=dynamic"),
  sendgrid_stats: async (args, ctx) => api(ctx, `/stats?start_date=${args.start_date}${args.end_date ? `&end_date=${args.end_date}` : ""}`),
};

const template: Template = {
  slug: "sendgrid",
  name: "SendGrid",
  description: "Send transactional email, list templates, fetch stats.",
  icon: "SendGrid",
  category: "Email",
  version: "1.0",
  auth: "API key",
  setupUrl: "https://app.sendgrid.com/settings/api_keys",
  setupSteps: [
    "Sign in to https://app.sendgrid.com.",
    "Settings → API Keys → 'Create API Key'.",
    "Pick 'Restricted Access'. Enable Mail Send (Full Access) and Stats (Read).",
    "Copy the key (shown only once, starts with 'SG.…') and paste below.",
    "Verify a sender email under Sender Authentication before sending.",
  ],
  secretKeys: [{ key: "SENDGRID_API_KEY", label: "API Key" }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
