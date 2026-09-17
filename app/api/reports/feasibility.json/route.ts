import { getViewer } from "@/lib/identity";import { apiError,json,routeError } from "@/lib/http";import { buildReport } from "@/lib/report";
export async function GET(request:Request){try{const viewer=getViewer(request);if(!viewer)return apiError("AUTH_REQUIRED","Sign in first.",401);return json(await buildReport(viewer.userId));}catch(error){return routeError(error);}}
