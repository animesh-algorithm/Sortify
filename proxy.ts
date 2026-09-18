import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    url.protocol.replace(":", "");
  // Production reverse proxies must overwrite x-forwarded-proto. Keep local
  // HTTP development and OAuth callbacks usable, including isolated QA servers.
  if (process.env.NODE_ENV === "production" && !local && protocol === "http") {
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  const response = NextResponse.next();
  if (!local && protocol === "https")
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
