import { NextResponse } from "next/server";
import { listTemplates } from "@/lib/templates";

export async function GET() {
  const templates = listTemplates().map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    icon: t.icon,
    category: t.category,
    version: t.version,
    auth: t.auth,
    setupUrl: t.setupUrl,
    setupSteps: t.setupSteps,
    secretKeys: t.secretKeys,
    configKeys: t.configKeys,
    toolCount: t.tools.length,
    tools: t.tools.map((tool) => ({ name: tool.name, description: tool.description })),
  }));
  return NextResponse.json({ templates });
}
