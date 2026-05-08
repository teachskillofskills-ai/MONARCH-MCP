import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const templateSlug = String(fd.get("template") || "").trim();
  const name = String(fd.get("name") || "").trim();
  const slug = slugify(String(fd.get("slug") || name));
  const description = String(fd.get("description") || "").trim() || null;

  if (!templateSlug || !name || !slug) {
    return NextResponse.json({ error: "Missing template, name, or slug" }, { status: 400 });
  }
  const template = getTemplate(templateSlug);
  if (!template) {
    return NextResponse.json({ error: `Unknown template: ${templateSlug}` }, { status: 400 });
  }

  const db = getDb();
  const tplRow = db
    .prepare("SELECT id FROM mcp_templates WHERE module = ?")
    .get(templateSlug) as { id: number } | undefined;
  if (!tplRow) {
    // Auto-register the template if first use
    const insertTpl = db
      .prepare(
        "INSERT INTO mcp_templates (slug, name, description, module) VALUES (?, ?, ?, ?)"
      )
      .run(templateSlug, template.name, template.description, templateSlug);
    const newId = Number(insertTpl.lastInsertRowid);
    return createMcpWith(db, newId, slug, name, description, fd, template);
  }

  if (db.prepare("SELECT id FROM mcps WHERE slug = ?").get(slug)) {
    return NextResponse.json({ error: `Slug "${slug}" already taken` }, { status: 409 });
  }
  return createMcpWith(db, tplRow.id, slug, name, description, fd, template);
}

function createMcpWith(
  db: ReturnType<typeof getDb>,
  templateDbId: number,
  slug: string,
  name: string,
  description: string | null,
  fd: FormData,
  template: NonNullable<ReturnType<typeof getTemplate>>
) {
  const result = db
    .prepare(
      `INSERT INTO mcps (slug, name, description, template_id, status) VALUES (?, ?, ?, ?, 'active')`
    )
    .run(slug, name, description, templateDbId);
  const mcpId = Number(result.lastInsertRowid);

  const secretInsert = db.prepare(
    `INSERT INTO mcp_secrets (mcp_id, key, encrypted_value) VALUES (?, ?, ?)`
  );
  for (const s of template.secretKeys) {
    const value = String(fd.get(`secret_${s.key}`) || "").trim();
    if (value) secretInsert.run(mcpId, s.key, encrypt(value));
  }

  const cfgInsert = db.prepare(
    `INSERT INTO mcp_config (mcp_id, key, value) VALUES (?, ?, ?)`
  );
  for (const c of template.configKeys) {
    const value = String(fd.get(`config_${c.key}`) || "").trim();
    if (value) cfgInsert.run(mcpId, c.key, value);
  }

  return NextResponse.json({ ok: true, slug, id: mcpId });
}
