import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
let instance: ReturnType<typeof drizzle<typeof schema>>;
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  return (instance ??= drizzle(
    postgres(process.env.DATABASE_URL, { max: 5, prepare: false }),
    { schema },
  ));
}
