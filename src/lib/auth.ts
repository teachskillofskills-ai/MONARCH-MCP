import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getDb } from "./db";

const COOKIE_NAME = "monarch_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sign(value: string): string {
  const secret = process.env.SESSION_SECRET || "dev_unsafe_secret";
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function makeToken(userId: number): string {
  const payload = `${userId}:${Date.now()}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

function parseToken(token: string): { userId: number } | null {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const payload = Buffer.from(b64, "base64url").toString("utf8");
  if (sign(payload) !== sig) return null;
  const [uid] = payload.split(":");
  const userId = Number(uid);
  if (!Number.isFinite(userId)) return null;
  return { userId };
}

export async function setSessionCookie(userId: number) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, makeToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const parsed = parseToken(token);
  if (!parsed) return null;
  const db = getDb();
  return db.prepare("SELECT id, username, created_at FROM users WHERE id = ?").get(parsed.userId) as
    | { id: number; username: string; created_at: string }
    | undefined
    || null;
}
