export function failure(e: unknown) {
  console.warn("request-failed", {
    reason: e instanceof Error ? e.name : "unknown",
  });
  const message = e instanceof Error ? e.message : "";
  const actions: Record<string, string> = {
    "Revision changed":
      "Your selection changed in another window. Refresh before saving.",
    "Approve your changes first":
      "Review and approve your current selection first.",
    "Nothing selected": "Choose at least one playlist with tracks.",
    "Cannot resume": "This step is already running. Give it a moment.",
    "Run cancelled":
      "This organization was cancelled. Choose music to start again.",
    "Run already active":
      "Finish the current organization before starting another.",
  };
  return Response.json(
    {
      error:
        message === "Reconnect Spotify"
          ? message
          : message.startsWith("Playlist")
            ? message
            : (actions[message] ?? "Something went wrong. Try again."),
    },
    {
      status:
        message === "Reconnect Spotify"
          ? 401
          : message === "Run already active"
            ? 409
            : 400,
    },
  );
}
