import { NextRequest, NextResponse } from "next/server";
import { getDb, type Mcp } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getTemplate } from "@/lib/templates";
import type { ToolDef } from "@/lib/templates/types";

function jsonRpc(id: unknown, result?: unknown, error?: { code: number; message: string }) {
  return { jsonrpc: "2.0", id: id ?? null, ...(error ? { error } : { result }) };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };
}

function loadMcpContext(slug: string) {
  const db = getDb();
  const mcp = db.prepare("SELECT * FROM mcps WHERE slug = ?").get(slug) as Mcp | undefined;
  if (!mcp) return null;
  if (mcp.status !== "active") return { mcp, error: `MCP "${slug}" is ${mcp.status}` };

  const tplRow = db.prepare("SELECT * FROM mcp_templates WHERE id = ?").get(mcp.template_id) as
    | { module: string }
    | undefined;
  if (!tplRow) return { mcp, error: "Template missing" };

  const template = getTemplate(tplRow.module);
  if (!template) return { mcp, error: `Template module "${tplRow.module}" not found in code` };

  const secrets: Record<string, string> = {};
  const secretRows = db.prepare("SELECT key, encrypted_value FROM mcp_secrets WHERE mcp_id = ?").all(mcp.id) as
    { key: string; encrypted_value: string }[];
  for (const r of secretRows) {
    try { secrets[r.key] = decrypt(r.encrypted_value); }
    catch (e) { return { mcp, error: `Failed to decrypt secret ${r.key}: ${(e as Error).message}` }; }
  }

  const config: Record<string, string> = {};
  for (const c of template.configKeys) {
    if (c.defaultValue) config[c.key] = c.defaultValue;
  }
  const configRows = db.prepare("SELECT key, value FROM mcp_config WHERE mcp_id = ?").all(mcp.id) as
    { key: string; value: string }[];
  for (const r of configRows) config[r.key] = r.value;

  const enabledRows = db.prepare("SELECT tool_name FROM mcp_tools WHERE mcp_id = ? AND enabled = 1").all(mcp.id) as
    { tool_name: string }[];
  const enabledSet = new Set(enabledRows.map((r) => r.tool_name));
  const tools: ToolDef[] = enabledSet.size > 0
    ? template.tools.filter((t) => enabledSet.has(t.name))
    : template.tools; // if no toggles set, all tools enabled

  return { mcp, template, secrets, config, tools };
}

async function handleMethod(
  ctx: NonNullable<ReturnType<typeof loadMcpContext>> & { template: NonNullable<ReturnType<typeof getTemplate>> },
  method: string,
  params: Record<string, unknown>,
  hasId: boolean
) {
  if (method === "initialize") {
    return {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: `monarch-mcp-${ctx.mcp.slug}`, version: "0.1.0" },
    };
  }
  if (method === "notifications/initialized") return null;
  if (method === "ping") return {};
  if (method === "tools/list") return { tools: ctx.tools };

  if (method === "tools/call") {
    const name = String(params.name || "");
    const isEnabled = ctx.tools.some((t) => t.name === name);
    if (!isEnabled) throw new Error(`Tool not available on this MCP: ${name}`);
    const handler = ctx.template.handlers[name];
    if (!handler) throw new Error(`No handler for tool: ${name}`);
    const result = await handler(
      (params.arguments as Record<string, unknown>) || {},
      { secrets: ctx.secrets!, config: ctx.config! }
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  }

  if (!hasId && method.startsWith("notifications/")) return null;
  throw new Error(`Unsupported method: ${method}`);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const ctx = loadMcpContext(slug);
  if (!ctx) return NextResponse.json({ error: `MCP "${slug}" not found` }, { status: 404, headers: corsHeaders() });
  if ("error" in ctx && ctx.error) {
    return NextResponse.json({ error: ctx.error }, { status: 503, headers: corsHeaders() });
  }
  return NextResponse.json({
    name: `monarch-mcp-${ctx.mcp.slug}`,
    endpoint: `/api/mcp/${ctx.mcp.slug}`,
    template: ctx.template?.slug,
    tools: ctx.tools?.map((t) => t.name) ?? [],
  }, { headers: corsHeaders() });
}

export async function DELETE() {
  return NextResponse.json(jsonRpc(null, {}), { headers: corsHeaders() });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sessionId = req.headers.get("mcp-session-id") || `mcp-${slug}-${Date.now()}`;
  const headers = { ...corsHeaders(), "Mcp-Session-Id": sessionId };

  const ctx = loadMcpContext(slug);
  if (!ctx) {
    return NextResponse.json(
      jsonRpc(null, undefined, { code: -32000, message: `MCP "${slug}" not found` }),
      { status: 200, headers }
    );
  }
  if ("error" in ctx && ctx.error && !ctx.template) {
    return NextResponse.json(
      jsonRpc(null, undefined, { code: -32000, message: ctx.error }),
      { status: 200, headers }
    );
  }

  let payload: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };
  try { payload = await req.json(); }
  catch {
    return NextResponse.json(jsonRpc(null, undefined, { code: -32700, message: "Parse error" }), { status: 200, headers });
  }

  const hasId = Object.prototype.hasOwnProperty.call(payload, "id");
  try {
    const result = await handleMethod(
      ctx as Parameters<typeof handleMethod>[0],
      String(payload.method || ""),
      (payload.params || {}) as Record<string, unknown>,
      hasId
    );
    if (!hasId && result === null) return new NextResponse(null, { status: 202, headers });
    return NextResponse.json(jsonRpc(payload.id, result), { status: 200, headers });
  } catch (e) {
    return NextResponse.json(
      jsonRpc(payload.id ?? null, undefined, { code: -32000, message: (e as Error).message }),
      { status: 200, headers }
    );
  }
}
