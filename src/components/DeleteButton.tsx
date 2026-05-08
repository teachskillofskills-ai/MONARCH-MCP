"use client";

import { useTransition } from "react";
import { deleteMcpAction } from "@/lib/actions/mcp";
import { Btn } from "./ui";
import { G } from "./icons";

export default function DeleteButton({ slug, name }: { slug: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Btn variant="danger" size="sm" disabled={pending}
      icon={<G name="trash" size={14}/>}
      onClick={() => {
        if (!confirm(`Delete MCP "${name}"? This cannot be undone.`)) return;
        startTransition(() => { deleteMcpAction(slug); });
      }}>
      {pending ? "Deleting…" : "Delete MCP"}
    </Btn>
  );
}
