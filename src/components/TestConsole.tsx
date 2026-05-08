"use client";

import { useState } from "react";
import { Btn, Field } from "./ui";
import { G } from "./icons";

type Tool = { name: string; description: string };

export default function TestConsole({ slug, tools }: { slug: string; tools: Tool[] }) {
  const [selected, setSelected] = useState(tools[0]?.name || "");
  const [argsText, setArgsText] = useState("{}");
  const [result, setResult] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setResult("");
    setRunning(true);
    let parsedArgs: unknown = {};
    try { parsedArgs = argsText.trim() ? JSON.parse(argsText) : {}; }
    catch (e) { setError(`Invalid JSON: ${(e as Error).message}`); setRunning(false); return; }
    try {
      const res = await fetch(`/api/mcp/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: Date.now(),
          method: "tools/call",
          params: { name: selected, arguments: parsedArgs },
        }),
      });
      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (e) { setError((e as Error).message); }
    finally { setRunning(false); }
  }

  if (tools.length === 0) {
    return <p style={{ color: "var(--fg-muted)", fontSize: 13 }}>No enabled tools to test. Enable some above.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
        <Field label="Tool" hint={tools.find((t) => t.name === selected)?.description}>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ fontFamily: "var(--font-mono)" }}>
            {tools.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Arguments (JSON)">
          <textarea value={argsText} onChange={(e) => setArgsText(e.target.value)} rows={4}
            style={{ fontFamily: "var(--font-mono)", resize: "vertical" }}
            placeholder='{"ad_account_id": "504950166"}'/>
        </Field>
      </div>

      <div>
        <Btn variant="primary" onClick={run} disabled={running || !selected} icon={<G name="play" size={14}/>}>
          {running ? "Running…" : "Run"}
        </Btn>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 8, background: "color-mix(in srgb, var(--danger) 8%, transparent)", color: "var(--danger)", fontSize: 13, border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)" }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Result</div>
          <pre style={{
            background: "var(--ink-900)", color: "#e8e8e8", padding: 14, borderRadius: 8,
            fontSize: 12, lineHeight: 1.5, fontFamily: "var(--font-mono)",
            overflow: "auto", maxHeight: 500, margin: 0,
          }}>{result}</pre>
        </div>
      )}
    </div>
  );
}
