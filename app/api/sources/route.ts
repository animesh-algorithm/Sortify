import { requireUser } from "../../../lib/auth";
import { sources } from "../../../lib/spotify";
import { failure } from "../../../lib/http";
export async function GET() {
  try {
    return Response.json(await sources((await requireUser()).id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
