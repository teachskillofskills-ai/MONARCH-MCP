import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStorageStats } from "@/lib/storage";

export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const stats = await getStorageStats();
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
