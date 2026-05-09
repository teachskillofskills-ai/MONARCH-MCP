import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function slackApi(ctx: Ctx, method: string, params: Record<string, unknown> = {}) {
  const token = ctx.secrets.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN required");
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const j = await res.json();
  if (!j.ok) throw new Error(`Slack ${method}: ${j.error || "unknown error"}`);
  return j;
}

const tools: ToolDef[] = [
  { name: "slack_get_server_policy", description: "Slack MCP policy.", inputSchema: { type: "object", properties: {} } },
  { name: "slack_list_channels", description: "List public + private channels the bot is in.", inputSchema: { type: "object", properties: { limit: { type: "number" }, cursor: { type: "string" } } } },
  { name: "slack_post_message", description: "Post a message to a channel.", inputSchema: { type: "object", properties: { channel: { type: "string", description: "Channel ID or name like #general" }, text: { type: "string" } }, required: ["channel", "text"] } },
  { name: "slack_search_messages", description: "Search across messages (requires user-token search:read).", inputSchema: { type: "object", properties: { query: { type: "string" }, count: { type: "number" } }, required: ["query"] } },
  { name: "slack_list_users", description: "List workspace users.", inputSchema: { type: "object", properties: { limit: { type: "number" } } } },
];

const handlers: Record<string, ToolHandler> = {
  slack_get_server_policy: async () => ({ api_family: "Slack Web API" }),
  slack_list_channels: async (args, ctx) => slackApi(ctx, "conversations.list", { limit: args.limit || 100, cursor: args.cursor, types: "public_channel,private_channel" }),
  slack_post_message: async (args, ctx) => slackApi(ctx, "chat.postMessage", { channel: String(args.channel).replace(/^#/, ""), text: String(args.text) }),
  slack_search_messages: async (args, ctx) => slackApi(ctx, "search.messages", { query: args.query, count: args.count || 20 }),
  slack_list_users: async (args, ctx) => slackApi(ctx, "users.list", { limit: args.limit || 100 }),
};

const template: Template = {
  slug: "slack",
  name: "Slack",
  description: "Post messages, list channels/users, search history. Uses a Slack bot token.",
  icon: "Slack",
  category: "Comms",
  version: "1.0",
  auth: "Bot token",
  setupUrl: "https://api.slack.com/apps",
  setupSteps: [
    "Go to https://api.slack.com/apps → 'Create New App' → 'From scratch' → pick your workspace.",
    "OAuth & Permissions → Bot Token Scopes → add: chat:write, channels:read, groups:read, users:read.",
    "Install App to Workspace.",
    "Copy the 'Bot User OAuth Token' (starts with xoxb-…) and paste below.",
    "Invite the bot to channels you want it to post in: /invite @your-bot",
  ],
  secretKeys: [{ key: "SLACK_BOT_TOKEN", label: "Bot User OAuth Token", helpText: "Starts with xoxb-…" }],
  configKeys: [],
  tools,
  handlers,
};
export default template;
