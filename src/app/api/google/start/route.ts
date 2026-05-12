import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { getMcpBySlug } from "@/lib/mcps";
import { buildAuthUrl, isGoogleTemplate } from "@/lib/google-oauth-flow";

export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const slug = req.nextUrl.searchParams.get("mcp");
  if (!slug) return NextResponse.json({ error: "mcp slug required" }, { status: 400 });

  const data = getMcpBySlug(slug);
  if (!data) return NextResponse.json({ error: "MCP not found" }, { status: 404 });

  if (!isGoogleTemplate(data.mcp.template_slug)) {
    return NextResponse.json({ error: `'${data.mcp.template_slug}' is not a Google template` }, { status: 400 });
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:4000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const redirectUri = `${proto}://${host}/api/google/callback`;

  const state = crypto.randomBytes(16).toString("hex");

  const jar = await cookies();
  jar.set(`gauth_${state}`, JSON.stringify({ slug, redirectUri }), {
    httpOnly: true,
    sameSite: "lax",
    secure: !host.startsWith("localhost"),
    maxAge: 600, // 10 min to complete
    path: "/",
  });

  try {
    const authUrl = buildAuthUrl({
      templateSlug: data.mcp.template_slug,
      redirectUri,
      state,
    });
    return NextResponse.redirect(authUrl);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
