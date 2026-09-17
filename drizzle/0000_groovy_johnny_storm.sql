CREATE TABLE `analysis_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`import_run_id` text NOT NULL,
	`status` text NOT NULL,
	`phase` text NOT NULL,
	`cursor_json` text DEFAULT '{}' NOT NULL,
	`metrics_json` text DEFAULT '{}' NOT NULL,
	`error` text,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analysis_runs_user_created` ON `analysis_runs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `import_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`phase` text NOT NULL,
	`cursor_json` text DEFAULT '{}' NOT NULL,
	`progress_current` integer DEFAULT 0 NOT NULL,
	`progress_total` integer DEFAULT 0 NOT NULL,
	`warnings_json` text DEFAULT '[]' NOT NULL,
	`error` text,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_import_runs_user_created` ON `import_runs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `manual_labels` (
	`user_id` text NOT NULL,
	`track_id` text NOT NULL,
	`dimension` text NOT NULL,
	`value` text NOT NULL,
	`analysis_run_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `track_id`, `dimension`)
);
--> statement-breakpoint
CREATE TABLE `musicbrainz_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`response_json` text NOT NULL,
	`matched` integer NOT NULL,
	`fetched_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_oauth_states_user` ON `oauth_states` (`user_id`);--> statement-breakpoint
CREATE TABLE `operation_items` (
	`operation_id` text NOT NULL,
	`batch_index` integer NOT NULL,
	`status` text NOT NULL,
	`track_uris_json` text NOT NULL,
	`snapshot_id` text,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`operation_id`, `batch_index`)
);
--> statement-breakpoint
CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`preview_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text NOT NULL,
	`spotify_playlist_id` text,
	`error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_operations_user_idempotency` ON `operations` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `playlist_items` (
	`user_id` text NOT NULL,
	`playlist_id` text NOT NULL,
	`position` integer NOT NULL,
	`track_id` text,
	`track_uri` text,
	`added_at` text,
	`available` integer DEFAULT true NOT NULL,
	`snapshot_run_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `playlist_id`, `position`)
);
--> statement-breakpoint
CREATE INDEX `idx_playlist_items_track` ON `playlist_items` (`user_id`,`track_id`);--> statement-breakpoint
CREATE TABLE `playlists` (
	`user_id` text NOT NULL,
	`spotify_id` text NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`collaborative` integer DEFAULT false NOT NULL,
	`snapshot_id` text,
	`total_items` integer DEFAULT 0 NOT NULL,
	`writable` integer DEFAULT false NOT NULL,
	`snapshot_run_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `spotify_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_playlists_user` ON `playlists` (`user_id`);--> statement-breakpoint
CREATE TABLE `spotify_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`spotify_user_id` text NOT NULL,
	`display_name` text,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` text NOT NULL,
	`scopes` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`analysis_run_id` text NOT NULL,
	`rule` text NOT NULL,
	`title` text NOT NULL,
	`rationale` text NOT NULL,
	`track_ids_json` text NOT NULL,
	`track_count` integer NOT NULL,
	`coverage` integer NOT NULL,
	`cohesion` integer NOT NULL,
	`confidence` integer NOT NULL,
	`novelty` integer NOT NULL,
	`usefulness` integer NOT NULL,
	`rank` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_suggestions_user_rank` ON `suggestions` (`user_id`,`rank`);--> statement-breakpoint
CREATE TABLE `track_tags` (
	`user_id` text NOT NULL,
	`track_id` text NOT NULL,
	`dimension` text NOT NULL,
	`value` text NOT NULL,
	`confidence` text NOT NULL,
	`score` integer NOT NULL,
	`provenance` text NOT NULL,
	`analysis_run_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `track_id`, `dimension`, `value`)
);
--> statement-breakpoint
CREATE INDEX `idx_track_tags_dimension` ON `track_tags` (`user_id`,`dimension`,`value`);--> statement-breakpoint
CREATE TABLE `tracks` (
	`user_id` text NOT NULL,
	`spotify_id` text NOT NULL,
	`uri` text NOT NULL,
	`name` text NOT NULL,
	`album_id` text,
	`album_name` text,
	`artist_ids_json` text DEFAULT '[]' NOT NULL,
	`artist_names_json` text DEFAULT '[]' NOT NULL,
	`isrc` text,
	`release_date` text,
	`release_precision` text,
	`duration_ms` integer,
	`available` integer DEFAULT true NOT NULL,
	`saved` integer DEFAULT false NOT NULL,
	`snapshot_run_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `spotify_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_tracks_user_saved` ON `tracks` (`user_id`,`saved`);--> statement-breakpoint
CREATE INDEX `idx_tracks_user_isrc` ON `tracks` (`user_id`,`isrc`);--> statement-breakpoint
CREATE TABLE `write_previews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`suggestion_id` text NOT NULL,
	`playlist_name` text NOT NULL,
	`track_uris_json` text NOT NULL,
	`snapshot_hash` text NOT NULL,
	`status` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_write_previews_user` ON `write_previews` (`user_id`,`created_at`);
--> statement-breakpoint
PRAGMA optimize;
