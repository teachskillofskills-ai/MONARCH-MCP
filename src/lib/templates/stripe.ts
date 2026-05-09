import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function api(ctx: Ctx, path: string, params?: Record<string, unknown>) {
  const key = ctx.secrets.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY required");
  const url = new URL(`https://api.stripe.com/v1${path}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${(parsed as { error?: { message?: string } })?.error?.message || text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "stripe_get_server_policy", description: "Stripe MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "stripe_list_customers", description: "List recent customers.", inputSchema: { type: "object", properties: { limit: { type: "number" }, email: { type: "string" } } } },
  { name: "stripe_list_charges", description: "List recent charges.", inputSchema: { type: "object", properties: { limit: { type: "number" }, customer: { type: "string" } } } },
  { name: "stripe_list_payment_intents", description: "List recent PaymentIntents.", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
  { name: "stripe_list_subscriptions", description: "List active subscriptions.", inputSchema: { type: "object", properties: { limit: { type: "number" }, customer: { type: "string" } } } },
  { name: "stripe_balance", description: "Account balance.", inputSchema: { type: "object", properties: {} } },
];

const handlers: Record<string, ToolHandler> = {
  stripe_get_server_policy: async () => ({ api_family: "Stripe API v1", mode: "read-only" }),
  stripe_list_customers: async (args, ctx) => api(ctx, "/customers", { limit: args.limit || 20, email: args.email }),
  stripe_list_charges: async (args, ctx) => api(ctx, "/charges", { limit: args.limit || 20, customer: args.customer }),
  stripe_list_payment_intents: async (args, ctx) => api(ctx, "/payment_intents", { limit: args.limit || 20 }),
  stripe_list_subscriptions: async (args, ctx) => api(ctx, "/subscriptions", { limit: args.limit || 20, customer: args.customer }),
  stripe_balance: async (_args, ctx) => api(ctx, "/balance"),
};

const template: Template = {
  slug: "stripe",
  name: "Stripe",
  description: "Read customers, charges, subscriptions, payment intents, balance.",
  icon: "Stripe",
  category: "Payments",
  version: "1.0",
  auth: "Secret API key",
  setupUrl: "https://dashboard.stripe.com/apikeys",
  setupSteps: [
    "Open https://dashboard.stripe.com/apikeys.",
    "Use the 'Restricted keys' section → 'Create restricted key'.",
    "Name 'Monarch read-only'. Grant Read access to: Customers, Charges, PaymentIntents, Subscriptions, Balance.",
    "Reveal and copy the key (starts with 'rk_live_…' or 'sk_test_…').",
    "Paste below.",
  ],
  secretKeys: [{ key: "STRIPE_SECRET_KEY", label: "Stripe Secret Key", helpText: "Use a restricted key with read-only scopes for safety." }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
