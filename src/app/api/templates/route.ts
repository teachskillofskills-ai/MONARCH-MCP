import { NextResponse } from "next/server";
import { listTemplates } from "@/lib/templates";

export async function GET() {
  const templates = listTemplates().map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    secretKeys: t.secretKeys,
    configKeys: t.configKeys,
    toolCount: t.tools.length,
  }));
  return NextResponse.json({ templates });
}
