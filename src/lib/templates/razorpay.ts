import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function api(ctx: Ctx, path: string, params?: Record<string, unknown>) {
  const id = ctx.secrets.RAZORPAY_KEY_ID;
  const secret = ctx.secrets.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET required");
  const url = new URL(`https://api.razorpay.com/v1${path}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Razorpay ${res.status}: ${(parsed as { error?: { description?: string } })?.error?.description || text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "razorpay_get_server_policy", description: "Razorpay MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "razorpay_list_payments", description: "List recent payments.", inputSchema: { type: "object", properties: { count: { type: "number" }, from: { type: "number", description: "Unix timestamp" }, to: { type: "number" } } } },
  { name: "razorpay_get_payment", description: "Get one payment by ID.", inputSchema: { type: "object", properties: { payment_id: { type: "string" } }, required: ["payment_id"] } },
  { name: "razorpay_list_orders", description: "List recent orders.", inputSchema: { type: "object", properties: { count: { type: "number" } } } },
  { name: "razorpay_list_customers", description: "List customers.", inputSchema: { type: "object", properties: { count: { type: "number" } } } },
];

const handlers: Record<string, ToolHandler> = {
  razorpay_get_server_policy: async () => ({ api_family: "Razorpay API v1", mode: "read-only" }),
  razorpay_list_payments: async (args, ctx) => api(ctx, "/payments", { count: args.count || 25, from: args.from, to: args.to }),
  razorpay_get_payment: async (args, ctx) => api(ctx, `/payments/${args.payment_id}`),
  razorpay_list_orders: async (args, ctx) => api(ctx, "/orders", { count: args.count || 25 }),
  razorpay_list_customers: async (args, ctx) => api(ctx, "/customers", { count: args.count || 25 }),
};

const template: Template = {
  slug: "razorpay",
  name: "Razorpay",
  description: "Read payments, orders, customers from Razorpay.",
  icon: "Razorpay",
  category: "Payments",
  version: "1.0",
  auth: "Key ID + secret",
  setupUrl: "https://dashboard.razorpay.com/app/website-app-settings/api-keys",
  setupSteps: [
    "Sign in to Razorpay Dashboard.",
    "Settings → API Keys → 'Generate Key' (Test mode first; Live needs KYC).",
    "Copy the Key ID (starts 'rzp_test_…' or 'rzp_live_…') and Key Secret.",
    "Paste both below — secret is shown only once.",
  ],
  secretKeys: [
    { key: "RAZORPAY_KEY_ID", label: "Key ID" },
    { key: "RAZORPAY_KEY_SECRET", label: "Key Secret" },
  ],
  configKeys: [],
  tools,
  handlers,
};
export default template;
