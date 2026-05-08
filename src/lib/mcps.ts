import { getDb, type Mcp } from "./db";
import { getTemplate } from "./templates";

export type McpListItem = Mcp & {
  template_slug: string;
  template_name: string;
  template_icon: string;
  template_category: string;
  template_version: string;
  template_auth: string;
  tool_count: number;
  enabled_tool_count: number;
  secret_count: number;
};

export function listMcps(): McpListItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT m.*, t.module AS template_slug, t.name AS template_name,
              t.icon AS template_icon, t.category AS template_category,
              t.version AS template_version, t.auth AS template_auth
       FROM mcps m
       JOIN mcp_templates t ON t.id = m.template_id
       ORDER BY m.created_at DESC`
    )
    .all() as (Mcp & {
      template_slug: string; template_name: string; template_icon: string;
      template_category: string; template_version: string; template_auth: string;
    })[];

  return rows.map((m) => {
    const template = getTemplate(m.template_slug);
    const totalTools = template?.tools.length ?? 0;
    const enabledRow = db
      .prepare("SELECT COUNT(*) as c FROM mcp_tools WHERE mcp_id = ? AND enabled = 1")
      .get(m.id) as { c: number };
    const explicitToggles = db
      .prepare("SELECT COUNT(*) as c FROM mcp_tools WHERE mcp_id = ?")
      .get(m.id) as { c: number };
    const enabledCount = explicitToggles.c === 0 ? totalTools : enabledRow.c;
    const secretCount = (db
      .prepare("SELECT COUNT(*) as c FROM mcp_secrets WHERE mcp_id = ?")
      .get(m.id) as { c: number }).c;

    return {
      ...m,
      tool_count: totalTools,
      enabled_tool_count: enabledCount,
      secret_count: secretCount,
    };
  });
}

export function getMcpBySlug(slug: string) {
  const db = getDb();
  const m = db
    .prepare(
      `SELECT m.*, t.module AS template_slug, t.name AS template_name, t.description AS template_description
       FROM mcps m JOIN mcp_templates t ON t.id = m.template_id
       WHERE m.slug = ?`
    )
    .get(slug) as
    | (Mcp & { template_slug: string; template_name: string; template_description: string })
    | undefined;
  if (!m) return null;

  const template = getTemplate(m.template_slug);

  const secrets = db
    .prepare("SELECT key FROM mcp_secrets WHERE mcp_id = ? ORDER BY key")
    .all(m.id) as { key: string }[];

  const config = db
    .prepare("SELECT key, value FROM mcp_config WHERE mcp_id = ? ORDER BY key")
    .all(m.id) as { key: string; value: string }[];

  const explicitToggles = db
    .prepare("SELECT tool_name, enabled FROM mcp_tools WHERE mcp_id = ?")
    .all(m.id) as { tool_name: string; enabled: number }[];
  const toggleMap = new Map(explicitToggles.map((t) => [t.tool_name, t.enabled === 1]));

  const tools = (template?.tools || []).map((t) => ({
    name: t.name,
    description: t.description,
    enabled: toggleMap.has(t.name) ? toggleMap.get(t.name)! : true,
  }));

  return { mcp: m, template, secrets, config, tools };
}

export function deleteMcp(slug: string) {
  const db = getDb();
  const info = db.prepare("DELETE FROM mcps WHERE slug = ?").run(slug);
  return info.changes > 0;
}
