import fs from "node:fs";
import path from "node:path";
import { getDb } from "./db";

export type SystemInfo = {
  version: string;
  node_version: string;
  database_path: string;
  database_size_kb: number;
  master_key_set: boolean;
  master_key_fingerprint: string;
  user_count: number;
  template_count: number;
  mcp_count: number;
  active_mcp_count: number;
  secret_count: number;
  config_count: number;
  audit_event_count: number;
  uptime_seconds: number;
  app_started_at: string;
};

const APP_STARTED_AT = new Date().toISOString();

function fingerprint(input: string): string {
  if (!input) return "(unset)";
  // 8-char SHA-like fingerprint, no actual key bytes leaked
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function getSystemInfo(): SystemInfo {
  const db = getDb();
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "monarch.db");
  let sizeKb = 0;
  try { sizeKb = Math.round(fs.statSync(dbPath).size / 1024); } catch {}

  const masterKey = process.env.MONARCH_MASTER_KEY || "";

  const count = (sql: string): number =>
    (db.prepare(sql).get() as { c: number }).c;

  return {
    version: "0.2.0",
    node_version: process.version,
    database_path: dbPath,
    database_size_kb: sizeKb,
    master_key_set: !!masterKey,
    master_key_fingerprint: fingerprint(masterKey),
    user_count: count("SELECT COUNT(*) as c FROM users"),
    template_count: count("SELECT COUNT(*) as c FROM mcp_templates"),
    mcp_count: count("SELECT COUNT(*) as c FROM mcps"),
    active_mcp_count: count("SELECT COUNT(*) as c FROM mcps WHERE status='active'"),
    secret_count: count("SELECT COUNT(*) as c FROM mcp_secrets"),
    config_count: count("SELECT COUNT(*) as c FROM mcp_config"),
    audit_event_count: count("SELECT COUNT(*) as c FROM audit_log"),
    uptime_seconds: Math.round((Date.now() - new Date(APP_STARTED_AT).getTime()) / 1000),
    app_started_at: APP_STARTED_AT,
  };
}
