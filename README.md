# Project Monarch — MCP Control Plane

> One web app to manage every Model Context Protocol (MCP) server you run.
> Single-user, self-hosted, secrets encrypted at rest, ready to deploy.

Monarch turns the messy reality of running many MCPs (one per Vercel function, one per `npx` script, tokens scattered across `.env` files) into a **single dashboard** where you create instances from templates, paste API keys, toggle individual tools on/off, test calls live, and copy a clean URL into Claude.

**Live demo:** https://monarch-qm6p.onrender.com  · login `monarch` / `monarch`

---

## 📋 Table of contents
- [What's in the box](#whats-in-the-box)
- [Screens](#screens)
- [Local development](#local-development)
- [Deploying to Render](#deploying-to-render)
- [Adding a new template](#adding-a-new-template)
- [Architecture](#architecture)
- [Security model](#security-model)
- [Tech stack](#tech-stack)
- [Roadmap](#roadmap)

---

## What's in the box

### 23 ready-to-use MCP templates

| Category | Templates |
|---|---|
| **Ads** | LinkedIn Ads · Meta Ads · Google Ads |
| **Analytics** | Google Analytics 4 |
| **SEO** | Google Search Console · Advanced Web Ranking · Keyword Volume (DataForSEO) |
| **AI** | OpenAI · Anthropic Claude · Replicate · Gemini Image · OpenRouter |
| **Comms** | Slack |
| **CRM** | HubSpot |
| **Email** | Mailchimp · SendGrid · Resend |
| **Payments** | Stripe · Razorpay |
| **Productivity** | Notion · Airtable |
| **Dev** | GitHub |
| **Storage** | Vercel Blob |

Each template includes:
- A handful of tools (e.g. `linkedin_ads_list_all_ad_accounts`, `slack_post_message`)
- A schema for the credentials it needs
- **Step-by-step setup instructions** with a direct link to the right dashboard page

### Features
- 🔐 **Encrypted secrets** — AES-256-GCM at rest with a single master key
- 🎛️ **Per-instance tool toggling** — disable individual tools without redeploying
- 🧪 **In-app test console** — call any tool with custom JSON args, see the response inline
- 🔍 **Command palette** — ⌘K / Ctrl+K to search MCPs, tools, pages
- 🗝️ **Key vault** — view, copy, rotate any secret (auto-hides after 30s)
- 🛍️ **Marketplace (Add-Ons)** — browse all templates, click "Install" to spin up a new instance
- 💾 **Data export** — one-click JSON dump of the entire DB
- 🧬 **Multi-instance** — run two LinkedIn MCPs for two different accounts side-by-side

---

## Screens

| Path | Purpose |
|---|---|
| `/login` | Single-user sign-in (split-view design) |
| `/dashboard` | Stats + your MCPs + quick actions |
| `/mcps` | Catalog of installed MCPs (grid + list views, category filter) |
| `/mcps/[slug]` | Detail: settings · secrets · tool toggles · test console |
| `/mcps/new` | Create wizard (pick template → name → paste creds) |
| `/market` | All 23 templates with Install/Manage status |
| `/keys` | Vault — every secret, reveal/copy/edit |
| `/settings` | Account · password · encryption · system · data export |
| `/api/mcp/[slug]` | The MCP runtime endpoint (JSON-RPC 2.0) |

---

## Local development

```bash
git clone https://github.com/teachskillofskills-ai/MONARCH-MCP.git
cd MONARCH-MCP
npm install
cp .env.example .env.local   # then edit values
npm run seed                 # creates the user + registers all templates
npm run dev                  # → http://localhost:4000
```

Login with the credentials in your `.env.local` (defaults: `monarch` / `monarch`).

### Required env vars

```bash
MONARCH_MASTER_KEY=<64-char hex — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
SESSION_SECRET=<another 64-char hex>
ADMIN_USERNAME=monarch
ADMIN_PASSWORD=<your password>
DATABASE_PATH=./data/monarch.db   # local; on Render this is /data/monarch.db
```

> ⚠️ **Don't lose `MONARCH_MASTER_KEY`.** All stored secrets become unrecoverable without it.

---

## Deploying to Render

The repo includes a `render.yaml` blueprint. The fastest path:

1. Connect this repo to Render → "New Web Service".
2. Render auto-detects the blueprint:
   - Plan: **Starter** ($7/mo)
   - Disk: **1 GB** mounted at `/data` (SQLite lives here)
   - Build: `npm ci && npm run build`
   - Start: `npm start` (runs `tsx scripts/seed.ts && next start`)
3. Add the env vars from the section above + any **per-MCP API keys** you want pre-seeded:

```
LINKEDIN_ACCESS_TOKEN=...
META_ACCESS_TOKEN=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
GOOGLE_ADS_DEVELOPER_TOKEN=...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
... (see scripts/seed.ts for the full list)
```

The seed runs on every start; it's idempotent. New MCPs added through the UI persist on the disk between deploys.

### Health check
Render hits `/login` (returns 200) every 30s. If it ever goes red, the service auto-restarts.

---

## Adding a new template

Drop one TypeScript file into `src/lib/templates/<your-template>.ts` and register it:

```typescript
// src/lib/templates/my-service.ts
import type { Template, ToolDef, ToolHandler } from "./types";

const tools: ToolDef[] = [
  {
    name: "my_service_get_server_policy",
    description: "Server policy.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "my_service_do_thing",
    description: "Does the thing.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
];

const handlers: Record<string, ToolHandler> = {
  my_service_get_server_policy: async () => ({ api_family: "My Service v1" }),
  my_service_do_thing: async (args, ctx) => {
    const apiKey = ctx.secrets.MY_SERVICE_API_KEY;
    const res = await fetch(`https://api.myservice.com/v1/things/${args.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.json();
  },
};

const template: Template = {
  slug: "my-service",
  name: "My Service",
  description: "What it does in one sentence.",
  icon: "Plug",          // or pick another from components/icons.tsx
  category: "AI",        // or Ads / Analytics / SEO / Email / etc.
  version: "1.0",
  auth: "API key",
  setupUrl: "https://app.myservice.com/api-keys",
  setupSteps: [
    "Step one in plain English.",
    "Step two.",
    "Paste the key below.",
  ],
  secretKeys: [{ key: "MY_SERVICE_API_KEY", label: "API Key" }],
  configKeys: [],
  tools,
  handlers,
};

export default template;
```

Then add it to `src/lib/templates/index.ts`:

```typescript
import myService from "./my-service";
const ALL: Template[] = [/* …existing… */, myService];
```

Run `npm run seed` (locally) or push to Render — your template will appear in the marketplace immediately, ready to instantiate via the UI.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser (Claude or you)                                 │
└─────────────────┬───────────────────────┬────────────────┘
                  │ JSON-RPC              │ HTTPS
                  ▼                       ▼
        /api/mcp/[slug]          /dashboard, /mcps, /keys
        (MCP runtime)             (admin UI)
                  │                       │
                  └───────┬───────────────┘
                          ▼
                ┌────────────────────┐
                │ Template registry  │   src/lib/templates/*
                │ (in-process JS)    │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ SQLite + AES-256   │   /data/monarch.db
                │  encrypted secrets │
                └────────────────────┘
```

**Request flow for an MCP call:**
1. Client `POST /api/mcp/<slug>` with JSON-RPC body.
2. Runtime looks up the MCP row in SQLite (slug → template_id → secrets/config rows).
3. Decrypts secrets in memory using `MONARCH_MASTER_KEY`.
4. Loads the template's tool handler from the in-process registry.
5. Filters by enabled-tool toggles.
6. Calls the handler with `{ secrets, config }` ctx.
7. Wraps result in JSON-RPC response.

No sub-process spawning. No redeploy needed for any change.

---

## Security model

| Threat | Defense |
|---|---|
| DB file leaked | Secrets are AES-256-GCM ciphertext; useless without the master key. |
| Master key leaked | All secrets compromised. **Treat it like the root password.** |
| MCP endpoint scraped | They're public on purpose (Claude needs to call them with no auth). The slug is the API "key" — keep it unguessable if needed. |
| Admin UI accessed by anyone | All `/dashboard /mcps /keys /settings` paths require an HMAC-signed cookie session. |
| XSS leaking secrets | Reveal/copy decrypts only on click; auto-hides after 30s; never logged. |

**Things to do for production:**
- Rotate `MONARCH_MASTER_KEY` from the default in `.env.local`.
- Set a real `ADMIN_PASSWORD`.
- Keep the URL private (no Google indexing). Add HTTP basic-auth at the edge if extra paranoid.
- Use HTTPS only (Render gives you this for free).

---

## Tech stack

| Layer | Pick | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Full-stack React in one repo |
| Language | **TypeScript** | Catches the silly mistakes |
| UI | **Tailwind v4** + custom design tokens | Fast iteration, no UI library bloat |
| DB | **SQLite** (better-sqlite3) | Zero ops, file-based, fast for single-user |
| Auth | **HMAC-signed cookies** (custom, no NextAuth) | 50 lines, no deps, exactly what's needed |
| Encryption | **AES-256-GCM** (`node:crypto`) | FIPS-grade, no library |
| Hosting | **Render** ($7/mo Starter + $1 disk) | One-click persistent disk for SQLite |

No other databases. No Redis. No queue. No KV. Just a Node process and a file.

---

## Roadmap

### v0.3 — coming soon
- Activity log fed by the MCP runtime (currently a stub)
- Master key rotation (re-encrypt all secrets in place)
- Token-expiry alerts (LinkedIn 60-day, Meta 60-day, Google OAuth refresh)

### v0.4
- Multi-user with roles
- Per-MCP usage analytics (calls/day chart)
- Built-in OAuth flow for templates that need it (so you don't have to use the OAuth Playground)
- Render → Postgres migration option

### v1.0
- Workflows: chain calls across multiple MCPs (e.g. daily marketing digest)
- Scheduled jobs per MCP
- Webhook receivers
- Dark mode

### Maybe later
- Studio (define templates from the UI without writing TS)
- Public read-only dashboards per MCP
- Browser extension

---

## License

Internal use, all rights reserved by TechShu Digital.

---

Built with ❤️ at TechShu Kolkata. Questions: support@techshu.com.
