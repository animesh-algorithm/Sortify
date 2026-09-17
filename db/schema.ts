import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const oauthStates = sqliteTable("oauth_states", {
  state: text("state").primaryKey(), userId: text("user_id").notNull(), expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_oauth_states_user").on(table.userId)]);

export const spotifyConnections = sqliteTable("spotify_connections", {
  userId: text("user_id").primaryKey(), spotifyUserId: text("spotify_user_id").notNull(), displayName: text("display_name"),
  accessToken: text("access_token").notNull(), refreshToken: text("refresh_token").notNull(), expiresAt: text("expires_at").notNull(),
  scopes: text("scopes").notNull(), ...timestamps,
});

export const importRuns = sqliteTable("import_runs", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), status: text("status").notNull(), phase: text("phase").notNull(),
  cursorJson: text("cursor_json").notNull().default("{}"), progressCurrent: integer("progress_current").notNull().default(0),
  progressTotal: integer("progress_total").notNull().default(0), warningsJson: text("warnings_json").notNull().default("[]"),
  error: text("error"), startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`), completedAt: text("completed_at"), ...timestamps,
}, (table) => [index("idx_import_runs_user_created").on(table.userId, table.createdAt)]);

export const tracks = sqliteTable("tracks", {
  userId: text("user_id").notNull(), spotifyId: text("spotify_id").notNull(), uri: text("uri").notNull(), name: text("name").notNull(),
  albumId: text("album_id"), albumName: text("album_name"), artistIdsJson: text("artist_ids_json").notNull().default("[]"),
  artistNamesJson: text("artist_names_json").notNull().default("[]"), isrc: text("isrc"), releaseDate: text("release_date"),
  releasePrecision: text("release_precision"), durationMs: integer("duration_ms"), available: integer("available", { mode: "boolean" }).notNull().default(true),
  saved: integer("saved", { mode: "boolean" }).notNull().default(false), snapshotRunId: text("snapshot_run_id").notNull(), ...timestamps,
}, (table) => [primaryKey({ columns: [table.userId, table.spotifyId] }), index("idx_tracks_user_saved").on(table.userId, table.saved), index("idx_tracks_user_isrc").on(table.userId, table.isrc)]);

export const playlists = sqliteTable("playlists", {
  userId: text("user_id").notNull(), spotifyId: text("spotify_id").notNull(), name: text("name").notNull(), ownerId: text("owner_id").notNull(),
  collaborative: integer("collaborative", { mode: "boolean" }).notNull().default(false), snapshotId: text("snapshot_id"),
  totalItems: integer("total_items").notNull().default(0), writable: integer("writable", { mode: "boolean" }).notNull().default(false),
  snapshotRunId: text("snapshot_run_id").notNull(), ...timestamps,
}, (table) => [primaryKey({ columns: [table.userId, table.spotifyId] }), index("idx_playlists_user").on(table.userId)]);

export const playlistItems = sqliteTable("playlist_items", {
  userId: text("user_id").notNull(), playlistId: text("playlist_id").notNull(), position: integer("position").notNull(),
  trackId: text("track_id"), trackUri: text("track_uri"), addedAt: text("added_at"), available: integer("available", { mode: "boolean" }).notNull().default(true),
  snapshotRunId: text("snapshot_run_id").notNull(), ...timestamps,
}, (table) => [primaryKey({ columns: [table.userId, table.playlistId, table.position] }), index("idx_playlist_items_track").on(table.userId, table.trackId)]);

export const analysisRuns = sqliteTable("analysis_runs", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), importRunId: text("import_run_id").notNull(), status: text("status").notNull(),
  phase: text("phase").notNull(), cursorJson: text("cursor_json").notNull().default("{}"), metricsJson: text("metrics_json").notNull().default("{}"),
  error: text("error"), startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`), completedAt: text("completed_at"), ...timestamps,
}, (table) => [index("idx_analysis_runs_user_created").on(table.userId, table.createdAt)]);

export const trackTags = sqliteTable("track_tags", {
  userId: text("user_id").notNull(), trackId: text("track_id").notNull(), dimension: text("dimension").notNull(), value: text("value").notNull(),
  confidence: text("confidence").notNull(), score: integer("score").notNull(), provenance: text("provenance").notNull(), analysisRunId: text("analysis_run_id").notNull(), ...timestamps,
}, (table) => [primaryKey({ columns: [table.userId, table.trackId, table.dimension, table.value] }), index("idx_track_tags_dimension").on(table.userId, table.dimension, table.value)]);

export const musicbrainzCache = sqliteTable("musicbrainz_cache", {
  cacheKey: text("cache_key").primaryKey(), responseJson: text("response_json").notNull(), matched: integer("matched", { mode: "boolean" }).notNull(),
  fetchedAt: text("fetched_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const manualLabels = sqliteTable("manual_labels", {
  userId: text("user_id").notNull(), trackId: text("track_id").notNull(), dimension: text("dimension").notNull(), value: text("value").notNull(),
  analysisRunId: text("analysis_run_id").notNull(), ...timestamps,
}, (table) => [primaryKey({ columns: [table.userId, table.trackId, table.dimension] })]);

export const suggestions = sqliteTable("suggestions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), analysisRunId: text("analysis_run_id").notNull(), rule: text("rule").notNull(),
  title: text("title").notNull(), rationale: text("rationale").notNull(), trackIdsJson: text("track_ids_json").notNull(), trackCount: integer("track_count").notNull(),
  coverage: integer("coverage").notNull(), cohesion: integer("cohesion").notNull(), confidence: integer("confidence").notNull(), novelty: integer("novelty").notNull(),
  usefulness: integer("usefulness").notNull(), rank: integer("rank").notNull(), ...timestamps,
}, (table) => [index("idx_suggestions_user_rank").on(table.userId, table.rank)]);

export const writePreviews = sqliteTable("write_previews", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), suggestionId: text("suggestion_id").notNull(), playlistName: text("playlist_name").notNull(),
  trackUrisJson: text("track_uris_json").notNull(), snapshotHash: text("snapshot_hash").notNull(), status: text("status").notNull(), expiresAt: text("expires_at").notNull(), ...timestamps,
}, (table) => [index("idx_write_previews_user").on(table.userId, table.createdAt)]);

export const operations = sqliteTable("operations", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), previewId: text("preview_id").notNull(), idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull(), spotifyPlaylistId: text("spotify_playlist_id"), error: text("error"), ...timestamps,
}, (table) => [uniqueIndex("idx_operations_user_idempotency").on(table.userId, table.idempotencyKey)]);

export const operationItems = sqliteTable("operation_items", {
  operationId: text("operation_id").notNull(), batchIndex: integer("batch_index").notNull(), status: text("status").notNull(),
  trackUrisJson: text("track_uris_json").notNull(), snapshotId: text("snapshot_id"), error: text("error"), ...timestamps,
}, (table) => [primaryKey({ columns: [table.operationId, table.batchIndex] })]);
