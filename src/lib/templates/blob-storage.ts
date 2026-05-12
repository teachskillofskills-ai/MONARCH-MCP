import type { Template, ToolDef, ToolHandler } from "./types";

type Ctx = { secrets: Record<string, string>; config: Record<string, string> };

const BLOB_API = "https://blob.vercel-storage.com";

async function blobJson(ctx: Ctx, method: string, path: string, body?: BodyInit, extraHeaders?: Record<string, string>) {
  const token = ctx.secrets.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN secret is required");
  const res = await fetch(`${BLOB_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(extraHeaders || {}) },
    body,
  });
  const text = await res.text();
  let parsed: unknown; try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
  if (!res.ok) throw new Error(`Vercel Blob ${res.status}: ${text}`);
  return parsed;
}

async function uploadBytes(ctx: Ctx, pathname: string, body: ArrayBuffer | Buffer | string, contentType?: string) {
  const params = new URLSearchParams({ pathname: pathname.replace(/^\/+/, ""), addRandomSuffix: "false" });
  const headers: Record<string, string> = {};
  if (contentType) headers["x-content-type"] = contentType;
  return blobJson(ctx, "PUT", `/?${params}`, body as BodyInit, headers);
}

const tools: ToolDef[] = [
  // Read
  { name: "blob_get_server_policy", description: "Storage server policy.", inputSchema: { type: "object", properties: {} } },
  { name: "blob_list", description: "List blobs in storage. Optional prefix filter; folded mode returns folders.", inputSchema: { type: "object", properties: { prefix: { type: "string" }, limit: { type: "number" }, cursor: { type: "string" }, folded: { type: "boolean" } } } },
  { name: "blob_head", description: "Get metadata of a blob by URL.", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
  { name: "blob_read_text", description: "Fetch a blob's contents as text.", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
  { name: "blob_read_base64", description: "Fetch a blob's contents as base64 (for binary).", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } },
  // Write
  { name: "blob_write_text", description: "Write text content to a path. Overwrites any existing file at the same path.", inputSchema: { type: "object", properties: { pathname: { type: "string" }, content: { type: "string" }, content_type: { type: "string", description: "Default text/plain" } }, required: ["pathname", "content"] } },
  { name: "blob_write_json", description: "Write a JSON object to a path.", inputSchema: { type: "object", properties: { pathname: { type: "string" }, data: {} }, required: ["pathname", "data"] } },
  { name: "blob_write_base64", description: "Write base64-encoded binary content to a path.", inputSchema: { type: "object", properties: { pathname: { type: "string" }, base64: { type: "string" }, content_type: { type: "string" } }, required: ["pathname", "base64"] } },
  // Mutate
  { name: "blob_copy", description: "Copy a blob to a new pathname.", inputSchema: { type: "object", properties: { from_url: { type: "string" }, to_pathname: { type: "string" } }, required: ["from_url", "to_pathname"] } },
  { name: "blob_rename", description: "Rename a blob (copy + delete original).", inputSchema: { type: "object", properties: { from_url: { type: "string" }, to_pathname: { type: "string" } }, required: ["from_url", "to_pathname"] } },
  { name: "blob_delete", description: "Delete one or more blobs by URL.", inputSchema: { type: "object", properties: { urls: { type: "array", items: { type: "string" } }, url: { type: "string", description: "Single URL — convenience for one blob" } } } },
];

const handlers: Record<string, ToolHandler> = {
  blob_get_server_policy: async () => ({
    api_family: "Vercel Blob Storage",
    write_enabled: true,
    delete_enabled: true,
    capabilities: ["list", "head", "read_text", "read_base64", "write_text", "write_json", "write_base64", "copy", "rename", "delete"],
  }),

  blob_list: async (args, ctx) => {
    const params = new URLSearchParams();
    if (args.prefix) params.set("prefix", String(args.prefix));
    if (args.limit) params.set("limit", String(args.limit));
    if (args.cursor) params.set("cursor", String(args.cursor));
    if (args.folded) params.set("mode", "folded");
    return blobJson(ctx, "GET", `/?${params}`);
  },

  blob_head: async (args, ctx) => {
    const params = new URLSearchParams({ url: String(args.url) });
    return blobJson(ctx, "GET", `/?${params}`);
  },

  blob_read_text: async (args) => {
    const res = await fetch(String(args.url));
    if (!res.ok) throw new Error(`Read failed: ${res.status}`);
    const text = await res.text();
    return { url: args.url, content_type: res.headers.get("content-type") || "text/plain", text };
  },

  blob_read_base64: async (args) => {
    const res = await fetch(String(args.url));
    if (!res.ok) throw new Error(`Read failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      url: args.url,
      content_type: res.headers.get("content-type") || "application/octet-stream",
      size: buf.length,
      base64: buf.toString("base64"),
    };
  },

  blob_write_text: async (args, ctx) => {
    const r = await uploadBytes(ctx, String(args.pathname), String(args.content), String(args.content_type || "text/plain; charset=utf-8"));
    return r;
  },

  blob_write_json: async (args, ctx) => {
    const r = await uploadBytes(ctx, String(args.pathname), JSON.stringify(args.data, null, 2), "application/json; charset=utf-8");
    return r;
  },

  blob_write_base64: async (args, ctx) => {
    const buf = Buffer.from(String(args.base64), "base64");
    const r = await uploadBytes(ctx, String(args.pathname), buf, args.content_type ? String(args.content_type) : undefined);
    return r;
  },

  blob_copy: async (args, ctx) => {
    const res = await fetch(String(args.from_url));
    if (!res.ok) throw new Error(`Source download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || undefined;
    return uploadBytes(ctx, String(args.to_pathname), buf, ct);
  },

  blob_rename: async (args, ctx) => {
    const res = await fetch(String(args.from_url));
    if (!res.ok) throw new Error(`Source download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || undefined;
    const out = (await uploadBytes(ctx, String(args.to_pathname), buf, ct)) as { url?: string };
    if (out?.url && out.url !== args.from_url) {
      await blobJson(ctx, "POST", "/delete", JSON.stringify({ urls: [args.from_url] }), { "Content-Type": "application/json" });
    }
    return out;
  },

  blob_delete: async (args, ctx) => {
    const urls: string[] = Array.isArray(args.urls) && args.urls.length
      ? args.urls.map(String)
      : args.url ? [String(args.url)] : [];
    if (!urls.length) throw new Error("Provide url or urls[]");
    return blobJson(ctx, "POST", "/delete", JSON.stringify({ urls }), { "Content-Type": "application/json" });
  },
};

const template: Template = {
  slug: "blob-storage",
  name: "Monarch Storage",
  description: "Central file storage for Monarch — list, read, write, copy, rename, delete blobs.",
  icon: "MonarchStorage",
  category: "Storage",
  version: "1.1",
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
