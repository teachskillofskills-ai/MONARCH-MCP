import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteBlobs, downloadBlob, renameBlob } from "@/lib/storage";

export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  try {
    const { body, contentType } = await downloadBlob(url);
    const filename = url.split("/").pop() || "file";
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { urls?: string[] };
  if (!Array.isArray(body.urls) || !body.urls.length) {
    return NextResponse.json({ error: "urls[] required" }, { status: 400 });
  }
  try {
    const r = await deleteBlobs(body.urls);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { fromUrl?: string; toPathname?: string };
  if (!body.fromUrl || !body.toPathname) {
    return NextResponse.json({ error: "fromUrl + toPathname required" }, { status: 400 });
  }
  try {
    const r = await renameBlob(body.fromUrl, body.toPathname.replace(/^\/+/, ""));
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
