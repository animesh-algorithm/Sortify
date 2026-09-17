import { getD1 } from "@/lib/db";
import { getViewer } from "@/lib/identity";
import { apiError, json, routeError } from "@/lib/http";
import { getConnectionSummary } from "@/lib/spotify";

export async function GET(request: Request) {
  try {
    const viewer = getViewer(request); if (!viewer) return apiError("AUTH_REQUIRED", "Sign in first.", 401);
    const db = getD1();
    const [connection, latestImport, latestAnalysis, counts, suggestionResult, latestPreview] = await Promise.all([
      getConnectionSummary(viewer.userId),
      db.prepare("SELECT * FROM import_runs WHERE user_id=? ORDER BY created_at DESC LIMIT 1").bind(viewer.userId).first(),
      db.prepare("SELECT * FROM analysis_runs WHERE user_id=? ORDER BY created_at DESC LIMIT 1").bind(viewer.userId).first(),
      db.prepare(`SELECT (SELECT COUNT(*) FROM tracks WHERE user_id=?) AS tracks, (SELECT COUNT(*) FROM playlists WHERE user_id=?) AS playlists, (SELECT COUNT(*) FROM playlist_items WHERE user_id=?) AS playlist_items`).bind(viewer.userId, viewer.userId, viewer.userId).first(),
      db.prepare("SELECT * FROM suggestions WHERE user_id=? ORDER BY rank ASC LIMIT 20").bind(viewer.userId).all(),
      db.prepare("SELECT * FROM write_previews WHERE user_id=? ORDER BY created_at DESC LIMIT 1").bind(viewer.userId).first(),
    ]);
    const suggestions = (suggestionResult.results ?? []).map((row: Record<string, unknown>) => ({ ...row, trackIds: JSON.parse(String(row.track_ids_json ?? "[]")) }));
    return json({ connection, latestImport, latestAnalysis, counts: counts ?? { tracks: 0, playlists: 0, playlist_items: 0 }, suggestions, latestPreview });
  } catch (error) { return routeError(error); }
}
