export type SpotifyTrack = {
  id?: string | null; uri?: string | null; name?: string | null; duration_ms?: number | null; is_playable?: boolean;
  external_ids?: { isrc?: string }; artists?: Array<{ id?: string | null; name?: string | null }>;
  album?: { id?: string | null; name?: string | null; release_date?: string | null; release_date_precision?: string | null } | null;
};

export function normalizedTrackStatement(db: D1Database, userId: string, runId: string, track: SpotifyTrack, saved: boolean) {
  if (!track.id || !track.uri || !track.name) return null;
  const artists = (track.artists ?? []).filter((artist) => artist.name);
  return db.prepare(`INSERT INTO tracks (user_id,spotify_id,uri,name,album_id,album_name,artist_ids_json,artist_names_json,isrc,release_date,release_precision,duration_ms,available,saved,snapshot_run_id,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(user_id,spotify_id) DO UPDATE SET uri=excluded.uri,name=excluded.name,album_id=excluded.album_id,album_name=excluded.album_name,artist_ids_json=excluded.artist_ids_json,artist_names_json=excluded.artist_names_json,isrc=excluded.isrc,release_date=excluded.release_date,release_precision=excluded.release_precision,duration_ms=excluded.duration_ms,available=excluded.available,saved=CASE WHEN excluded.saved=1 THEN 1 ELSE tracks.saved END,snapshot_run_id=excluded.snapshot_run_id,updated_at=CURRENT_TIMESTAMP`)
    .bind(userId, track.id, track.uri, track.name, track.album?.id ?? null, track.album?.name ?? null, JSON.stringify(artists.map((artist) => artist.id).filter(Boolean)), JSON.stringify(artists.map((artist) => artist.name)), track.external_ids?.isrc ?? null, track.album?.release_date ?? null, track.album?.release_date_precision ?? null, track.duration_ms ?? null, track.is_playable === false ? 0 : 1, saved ? 1 : 0, runId);
}

export function appendWarning(existing: string, warning: string) {
  const warnings = JSON.parse(existing || "[]") as string[]; if (!warnings.includes(warning)) warnings.push(warning); return JSON.stringify(warnings.slice(-50));
}
