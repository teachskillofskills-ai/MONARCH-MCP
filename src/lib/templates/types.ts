export type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolHandler = (
  args: Record<string, unknown>,
  ctx: { secrets: Record<string, string>; config: Record<string, string> }
) => Promise<unknown>;

export type Template = {
  slug: string;
  name: string;
  description: string;
  /** Brand icon key (matches a key in components/icons.tsx Brand object). */
  icon: string;
  /** Category used for filtering in the catalog (e.g. "Ads", "Analytics", "SEO", "Storage", "AI"). */
  category: string;
  /** Display version for the template. */
  version: string;
  /** Auth scheme label, e.g. "OAuth", "API key". */
  auth: string;
  secretKeys: { key: string; label: string; helpText?: string }[];
  configKeys: { key: string; label: string; defaultValue?: string; helpText?: string }[];
  tools: ToolDef[];
  handlers: Record<string, ToolHandler>;
};
