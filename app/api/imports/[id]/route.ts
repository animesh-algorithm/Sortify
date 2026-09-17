import { getD1 } from "@/lib/db";
import { getViewer } from "@/lib/identity";
import { apiError, json, routeError } from "@/lib/http";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const viewer=getViewer(request); if(!viewer) return apiError("AUTH_REQUIRED","Sign in first.",401); const {id}=await context.params; const run=await getD1().prepare("SELECT * FROM import_runs WHERE id=? AND user_id=?").bind(id,viewer.userId).first(); if(!run) return apiError("NOT_FOUND","Import not found.",404); return json({ run }); }
  catch(error){ return routeError(error); }
}
