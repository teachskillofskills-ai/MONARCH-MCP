// Server-side Vercel Blob client.
// Reads the read-write token from the blob-storage MCP secret, falls back to env.

import { getDb } from "./db";
import { decrypt } from "./crypto";

const BLOB_API = "https://blob.vercel-storage.com";

function getToken(): string {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.encrypted_value FROM mcp_secrets s
       JOIN mcps m ON m.id = s.mcp_id
       WHERE m.slug = 'blob-storage' AND s.key = 'BLOB_READ_WRITE_TOKEN'`
    )
    .get() as { encrypted_value: string } | undefined;
  if (row) {
    try { return decrypt(row.encrypted_value); } catch { /* fall through */ }
  }
  const envToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (envToken) return envToken;
  throw new Error("Blob Storage not configured. Add the blob-storage MCP and set BLOB_READ_WRITE_TOKEN.");
}

async function blobFetch(method: string, urlOrPath: string, init: RequestInit = {}) {
  const token = getToken();
  const url = urlOrPath.startsWith("http") ? urlOrPath : `${BLOB_API}${urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, method, headers });
}

export type BlobItem = {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
  contentType?: string;
};

export type BlobFolder = {
  pathname: string;          // e.g. "marketing/"
};

export type ListResult = {
  blobs: BlobItem[];
  folders: BlobFolder[];
  cursor?: string;
  hasMore: boolean;
};

/** List blobs at a prefix, returning folders separately when folded. */
export async function listBlobs(opts: { prefix?: string; cursor?: string; limit?: number; folded?: boolean } = {}): Promise<ListResult> {
  const params = new URLSearchParams();
  if (opts.prefix) params.set("prefix", opts.prefix);
  if (opts.cursor) params.set("cursor", opts.cursor);
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.folded !== false) params.set("mode", "folded");
  const res = await blobFetch("GET", `/?${params}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`Vercel Blob list ${res.status}: ${text}`);
  const data = JSON.parse(text) as {
    blobs: { url: string; pathname: string; size: number; uploadedAt: string; contentType?: string }[];
    folders?: string[];
    cursor?: string;
    hasMore: boolean;
  };
  return {
    blobs: data.blobs || [],
    folders: (data.folders || []).map((p) => ({ pathname: p })),
    cursor: data.cursor,
    hasMore: !!data.hasMore,
  };
}

/** Whole-storage stats (sum of all sizes + count). Walks all pages. */
export async function getStorageStats(): Promise<{ totalBytes: number; fileCount: number }> {
  let totalBytes = 0;
  let fileCount = 0;
  let cursor: string | undefined;
  for (let safety = 0; safety < 200; safety++) {
    const r = await listBlobs({ cursor, limit: 1000, folded: false });
    for (const b of r.blobs) { totalBytes += b.size; fileCount += 1; }
    if (!r.hasMore || !r.cursor) break;
    cursor = r.cursor;
  }
  return { totalBytes, fileCount };
}

/** Get one blob's metadata by full URL. */
export async function statBlob(url: string): Promise<BlobItem | null> {
  const params = new URLSearchParams({ url });
  const res = await blobFetch("GET", `/?${params}`);
  if (res.status === 404) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(`Vercel Blob stat ${res.status}: ${text}`);
  return JSON.parse(text) as BlobItem;
}

/** Download bytes by URL (uses the public Blob URL — no token needed for public bucket). */
export async function downloadBlob(url: string): Promise<{ body: ArrayBuffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  return { body: buf, contentType: res.headers.get("content-type") || "application/octet-stream" };
}

/** Upload bytes to a pathname. Returns the new blob URL. */
export async function uploadBlob(pathname: string, body: ArrayBuffer | Buffer | string, contentType?: string): Promise<{ url: string; pathname: string }> {
  // Vercel Blob v2 multipart-friendly upload: PUT with the file body
  const cleanPath = pathname.replace(/^\/+/, "");
  const params = new URLSearchParams({
    pathname: cleanPath,
    addRandomSuffix: "false",      // overwrite if same pathname (Blob default is to randomize)
  });
  const headers: Record<string, string> = {};
  if (contentType) headers["x-content-type"] = contentType;
  const res = await blobFetch("PUT", `/?${params}`, { body: body as BodyInit, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`Upload ${res.status}: ${text}`);
  return JSON.parse(text);
}

/** Delete one or more blobs by URL. */
export async function deleteBlobs(urls: string[]): Promise<{ deleted: number }> {
  const res = await blobFetch("POST", "/delete", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Delete ${res.status}: ${text}`);
  return { deleted: urls.length };
}

/** Copy a blob to a new pathname (since Vercel doesn't expose a direct copy: download + upload). */
export async function copyBlob(fromUrl: string, toPathname: string): Promise<{ url: string; pathname: string }> {
  const { body, contentType } = await downloadBlob(fromUrl);
  return uploadBlob(toPathname, body, contentType);
}

/** Rename = copy + delete. */
export async function renameBlob(fromUrl: string, toPathname: string): Promise<{ url: string; pathname: string }> {
  const result = await copyBlob(fromUrl, toPathname);
  if (result.url !== fromUrl) {
    await deleteBlobs([fromUrl]);
  }
  return result;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function isImage(pathname: string, contentType?: string): boolean {
  if (contentType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(pathname);
}

export function isText(pathname: string, contentType?: string): boolean {
  if (contentType?.startsWith("text/")) return true;
  if (contentType?.includes("json") || contentType?.includes("xml") || contentType?.includes("javascript")) return true;
  return /\.(txt|md|json|csv|tsv|xml|html|css|js|ts|tsx|jsx|yaml|yml|log|svg)$/i.test(pathname);
}
