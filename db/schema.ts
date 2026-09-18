import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Features, RunData } from "../lib/model";
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  access: text("access").notNull(),
  refresh: text("refresh").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});
export const runs = pgTable(
  "runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    status: text("status").notNull(),
    revision: integer("revision").notNull().default(0),
    approvedRevision: integer("approved_revision"),
    cancelled: boolean("cancelled").notNull().default(false),
    data: jsonb("data").$type<RunData>().notNull(),
    error: text("error"),
    created: timestamp("created", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("one_active_run")
      .on(t.userId)
      .where(
        sql`${t.status} in ('queued','importing','enriching','analyzing','publishing')`,
      ),
  ],
);
export const featureCache = pgTable("feature_cache", {
  id: text("id").primaryKey(),
  features: jsonb("features").$type<Features>(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});
export const publications = pgTable(
  "publications",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    suggestionId: text("suggestion_id").notNull(),
    revision: integer("revision").notNull(),
    name: text("name").notNull(),
    trackIds: jsonb("track_ids").$type<string[]>().notNull(),
    playlistId: text("playlist_id"),
    status: text("status").notNull().default("pending"),
    offset: integer("offset").notNull().default(0),
    uncertain: boolean("uncertain").notNull().default(false),
  },
  (t) => [
    uniqueIndex("publication_revision").on(t.runId, t.suggestionId, t.revision),
  ],
);
