import { getD1, nowIso } from "@/lib/db";
import { getViewer } from "@/lib/identity";
import { apiError, json, routeError } from "@/lib/http";
import { appendWarning, normalizedTrackStatement, type SpotifyTrack } from "@/lib/importer";
import { spotifyFetch } from "@/lib/spotify";

type ImportRow = { id:string; user_id:string; status:string; phase:string; cursor_json:string; warnings_json:string; progress_current:number; progress_total:number };
type Page<T> = { items: T[]; total: number; next?: string | null };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const viewer=getViewer(request); if(!viewer) return apiError("AUTH_REQUIRED","Sign in first.",401);
    const {id}=await context.params; const db=getD1(); const run=await db.prepare("SELECT * FROM import_runs WHERE id=? AND user_id=?").bind(id,viewer.userId).first<ImportRow>();
    if(!run) return apiError("NOT_FOUND","Import not found.",404); if(run.status==="complete") return json({run}); if(run.status==="failed") return apiError("CONFLICT","This import failed. Start a new import.",409);
    const cursor=JSON.parse(run.cursor_json || "{}") as { offset?:number; playlistIds?:string[]; playlistIndex?:number };
    try {
      if(run.phase==="saved_tracks") {
        const offset=cursor.offset ?? 0; const page=await spotifyFetch<Page<{ added_at?:string; track?:SpotifyTrack | null }>>(viewer.userId,`/me/tracks?limit=50&offset=${offset}`);
        const statements=page.items.map((entry)=>entry.track && normalizedTrackStatement(db,viewer.userId,id,entry.track,true)).filter(Boolean) as D1PreparedStatement[];
        if(statements.length) await db.batch(statements);
        const nextOffset=offset+page.items.length; const done=!page.next || nextOffset>=page.total;
        await db.prepare("UPDATE import_runs SET phase=?,cursor_json=?,progress_current=?,progress_total=?,updated_at=? WHERE id=?")
          .bind(done?"playlists":"saved_tracks",JSON.stringify({offset:done?0:nextOffset}),nextOffset,page.total,nowIso(),id).run();
      } else if(run.phase==="playlists") {
        const offset=cursor.offset ?? 0; const page=await spotifyFetch<Page<{ id:string; name:string; owner:{id:string}; collaborative:boolean; snapshot_id?:string; items?:{total:number}; tracks?:{total:number} }>>(viewer.userId,`/me/playlists?limit=50&offset=${offset}`);
        const profile=await db.prepare("SELECT spotify_user_id FROM spotify_connections WHERE user_id=?").bind(viewer.userId).first<{spotify_user_id:string}>();
        const allowed=page.items.filter((playlist)=>playlist.owner.id===profile?.spotify_user_id || playlist.collaborative);
        const statements=allowed.map((playlist)=>db.prepare(`INSERT INTO playlists (user_id,spotify_id,name,owner_id,collaborative,snapshot_id,total_items,writable,snapshot_run_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
          ON CONFLICT(user_id,spotify_id) DO UPDATE SET name=excluded.name,owner_id=excluded.owner_id,collaborative=excluded.collaborative,snapshot_id=excluded.snapshot_id,total_items=excluded.total_items,writable=excluded.writable,snapshot_run_id=excluded.snapshot_run_id,updated_at=CURRENT_TIMESTAMP`)
          .bind(viewer.userId,playlist.id,playlist.name,playlist.owner.id,playlist.collaborative?1:0,playlist.snapshot_id??null,playlist.items?.total??playlist.tracks?.total??0,1,id));
        if(statements.length) await db.batch(statements);
        const savedIds=(cursor.playlistIds??[]).concat(allowed.map((playlist)=>playlist.id)); const nextOffset=offset+page.items.length; const done=!page.next || nextOffset>=page.total;
        await db.prepare("UPDATE import_runs SET phase=?,cursor_json=?,progress_current=?,progress_total=?,updated_at=? WHERE id=?")
          .bind(done?"playlist_items":"playlists",JSON.stringify(done?{playlistIds:savedIds,playlistIndex:0,offset:0}:{playlistIds:savedIds,offset:nextOffset}),nextOffset,page.total,nowIso(),id).run();
      } else if(run.phase==="playlist_items") {
        const playlistIds=cursor.playlistIds??[]; const playlistIndex=cursor.playlistIndex??0;
        if(playlistIndex>=playlistIds.length) {
          await db.prepare("UPDATE import_runs SET status='complete',phase='complete',completed_at=?,updated_at=? WHERE id=?").bind(nowIso(),nowIso(),id).run();
        } else {
          const playlistId=playlistIds[playlistIndex]; const offset=cursor.offset??0;
          const page=await spotifyFetch<Page<{added_at?:string;item?:SpotifyTrack|null;track?:SpotifyTrack|null}>>(viewer.userId,`/playlists/${encodeURIComponent(playlistId)}/items?limit=50&offset=${offset}`);
          const statements:D1PreparedStatement[]=[];
          page.items.forEach((entry,index)=>{const track=entry.item??entry.track; if(track){const upsert=normalizedTrackStatement(db,viewer.userId,id,track,false);if(upsert) statements.push(upsert); statements.push(db.prepare(`INSERT INTO playlist_items (user_id,playlist_id,position,track_id,track_uri,added_at,available,snapshot_run_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
            ON CONFLICT(user_id,playlist_id,position) DO UPDATE SET track_id=excluded.track_id,track_uri=excluded.track_uri,added_at=excluded.added_at,available=excluded.available,snapshot_run_id=excluded.snapshot_run_id,updated_at=CURRENT_TIMESTAMP`).bind(viewer.userId,playlistId,offset+index,track.id??null,track.uri??null,entry.added_at??null,track.is_playable===false?0:1,id));}});
          if(statements.length) await db.batch(statements);
          const nextOffset=offset+page.items.length; const playlistDone=!page.next||nextOffset>=page.total;
          const next={playlistIds,playlistIndex:playlistDone?playlistIndex+1:playlistIndex,offset:playlistDone?0:nextOffset};
          await db.prepare("UPDATE import_runs SET cursor_json=?,progress_current=?,progress_total=?,updated_at=? WHERE id=?").bind(JSON.stringify(next),playlistIndex+(playlistDone?1:0),playlistIds.length,nowIso(),id).run();
        }
      }
    } catch(error) {
      const message=error instanceof Error?error.message:String(error); const retryable=message.includes("rate limit")||message.includes(" 5");
      await db.prepare("UPDATE import_runs SET status=?,error=?,warnings_json=?,updated_at=? WHERE id=?").bind(retryable?"running":"failed",message,appendWarning(run.warnings_json,message),nowIso(),id).run();
      if(!retryable) throw error;
    }
    const updated=await db.prepare("SELECT * FROM import_runs WHERE id=?").bind(id).first(); return json({run:updated});
  } catch(error){return routeError(error);}
}
