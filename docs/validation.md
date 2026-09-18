# Validation and rollout

## Local evidence

- Dirty/untracked source snapshot created before replacement; original secrets remain excluded and untouched.
- Final production Next.js build, strict TypeScript checks, ESLint, and Git whitespace validation passed. Fourteen unit/database tests and six browser tests passed. The provider contract probe passed in both request orders.
- Provider probe on 2026-09-18: two requested Spotify IDs produced one valid feature record carrying its explicit Spotify URL. Reversing request order preserved the mapping. Unknown IDs were omitted. Two-ID batches are the verified size used by the adapter; no larger limit or fixed public quota is assumed.
- Unit checks cover authenticated token encryption, constant-time state comparison, token reuse/rotation, reordered provider records, invalid/missing features, pagination and hostile next links, deduplication and source membership, unsupported items, deterministic grouping, small/constant libraries, overlap/caps, metadata-only libraries, exact revision approval invalidation, and uncertain append reconciliation.
- The generated migration is exercised in PGlite (Postgres) for active-run uniqueness, user ownership queries, publication idempotency, and cascading session/data removal. This does not prove hosted Neon connectivity.
- Browser fixtures cover source selection, progress, editable names, moving/removing tracks, playlist selection, reapproval after edits, explicit publishing, and Spotify result links at 375/768/1024/1440. A separate landing check verifies mobile overflow. Real unauthenticated route tests check OAuth state cookie properties, forged/replayed callback rejection, login requirements, and same-origin write rejection. Fixture screenshots live in ignored `outputs/`.

## Live testing is pending

No deployment, authenticated Spotify import, hosted Inngest execution, hosted Neon migration, or Spotify write is claimed as verified. Existing environment has Spotify credentials, but lacks DATABASE_URL, and Inngest configuration. The old local redirect also needs changing. App access/quota mode and owner Premium status cannot be inferred from credentials or `/me` (Development Mode no longer exposes `product`).

1. Configure fresh Neon, apply the migration, and configure Inngest and Vercel.
2. Confirm the existing Spotify app's developer access, owner Premium, exact callback, and allowlisted account in its dashboard.
3. Connect that account and import a small Liked Songs or owned/collaborative playlist selection. Compare the imported counts, skipped items, memberships, progress, and internal matching evidence.
4. Review and edit a suggestion. Approve the exact revision and explicitly select one small playlist for creation.
5. Create it, verify ownership and `public: false`, compare exact track order/count, and record the Spotify URL. Existing playlists must remain unchanged.
6. Exercise a controlled interrupted publish. Confirm completed operations/batches resume without duplicate playlists/items. Unknown creation or append outcomes must pause rather than blindly repeat.
7. Record hosted results, account prerequisites, and any remaining exceptions separately from local fixtures.
