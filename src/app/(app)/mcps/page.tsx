import Link from "next/link";
import { listMcps } from "@/lib/mcps";
import { listTemplates } from "@/lib/templates";
import McpsGrid from "./McpsGrid";

export const dynamic = "force-dynamic";

export default function McpsPage() {
  const mcps = listMcps();
  const templates = listTemplates();
  const categories = ["All", ...Array.from(new Set(templates.map((t) => t.category)))];
  return <McpsGrid mcps={mcps} categories={categories}/>;
}
