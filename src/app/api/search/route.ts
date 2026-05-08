import { NextRequest, NextResponse } from "next/server";
import { listMcps } from "@/lib/mcps";
import { listTemplates } from "@/lib/templates";

type Hit = {
  type: "mcp" | "tool" | "template" | "page";
  href: string;
  title: string;
  subtitle: string;
  icon?: string;
};

const PAGES: Hit[] = [
  { type: "page", href: "/dashboard", title: "Dashboard",     subtitle: "Overview" },
  { type: "page", href: "/mcps",      title: "All MCPs",      subtitle: "Catalog" },
  { type: "page", href: "/mcps/new",  title: "Create MCP",    subtitle: "New instance" },
  { type: "page", href: "/keys",      title: "Key vault",     subtitle: "Secrets" },
  { type: "page", href: "/activity",  title: "Activity",      subtitle: "Audit log" },
  { type: "page", href: "/settings",  title: "Settings",      subtitle: "Account" },
];

function matches(q: string, ...fields: (string | undefined | null)[]): boolean {
  if (!q) return true;
  const ql = q.toLowerCase();
  return fields.some((f) => f && f.toLowerCase().includes(ql));
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const hits: Hit[] = [];

  for (const m of listMcps()) {
    if (matches(q, m.name, m.slug, m.description, m.template_name, m.template_category)) {
      hits.push({
        type: "mcp",
        href: `/mcps/${m.slug}`,
        title: m.name,
        subtitle: `${m.template_name} · /api/mcp/${m.slug}`,
        icon: m.template_icon,
      });
    }
  }

  for (const t of listTemplates()) {
    if (matches(q, t.name, t.slug, t.description, t.category)) {
      hits.push({
        type: "template",
        href: `/mcps/new?template=${t.slug}`,
        title: t.name,
        subtitle: `Template · ${t.tools.length} tools · ${t.category}`,
        icon: t.icon,
      });
    }
    for (const tool of t.tools) {
      if (matches(q, tool.name, tool.description) && q.length > 1) {
        hits.push({
          type: "tool",
          href: `/mcps/new?template=${t.slug}`,
          title: tool.name,
          subtitle: `Tool in ${t.name} · ${tool.description.slice(0, 80)}`,
          icon: t.icon,
        });
      }
    }
  }

  for (const p of PAGES) {
    if (matches(q, p.title, p.subtitle)) hits.push(p);
  }

  return NextResponse.json({ hits: hits.slice(0, 30) });
}
