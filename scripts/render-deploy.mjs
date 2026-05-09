// One-shot Render deploy for Project Monarch.
// Requires RENDER_API_KEY in env. Reads secrets from ../scratch/.linkedin_token.json
// and ./.env.production-secrets (gitignored).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RENDER_API = "https://api.render.com/v1";
const RENDER_KEY = process.env.RENDER_API_KEY;
if (!RENDER_KEY) { console.error("RENDER_API_KEY required"); process.exit(1); }

const OWNER_ID       = process.env.RENDER_OWNER_ID || "tea-d2mppsogjchc73cv4qi0";
const PROJECT_ID     = process.env.RENDER_PROJECT_ID || "prj-d7usbqvlk1mc73anv4jg";
const ENVIRONMENT_ID = process.env.RENDER_ENV_ID || "evm-d7usbqvlk1mc73anv4k0";
const REPO           = process.env.MONARCH_REPO || "https://github.com/teachskillofskills-ai/MONARCH-MCP";
const SERVICE_NAME   = process.env.MONARCH_SVC_NAME || "monarch";

// ── Secrets ───────────────────────────────────────────────────
function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) {
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      v = v.replace(/\\r\\n$/, "");
      out[m[1]] = v;
    }
  }
  return out;
}

const prod = loadEnvFile(path.join(process.cwd(), ".env.production-secrets"));
const linkedinTokenFile = path.resolve(process.cwd(), "../scratch/.linkedin_token.json");
let linkedinToken = "";
if (fs.existsSync(linkedinTokenFile)) {
  linkedinToken = JSON.parse(fs.readFileSync(linkedinTokenFile, "utf8")).access_token;
}

const masterKey = crypto.randomBytes(32).toString("hex");
const sessionSecret = crypto.randomBytes(32).toString("hex");

const envVars = [
  // Core
  { key: "NODE_VERSION", value: "22" },
  { key: "DATABASE_PATH", value: "/data/monarch.db" },
  { key: "MONARCH_MASTER_KEY", value: masterKey },
  { key: "SESSION_SECRET", value: sessionSecret },
  { key: "ADMIN_USERNAME", value: "monarch" },
  { key: "ADMIN_PASSWORD", value: "monarch" },

  // LinkedIn
  { key: "LINKEDIN_ACCESS_TOKEN", value: linkedinToken },
  { key: "LINKEDIN_API_VERSION", value: "202604" },

  // Meta
  { key: "META_ACCESS_TOKEN", value: prod.META_ACCESS_TOKEN || "" },
  { key: "META_GRAPH_API_VERSION", value: prod.META_GRAPH_API_VERSION || "v25.0" },
  { key: "META_ADS_WRITE_ENABLED", value: "false" },

  // Google (Ads / GA4 / GSC share OAuth)
  { key: "GOOGLE_OAUTH_CLIENT_ID", value: prod.GOOGLE_OAUTH_CLIENT_ID || "" },
  { key: "GOOGLE_OAUTH_CLIENT_SECRET", value: prod.GOOGLE_OAUTH_CLIENT_SECRET || "" },
  { key: "GOOGLE_OAUTH_REFRESH_TOKEN", value: prod.GOOGLE_OAUTH_REFRESH_TOKEN || "" },
  { key: "GOOGLE_ADS_DEVELOPER_TOKEN", value: prod.GOOGLE_ADS_DEVELOPER_TOKEN || "" },
  { key: "GOOGLE_ADS_LOGIN_CUSTOMER_ID", value: prod.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "9293650427" },
  { key: "GOOGLE_ADS_DEFAULT_CUSTOMER_ID", value: prod.GOOGLE_ADS_DEFAULT_CUSTOMER_ID || "9293650427" },
  { key: "GOOGLE_ADS_API_VERSION", value: "v22" },

  // AWR
  { key: "AWR_1ST_API_TOKEN", value: prod.AWR_1ST_API_TOKEN || "" },
  { key: "AWR_API_TOKEN", value: prod.AWR_API_TOKEN || "" },

  // DataForSEO (Keyword Volume)
  { key: "DATAFORSEO_AUTH_BASE64", value: prod.DATAFORSEO_AUTH_BASE64 || "" },
  { key: "DATAFORSEO_DEFAULT_LOCATION_NAME", value: prod.DATAFORSEO_DEFAULT_LOCATION_NAME || "Kolkata,Kolkata,West Bengal,India" },
  { key: "DATAFORSEO_DEFAULT_LANGUAGE_CODE", value: prod.DATAFORSEO_DEFAULT_LANGUAGE_CODE || "en" },

  // Gemini
  { key: "GEMINI_API_KEY", value: prod.GEMINI_API_KEY || "" },

  // OpenRouter
  { key: "OPENROUTER_API_KEY", value: prod.OPENROUTER_API_KEY || "" },

  // Blob storage
  { key: "BLOB_READ_WRITE_TOKEN", value: prod.BLOB_READ_WRITE_TOKEN || "" },
].filter((e) => e.value !== undefined);

console.log(`Pushing ${envVars.length} env vars`);
console.log(`  ${envVars.filter((v) => v.value).length} with values, ${envVars.filter((v) => !v.value).length} empty`);

// ── Render API ────────────────────────────────────────────────
async function rapi(method, path, body) {
  const res = await fetch(`${RENDER_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${RENDER_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Render API ${method} ${path} → ${res.status}: ${JSON.stringify(parsed).slice(0, 600)}`);
  }
  return parsed;
}

// Check if a service with our name already exists in this owner
async function findExistingService() {
  const all = await rapi("GET", `/services?limit=100&ownerId=${OWNER_ID}`);
  const list = Array.isArray(all) ? all : [];
  return list.find((x) => x.service?.name === SERVICE_NAME)?.service;
}

const existing = await findExistingService();
if (existing) {
  console.log(`✓ Service '${SERVICE_NAME}' already exists (id=${existing.id}). Updating env vars instead.`);
  // Push env vars (PUT replaces all)
  await rapi("PUT", `/services/${existing.id}/env-vars`, envVars);
  console.log("✓ Env vars updated");
  // Trigger a deploy
  const dep = await rapi("POST", `/services/${existing.id}/deploys`, { clearCache: "do_not_clear" });
  console.log(`✓ Deploy queued: ${dep.id}`);
  console.log(`Dashboard: https://dashboard.render.com/web/${existing.id}`);
  process.exit(0);
}

// Create the service
const body = {
  type: "web_service",
  name: SERVICE_NAME,
  ownerId: OWNER_ID,
  repo: REPO,
  branch: "main",
  autoDeploy: "yes",
  rootDir: "",
  envVars,
  projectId: PROJECT_ID,
  environmentId: ENVIRONMENT_ID,
  serviceDetails: {
    env: "node",
    region: "singapore",
    plan: "starter",
    envSpecificDetails: {
      buildCommand: "npm ci && npm run build",
      startCommand: "npm start",
    },
    disk: {
      name: "monarch-data",
      mountPath: "/data",
      sizeGB: 1,
    },
    healthCheckPath: "/login",
  },
};

console.log("\nCreating Render web service…");
const created = await rapi("POST", "/services", body);
const svc = created.service || created;
console.log(`✓ Service created: id=${svc.id}, slug=${svc.slug}`);
console.log(`  URL: https://${svc.slug}.onrender.com`);
console.log(`  Dashboard: https://dashboard.render.com/web/${svc.id}`);
console.log(`\nFirst deploy started automatically. Watch: ${created.deployId ? `/services/${svc.id}/deploys/${created.deployId}` : 'dashboard'}`);
