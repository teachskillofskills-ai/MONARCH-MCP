"use client";

import { useState, useTransition } from "react";
import { toggleTool } from "@/lib/actions/mcp";

export default function ToolToggle({
  slug, toolName, initial,
}: {
  slug: string; toolName: string; initial: boolean;
}) {
  const [enabled, setEnabled] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        startTransition(() => { toggleTool(slug, toolName, next); });
      }}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center",
        height: 22, width: 38, borderRadius: 999, padding: 0, cursor: "pointer",
        background: enabled ? "var(--success)" : "var(--ink-200)",
        border: 0,
        opacity: pending ? 0.6 : 1, transition: "background 160ms",
      }}
    >
      <span style={{
        height: 16, width: 16, borderRadius: 999, background: "#fff",
        transform: enabled ? "translateX(19px)" : "translateX(3px)",
        transition: "transform 160ms",
        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      }}/>
    </button>
  );
}
