import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isMcpRoute(pathname: string) {
  return pathname.startsWith("/api/mcp/");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // MCP runtime endpoints are public (clients use them without our session)
  if (isMcpRoute(pathname)) return NextResponse.next();
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (pathname.startsWith("/_next")) return NextResponse.next();
  if (pathname === "/favicon.ico") return NextResponse.next();

  const session = req.cookies.get("monarch_session")?.value;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
