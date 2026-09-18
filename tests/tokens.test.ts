import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveToken, type StoredTokens } from "../lib/tokens";
import { encrypt, decrypt } from "../lib/security";
test("valid tokens are reused, expiry and forced refresh rotate encrypted tokens", async () => {
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  const now = 100000;
  let saved: StoredTokens | undefined,
    exchanges = 0;
  const stored = {
    access: encrypt("access"),
    refresh: encrypt("refresh"),
    expires: new Date(now + 3600000),
  };
  const exchange = async (refresh: string) => {
    assert.equal(refresh, "refresh");
    exchanges++;
    return { access_token: "new", refresh_token: "rotated", expires_in: 3600 };
  };
  const save = async (tokens: StoredTokens) => {
    saved = tokens;
  };
  assert.equal(
    await resolveToken(stored, false, exchange, save, now),
    "access",
  );
  assert.equal(exchanges, 0);
  assert.equal(await resolveToken(stored, true, exchange, save, now), "new");
  assert.equal(decrypt(saved!.refresh), "rotated");
  assert.equal(decrypt(saved!.access), "new");
  assert.equal(saved!.expires.getTime(), now + 3600000);
  await resolveToken(
    { ...stored, expires: new Date(now) },
    false,
    async () => ({ access_token: "next", expires_in: 3600 }),
    save,
    now,
  );
  assert.equal(saved!.refresh, stored.refresh);
  await assert.rejects(() =>
    resolveToken(
      stored,
      true,
      async () => ({ access_token: "", expires_in: 0 }),
      save,
      now,
    ),
  );
});
