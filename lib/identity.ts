export type Viewer = { userId: string; email: string };

export function getViewer(request: Request): Viewer | null {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  if (userId && email) return { userId, email };
  const host = new URL(request.url).hostname;
  if (host === "localhost" || host === "127.0.0.1") return { userId: "local_seedy", email: "seedy@sites.test" };
  return null;
}
