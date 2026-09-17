import { getD1 } from "@/lib/db";
import { getViewer } from "@/lib/identity";
import { apiError, json, routeError } from "@/lib/http";

export async function POST(request: Request) {
  try { const viewer = getViewer(request); if (!viewer) return apiError("AUTH_REQUIRED", "Sign in first.", 401); await getD1().prepare("DELETE FROM spotify_connections WHERE user_id=?").bind(viewer.userId).run(); return json({ disconnected: true }); }
  catch (error) { return routeError(error); }
}
