import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteBlobs, listBlobs } from "@/lib/storage";

// DELETE: recursively delete every blob under a prefix.
export async function DELETE(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { prefix?: string };
  const prefix = (body.prefix || "").replace(/^\/+/, "");
  if (!prefix) return NextResponse.json({ error: "prefix required" }, { status: 400 });

  try {
    const urls: string[] = [];
    let cursor: string | undefined;
    for (let safety = 0; safety < 200; safety++) {
      const r = await listBlobs({ prefix, cursor, limit: 1000, folded: false });
      urls.push(...r.blobs.map((b) => b.url));
      if (!r.hasMore || !r.cursor) break;
      cursor = r.cursor;
    }
    if (!urls.length) return NextResponse.json({ deleted: 0 });
    // Delete in chunks of 100 to stay under any payload limits
    let deleted = 0;
    for (let i = 0; i < urls.length; i += 100) {
      const chunk = urls.slice(i, i + 100);
      await deleteBlobs(chunk);
      deleted += chunk.length;
    }
    return NextResponse.json({ deleted });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
