import { getD1, uid } from "@/lib/db";
import { getViewer } from "@/lib/identity";
import { apiError, json, routeError } from "@/lib/http";

export async function POST(request:Request){
  try{const viewer=getViewer(request);if(!viewer)return apiError("AUTH_REQUIRED","Sign in first.",401);const db=getD1();const imported=await db.prepare("SELECT id FROM import_runs WHERE user_id=? AND status='complete' ORDER BY created_at DESC LIMIT 1").bind(viewer.userId).first<{id:string}>();if(!imported)return apiError("CONFLICT","Complete a library import before analysis.",409);const id=uid("ana");await db.prepare("INSERT INTO analysis_runs (id,user_id,import_run_id,status,phase,cursor_json) VALUES (?,?,?,'running','deterministic','{\"offset\":0}')").bind(id,viewer.userId,imported.id).run();return json({id,status:"running",phase:"deterministic"},{status:201});}catch(error){return routeError(error);}
}
