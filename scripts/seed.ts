import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      v = v.replace(/\\r\\n$/, "");
      process.env[m[1]] = v;
    }
  }
}
loadEnvFile(path.join(process.cwd(), ".env.local"));

import { getDb } from "../src/lib/db";
import { encrypt } from "../src/lib/crypto";
import { listTemplates } from "../src/lib/templates";

// Pull production secrets if available
const prodSecrets: Record<string, string> = {};
const prodFile = path.join(process.cwd(), ".env.production-secrets");
if (fs.existsSync(prodFile)) {
  for (const line of fs.readFileSync(prodFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) {
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      v = v.replace(/\\r\\n$/, "");
      prodSecrets[m[1]] = v;
    }
  }
}

function s(key: string): string | undefined {
  // process.env first (Render-style), then .env.production-secrets file (local-style)
  const v = process.env[key] || prodSecrets[key];
  return v && v.length ? v : undefined;
}

async function main() {
  const db = getDb();

  // 0. One-time slug migrations (idempotent — safe to run repeatedly)
  const renames: [from: string, to: string, newName?: string][] = [
    ["meta-swapna", "meta-ads", "Meta Ads"],
  ];
  for (const [from, to, newName] of renames) {
    const oldExists = db.prepare("SELECT id FROM mcps WHERE slug = ?").get(from) as { id: number } | undefined;
    const newExists = db.prepare("SELECT id FROM mcps WHERE slug = ?").get(to) as { id: number } | undefined;
    if (oldExists && !newExists) {
      db.prepare("UPDATE mcps SET slug = ?, name = COALESCE(?, name) WHERE id = ?").run(to, newName || null, oldExists.id);
      console.log(`✓ Migrated MCP slug '${from}' → '${to}'`);
    }
  }

  // Remove deprecated MCPs (CASCADE drops their secrets/config/tools)
  const removeMcps: string[] = ["gemini-image"];
  for (const slug of removeMcps) {
    const r = db.prepare("DELETE FROM mcps WHERE slug = ?").run(slug);
    if (r.changes > 0) console.log(`✗ Removed deprecated MCP '${slug}'`);
  }
  // Also remove deprecated templates from DB
  const removeTemplates: string[] = ["gemini-image"];
  for (const slug of removeTemplates) {
    const r = db.prepare("DELETE FROM mcp_templates WHERE module = ?").run(slug);
    if (r.changes > 0) console.log(`✗ Removed deprecated template '${slug}'`);
  }

  // 1. Admin user
  const username = process.env.ADMIN_USERNAME || "monarch";
  const password = process.env.ADMIN_PASSWORD || "monarch";
  const hash = await bcrypt.hash(password, 10);
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    db.prepare("UPDATE users SET password_hash = ? WHERE username = ?").run(hash, username);
  } else {
    db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
  }
  console.log(`✓ User '${username}' ready`);

  // 2. Register / refresh all templates
  for (const t of listTemplates()) {
    const exists = db.prepare("SELECT id FROM mcp_templates WHERE module = ?").get(t.slug);
    if (exists) {
      db.prepare(
        `UPDATE mcp_templates SET name=?, description=?, icon=?, category=?, version=?, auth=?,
         secret_keys=?, config_keys=? WHERE module=?`
      ).run(t.name, t.description, t.icon, t.category, t.version, t.auth,
        JSON.stringify(t.secretKeys), JSON.stringify(t.configKeys), t.slug);
    } else {
      db.prepare(
        `INSERT INTO mcp_templates (slug, name, description, module, icon, category, version, auth, secret_keys, config_keys)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(t.slug, t.name, t.description, t.slug, t.icon, t.category, t.version, t.auth,
        JSON.stringify(t.secretKeys), JSON.stringify(t.configKeys));
    }
    console.log(`✓ Template '${t.slug}' ready`);
  }

  // 3. Seed MCP instances we know about
  type Seed = {
    slug: string;
    name: string;
    description: string;
    template_slug: string;
    secrets: Record<string, string | undefined>;
    config?: Record<string, string>;
  };

  // LinkedIn token: prefer env var (Render), fall back to local file (dev)
  const linkedinTokenFile = path.resolve(process.cwd(), "../scratch/.linkedin_token.json");
  const linkedinToken = process.env.LINKEDIN_ACCESS_TOKEN
    || (fs.existsSync(linkedinTokenFile)
      ? (JSON.parse(fs.readFileSync(linkedinTokenFile, "utf8")) as { access_token: string }).access_token
      : undefined);

  const SEEDS: Seed[] = [
    {
      slug: "linkedin-rachel",
      name: "LinkedIn Ads — Rachel Issac",
      description: "53 ad accounts via TechShu MDP app",
      template_slug: "linkedin-ads",
      secrets: { LINKEDIN_ACCESS_TOKEN: linkedinToken },
      config: { LINKEDIN_API_VERSION: "202604" },
    },
    {
      slug: "meta-ads",
      name: "Meta Ads",
      description: "Meta Marketing API — accounts, campaigns, adsets, ads, insights.",
      template_slug: "meta-ads",
      secrets: { META_ACCESS_TOKEN: s("META_ACCESS_TOKEN") },
      config: { META_GRAPH_API_VERSION: "v25.0" },
    },
    {
      slug: "google-ads-techshu",
      name: "Google Ads — TechShu MCC",
      description: "MCC 9293650427 — manager account for client work",
      template_slug: "google-ads",
      secrets: {
        GOOGLE_OAUTH_CLIENT_ID: s("GOOGLE_OAUTH_CLIENT_ID"),
        GOOGLE_OAUTH_CLIENT_SECRET: s("GOOGLE_OAUTH_CLIENT_SECRET"),
        GOOGLE_OAUTH_REFRESH_TOKEN: s("GOOGLE_OAUTH_REFRESH_TOKEN"),
        GOOGLE_ADS_DEVELOPER_TOKEN: s("GOOGLE_ADS_DEVELOPER_TOKEN"),
      },
      config: {
        GOOGLE_ADS_LOGIN_CUSTOMER_ID: s("GOOGLE_ADS_LOGIN_CUSTOMER_ID") || "9293650427",
        GOOGLE_ADS_DEFAULT_CUSTOMER_ID: s("GOOGLE_ADS_DEFAULT_CUSTOMER_ID") || "9293650427",
      },
    },
    {
      slug: "ga4-techshu",
      name: "Google Analytics 4 — TechShu",
      description: "GA4 reports across all properties accessible to OAuth",
      template_slug: "ga4",
      secrets: {
        GOOGLE_OAUTH_CLIENT_ID: s("GOOGLE_OAUTH_CLIENT_ID"),
        GOOGLE_OAUTH_CLIENT_SECRET: s("GOOGLE_OAUTH_CLIENT_SECRET"),
        GOOGLE_OAUTH_REFRESH_TOKEN: s("GOOGLE_OAUTH_REFRESH_TOKEN"),
      },
    },
    {
      slug: "search-console-techshu",
      name: "Search Console — TechShu",
      description: "All verified sites in TechShu's Search Console",
      template_slug: "search-console",
      secrets: {
        GOOGLE_OAUTH_CLIENT_ID: s("GOOGLE_OAUTH_CLIENT_ID"),
        GOOGLE_OAUTH_CLIENT_SECRET: s("GOOGLE_OAUTH_CLIENT_SECRET"),
        GOOGLE_OAUTH_REFRESH_TOKEN: s("GOOGLE_OAUTH_REFRESH_TOKEN"),
      },
    },
    {
      slug: "awr-1st",
      name: "AWR — Account 1",
      description: "Advanced Web Ranking primary account",
      template_slug: "awr",
      secrets: { AWR_API_TOKEN: s("AWR_1ST_API_TOKEN") },
    },
    {
      slug: "awr-2nd",
      name: "AWR — Account 2",
      description: "Advanced Web Ranking secondary account",
      template_slug: "awr",
      secrets: { AWR_API_TOKEN: s("AWR_API_TOKEN") },
    },
    {
      slug: "keyword-volume",
      name: "Keyword Volume — DataForSEO",
      description: "Monthly search volume lookups",
      template_slug: "keyword-volume",
      secrets: { DATAFORSEO_AUTH_BASE64: s("DATAFORSEO_AUTH_BASE64") },
      config: {
        DATAFORSEO_DEFAULT_LOCATION_NAME: s("DATAFORSEO_DEFAULT_LOCATION_NAME") || "Kolkata,Kolkata,West Bengal,India",
        DATAFORSEO_DEFAULT_LANGUAGE_CODE: s("DATAFORSEO_DEFAULT_LANGUAGE_CODE") || "en",
      },
    },
    {
      slug: "blob-storage",
      name: "Vercel Blob — Monarch",
      description: "Read/list/delete files in monarch-images bucket",
      template_slug: "blob-storage",
      secrets: { BLOB_READ_WRITE_TOKEN: s("BLOB_READ_WRITE_TOKEN") },
    },
    {
      slug: "openrouter-image",
      name: "OpenRouter Image",
      description: "Image generation + chat via OpenRouter",
      template_slug: "openrouter-image",
      secrets: { OPENROUTER_API_KEY: s("OPENROUTER_API_KEY") },
    },
  ];

  for (const seed of SEEDS) {
    const tpl = db.prepare("SELECT id FROM mcp_templates WHERE module = ?").get(seed.template_slug) as { id: number } | undefined;
    if (!tpl) { console.log(`✗ Template ${seed.template_slug} missing — skipping ${seed.slug}`); continue; }

    const existing = db.prepare("SELECT id FROM mcps WHERE slug = ?").get(seed.slug) as { id: number } | undefined;
    let mcpId: number;
    if (existing) {
      mcpId = existing.id;
      db.prepare("UPDATE mcps SET name=?, description=?, template_id=? WHERE id=?")
        .run(seed.name, seed.description, tpl.id, mcpId);
    } else {
      const r = db.prepare(
        `INSERT INTO mcps (slug, name, description, template_id, status) VALUES (?, ?, ?, ?, 'active')`
      ).run(seed.slug, seed.name, seed.description, tpl.id);
      mcpId = Number(r.lastInsertRowid);
    }

    let secretCount = 0;
    for (const [key, value] of Object.entries(seed.secrets)) {
      if (!value) continue;
      db.prepare(
        `INSERT INTO mcp_secrets (mcp_id, key, encrypted_value) VALUES (?, ?, ?)
         ON CONFLICT(mcp_id, key) DO UPDATE SET encrypted_value = excluded.encrypted_value`
      ).run(mcpId, key, encrypt(value));
      secretCount++;
    }

    let configCount = 0;
    for (const [key, value] of Object.entries(seed.config || {})) {
      if (!value) continue;
      db.prepare(
        `INSERT INTO mcp_config (mcp_id, key, value) VALUES (?, ?, ?)
         ON CONFLICT(mcp_id, key) DO UPDATE SET value = excluded.value`
      ).run(mcpId, key, value);
      configCount++;
    }

    const totalSecrets = Object.values(seed.secrets).filter(Boolean).length;
    const status = secretCount === totalSecrets && secretCount > 0 ? "✓" : secretCount > 0 ? "△" : "○";
    console.log(`${status} ${seed.slug} — ${secretCount}/${Object.keys(seed.secrets).length} secrets, ${configCount} config`);
  }

  console.log("\n🎉 Seed complete\n");
  console.log(`   URL:      http://localhost:4000`);
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
