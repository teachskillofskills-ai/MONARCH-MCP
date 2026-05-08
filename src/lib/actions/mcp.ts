"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { getTemplate } from "@/lib/templates";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createMcp(formData: FormData) {
  const templateSlug = String(formData.get("template") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const slug = slugify(String(formData.get("slug") || name));
  const description = String(formData.get("description") || "").trim() || null;

  if (!templateSlug || !name || !slug) throw new Error("Missing required fields");
  const template = getTemplate(templateSlug);
  if (!template) throw new Error(`Unknown template: ${templateSlug}`);

  const db = getDb();
  const tplRow = db.prepare("SELECT id FROM mcp_templates WHERE module = ?").get(templateSlug) as
    | { id: number } | undefined;
  if (!tplRow) throw new Error("Template not registered in DB");

  const exists = db.prepare("SELECT id FROM mcps WHERE slug = ?").get(slug) as { id: number } | undefined;
  if (exists) throw new Error(`Slug "${slug}" already taken`);

  const insert = db.prepare(
    `INSERT INTO mcps (slug, name, description, template_id, status) VALUES (?, ?, ?, ?, 'active')`
  );
  const result = insert.run(slug, name, description, tplRow.id);
  const mcpId = Number(result.lastInsertRowid);

  // Save secrets
  const secretInsert = db.prepare(
    `INSERT INTO mcp_secrets (mcp_id, key, encrypted_value) VALUES (?, ?, ?)`
  );
  for (const s of template.secretKeys) {
    const value = String(formData.get(`secret_${s.key}`) || "").trim();
    if (value) secretInsert.run(mcpId, s.key, encrypt(value));
  }

  // Save config
  const cfgInsert = db.prepare(`INSERT INTO mcp_config (mcp_id, key, value) VALUES (?, ?, ?)`);
  for (const c of template.configKeys) {
    const value = String(formData.get(`config_${c.key}`) || "").trim();
    if (value) cfgInsert.run(mcpId, c.key, value);
  }

  revalidatePath("/dashboard");
  revalidatePath("/mcps");
  redirect(`/mcps/${slug}`);
}

export async function updateMcpMeta(slug: string, formData: FormData) {
  const db = getDb();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const status = String(formData.get("status") || "active");
  if (!name) throw new Error("Name required");
  db.prepare(
    `UPDATE mcps SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?`
  ).run(name, description, status, slug);
  revalidatePath(`/mcps/${slug}`);
  revalidatePath("/dashboard");
}

export async function updateMcpSecrets(slug: string, formData: FormData) {
  const db = getDb();
  const mcp = db.prepare("SELECT id, template_id FROM mcps WHERE slug = ?").get(slug) as
    | { id: number; template_id: number } | undefined;
  if (!mcp) throw new Error("MCP not found");
  const tplRow = db.prepare("SELECT module FROM mcp_templates WHERE id = ?").get(mcp.template_id) as
    | { module: string } | undefined;
  const template = tplRow ? getTemplate(tplRow.module) : null;
  if (!template) throw new Error("Template not found");

  for (const s of template.secretKeys) {
    const value = String(formData.get(`secret_${s.key}`) || "").trim();
    if (!value) continue; // empty = leave existing as-is
    db.prepare(
      `INSERT INTO mcp_secrets (mcp_id, key, encrypted_value) VALUES (?, ?, ?)
       ON CONFLICT(mcp_id, key) DO UPDATE SET encrypted_value = excluded.encrypted_value`
    ).run(mcp.id, s.key, encrypt(value));
  }
  for (const c of template.configKeys) {
    const value = String(formData.get(`config_${c.key}`) || "").trim();
    if (!value) continue;
    db.prepare(
      `INSERT INTO mcp_config (mcp_id, key, value) VALUES (?, ?, ?)
       ON CONFLICT(mcp_id, key) DO UPDATE SET value = excluded.value`
    ).run(mcp.id, c.key, value);
  }
  revalidatePath(`/mcps/${slug}`);
}

export async function toggleTool(slug: string, toolName: string, enabled: boolean) {
  const db = getDb();
  const mcp = db.prepare("SELECT id FROM mcps WHERE slug = ?").get(slug) as { id: number } | undefined;
  if (!mcp) throw new Error("MCP not found");
  db.prepare(
    `INSERT INTO mcp_tools (mcp_id, tool_name, enabled) VALUES (?, ?, ?)
     ON CONFLICT(mcp_id, tool_name) DO UPDATE SET enabled = excluded.enabled`
  ).run(mcp.id, toolName, enabled ? 1 : 0);
  revalidatePath(`/mcps/${slug}`);
}

export async function deleteMcpAction(slug: string) {
  const db = getDb();
  db.prepare("DELETE FROM mcps WHERE slug = ?").run(slug);
  revalidatePath("/dashboard");
  revalidatePath("/mcps");
  redirect("/dashboard");
}
