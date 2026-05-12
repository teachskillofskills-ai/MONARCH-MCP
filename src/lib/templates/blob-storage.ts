import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

async function blobApi(ctx: Ctx, method: string, path: string, body?: BodyInit, extraHeaders?: Record<string, string>) {
  const token = ctx.secrets.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN secret is required");
  const url = `https://blob.vercel-storage.com${path}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(extraHeaders || {}) },
    body,
  });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Vercel Blob ${res.status}: ${text}`);
  return parsed;
}

const tools: ToolDef[] = [
  { name: "blob_get_server_policy", description: "Blob Storage server policy.", inputSchema: { type: "object", properties: {} } },
  { name: "blob_list", description: "List blobs in storage. Optional prefix filter.", inputSchema: { type: "object", properties: { prefix: { type: "string" }, limit: { type: "number" }, cursor: { type: "string" } } } },
  { name: "blob_head", description: "Get metadata of a blob by URL or pathname.", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
  { name: "blob_delete", description: "Delete a blob by URL.", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
];

const handlers: Record<string, ToolHandler> = {
  blob_get_server_policy: async () => ({
    api_family: "Vercel Blob Storage",
    write_enabled: false,
    delete_enabled: true,
  }),
  blob_list: async (args, ctx) => {
    const params = new URLSearchParams();
    if (args.prefix) params.set("prefix", String(args.prefix));
    if (args.limit) params.set("limit", String(args.limit));
    if (args.cursor) params.set("cursor", String(args.cursor));
    return blobApi(ctx, "GET", `?${params}`);
  },
  blob_head: async (args, ctx) => {
    const params = new URLSearchParams({ url: String(args.url) });
    return blobApi(ctx, "GET", `?${params}&listMode=folded`);
  },
  blob_delete: async (args, ctx) => {
    return blobApi(ctx, "POST", "/delete", JSON.stringify({ urls: [args.url] }), { "Content-Type": "application/json" });
  },
};

const template: Template = {
  slug: "blob-storage",
  name: "Monarch Storage",
  description: "Central file storage for Monarch — list, read metadata, delete blobs.",
  icon: "MonarchStorage",
  category: "Storage",
  version: "1.0",
  auth: "Read-write token",
  setupUrl: "https://vercel.com/dashboard/stores",
  setupSteps: [
    "Go to your Vercel dashboard → Storage tab.",
    "Create a new Blob store (or open an existing one).",
    "Open the store → Settings → 'Tokens' → create a Read/Write token.",
    "Copy the token (starts with 'vercel_blob_rw_…') and paste below.",
  ],
  secretKeys: [
    { key: "BLOB_READ_WRITE_TOKEN", label: "Blob R/W Token" },
  ],
  configKeys: [],
  tools,
  handlers,
};

export default template;
