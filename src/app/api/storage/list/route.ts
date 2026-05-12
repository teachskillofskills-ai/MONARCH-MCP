import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listBlobs } from "@/lib/storage";

export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const prefix = req.nextUrl.searchParams.get("prefix") || "";
  const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
  try {
    const r = await listBlobs({ prefix, cursor, limit: 200, folded: true });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
