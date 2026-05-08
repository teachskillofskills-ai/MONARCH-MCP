import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

declare global {
  // eslint-disable-next-line no-var
  var __monarchDb: Database.Database | undefined;
}

function resolveDbPath(): string {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "monarch.db");
}

export function getDb(): Database.Database {
  if (!global.__monarchDb) {
    const dbPath = resolveDbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mcp_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        module TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'Plug',
        category TEXT NOT NULL DEFAULT 'Other',
        version TEXT NOT NULL DEFAULT '1.0',
        auth TEXT NOT NULL DEFAULT 'API key',
        secret_keys TEXT NOT NULL DEFAULT '[]',
        config_keys TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mcps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        template_id INTEGER NOT NULL REFERENCES mcp_templates(id) ON DELETE RESTRICT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS mcp_secrets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mcp_id INTEGER NOT NULL REFERENCES mcps(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        encrypted_value TEXT NOT NULL,
        UNIQUE(mcp_id, key)
      );

      CREATE TABLE IF NOT EXISTS mcp_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mcp_id INTEGER NOT NULL REFERENCES mcps(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        UNIQUE(mcp_id, key)
      );

      CREATE TABLE IF NOT EXISTS mcp_tools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mcp_id INTEGER NOT NULL REFERENCES mcps(id) ON DELETE CASCADE,
        tool_name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        UNIQUE(mcp_id, tool_name)
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        mcp_id INTEGER REFERENCES mcps(id) ON DELETE SET NULL,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Forward-compatible migrations: add columns to mcp_templates if missing
    const cols = (db.prepare("PRAGMA table_info(mcp_templates)").all() as { name: string }[]).map((r) => r.name);
    const ensureCol = (name: string, def: string) => {
      if (!cols.includes(name)) db.exec(`ALTER TABLE mcp_templates ADD COLUMN ${name} ${def}`);
    };
    ensureCol("icon", "TEXT NOT NULL DEFAULT 'Plug'");
    ensureCol("category", "TEXT NOT NULL DEFAULT 'Other'");
    ensureCol("version", "TEXT NOT NULL DEFAULT '1.0'");
    ensureCol("auth", "TEXT NOT NULL DEFAULT 'API key'");

    global.__monarchDb = db;
  }
  return global.__monarchDb;
}

export type Mcp = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  template_id: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type McpTemplate = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  module: string;
  secret_keys: string;
  config_keys: string;
};
