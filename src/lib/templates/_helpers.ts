export function clampLimit(value: unknown, fallback = 100, max = 500): number {
  return Math.max(1, Math.min(max, Number(value || fallback)));
}

export function csv(value: unknown, fallback: string[] = []): string {
  const arr = Array.isArray(value) ? value : fallback;
  return arr.map((s) => String(s).trim()).filter(Boolean).join(",");
}

export function compact(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== null && v !== "") out[k] = String(v);
  }
  return out;
}

export function require(value: unknown, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  return String(value);
}
