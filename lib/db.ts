import { env } from "cloudflare:workers";

export function getD1(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export function uid(prefix: string) { return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`; }
export function nowIso() { return new Date().toISOString(); }
