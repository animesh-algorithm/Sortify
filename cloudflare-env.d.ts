declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SPOTIFY_CLIENT_ID?: string;
    SPOTIFY_CLIENT_SECRET?: string;
    SPOTIFY_REDIRECT_URI?: string;
    TOKEN_ENCRYPTION_KEY?: string;
    MUSICBRAINZ_CONTACT?: string;
  }
}
