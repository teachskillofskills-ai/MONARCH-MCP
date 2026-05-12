import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadBlob } from "@/lib/storage";

export async function POST(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    const prefix = String(fd.get("prefix") || "").replace(/^\/+/, "");
    if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });
    const pathname = (prefix ? `${prefix}` : "") + file.name;
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await uploadBlob(pathname, buf, file.type || undefined);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// Allow large files (up to 50 MB by default for the route body)
export const config = { api: { bodyParser: false } };
