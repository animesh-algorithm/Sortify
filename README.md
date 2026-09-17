# Sortify

Sortify is a private Phase 0 feasibility workbench for organizing a Spotify library safely. It imports a normalized snapshot, measures deterministic and MusicBrainz-backed metadata, ranks organization suggestions, previews the exact write, and can create one private test playlist after confirmation.

## Safety boundaries

- Existing Spotify playlists are never renamed, reordered, deleted, or edited.
- Write previews are persisted, hashed, expire after one hour, and must be confirmed explicitly.
- Playlist creation and item batches are logged with an idempotency key so retries resume the same operation.
- The report fails closed when normalization, precision, usefulness, write safety, or policy compatibility is unverified.

## Configuration

Copy `.env.example` to `.env.local` and supply:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`
- `TOKEN_ENCRYPTION_KEY` (at least 24 random characters)
- `MUSICBRAINZ_CONTACT`

Use the exact HTTPS callback URL configured in the Spotify developer dashboard for deployment. Local Spotify callbacks should use an explicit loopback IP such as `127.0.0.1`, not `localhost`.

## Development

```bash
npm run dev
npm test
npm run build
```

Generate a new migration after schema changes with `npm run db:generate`. Apply each pending migration to the local D1 preview in order using the Wrangler command documented in the starter tooling; deployed Sites apply packaged migrations automatically.

## Workflow

1. Connect Spotify through server-side Authorization Code OAuth.
2. Import saved tracks and permitted playlist items through resumable steps.
3. Analyze a stratified sample and add manual spot labels.
4. Review ranked suggestions with confidence and provenance.
5. Persist and inspect an exact write preview.
6. Confirm one private test playlist.
7. Export the feasibility decision as JSON or Markdown.
