import { getD1, uid } from "@/lib/db";
import { getViewer } from "@/lib/identity";
import { apiError, json, routeError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const viewer = getViewer(request); if (!viewer) return apiError("AUTH_REQUIRED", "Sign in first.", 401);
    const db = getD1(); const connection = await db.prepare("SELECT 1 FROM spotify_connections WHERE user_id=?").bind(viewer.userId).first();
    if (!connection) return apiError("CONFLICT", "Connect Spotify before importing.", 409);
    const id = uid("imp");
    await db.prepare("INSERT INTO import_runs (id,user_id,status,phase,cursor_json) VALUES (?,?,'running','saved_tracks','{\"offset\":0}')").bind(id, viewer.userId).run();
    return json({ id, status: "running", phase: "saved_tracks" }, { status: 201 });
  } catch (error) { return routeError(error); }
}
