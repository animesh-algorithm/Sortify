import { env } from "cloudflare:workers";
import { getD1 } from "./db";

type MbRecording = { id:string; score?:number; title?:string; tags?:Array<{name:string;count:number}>; releases?:Array<{title?:string; "release-group"?:{ "primary-type"?:string; "secondary-types"?:string[] }}> };

export async function enrichFromMusicBrainz(isrc: string): Promise<Record<string, unknown>> {
  const db=getD1(); const cacheKey=`isrc:${isrc.toUpperCase()}`;
  const cached=await db.prepare("SELECT response_json,matched FROM musicbrainz_cache WHERE cache_key=?").bind(cacheKey).first<{response_json:string;matched:number}>();
  if(cached) return { ...JSON.parse(cached.response_json), cached:true } as Record<string,unknown>;
  const contact=env.MUSICBRAINZ_CONTACT; if(!contact) return { matched:false, skipped:"MUSICBRAINZ_CONTACT is not configured" };
  const last=await db.prepare("SELECT fetched_at FROM musicbrainz_cache ORDER BY fetched_at DESC LIMIT 1").first<{fetched_at:string}>();
  if(last && Date.now()-new Date(last.fetched_at).getTime()<1050) return { matched:false, retryAfterMs:1050 };
  const response=await fetch(`https://musicbrainz.org/ws/2/recording?query=isrc:${encodeURIComponent(isrc)}&fmt=json&limit=5`,{headers:{"User-Agent":`Sortify/0.1 (${contact})`,Accept:"application/json"}});
  if(response.status===503||response.status===429) return {matched:false,retryAfterMs:1500};
  if(!response.ok) throw new Error(`MusicBrainz request failed (${response.status})`);
  const body=await response.json() as {recordings?:MbRecording[]}; const exact=(body.recordings??[]).sort((a,b)=>(b.score??0)-(a.score??0))[0];
  const genres=(exact?.tags??[]).filter((tag)=>tag.count>0).sort((a,b)=>b.count-a.count).slice(0,3).map((tag)=>tag.name);
  const soundtrack=Boolean(exact?.releases?.some((release)=>release["release-group"]?.["secondary-types"]?.includes("Soundtrack")));
  const payload={matched:Boolean(exact&&(exact.score??0)>=90),recordingId:exact?.id??null,score:exact?.score??0,genres,soundtrack};
  await db.prepare("INSERT INTO musicbrainz_cache (cache_key,response_json,matched) VALUES (?,?,?)").bind(cacheKey,JSON.stringify(payload),payload.matched?1:0).run();
  return payload;
}
