import { listTemplates } from "@/lib/templates";
import { listMcps } from "@/lib/mcps";
import MarketGrid from "./MarketGrid";

export const dynamic = "force-dynamic";

export default function MarketPage() {
  const templates = listTemplates();
  const installed = listMcps();
  const installedByTemplate = new Map<string, { count: number; firstSlug: string }>();
  for (const m of installed) {
    const k = m.template_slug;
    const cur = installedByTemplate.get(k) || { count: 0, firstSlug: m.slug };
    cur.count += 1;
    installedByTemplate.set(k, cur);
  }

  const items = templates.map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    icon: t.icon,
    category: t.category,
    auth: t.auth,
    secretCount: t.secretKeys.length,
    toolCount: t.tools.length,
    installedCount: installedByTemplate.get(t.slug)?.count || 0,
    firstInstalledSlug: installedByTemplate.get(t.slug)?.firstSlug || null,
  }));

  const categories = ["All", ...Array.from(new Set(templates.map((t) => t.category)))];

  return <MarketGrid items={items} categories={categories}/>;
}
