import { decrypt, encrypt } from "./security";
export type StoredTokens = { access: string; refresh: string; expires: Date };
export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};
export async function resolveToken(
  stored: StoredTokens,
  force: boolean,
  exchange: (refresh: string) => Promise<TokenResponse>,
  save: (tokens: StoredTokens) => Promise<unknown>,
  now = Date.now(),
) {
  if (!force && stored.expires.getTime() > now + 60000)
    return decrypt(stored.access);
  const fresh = await exchange(decrypt(stored.refresh));
  if (
    !fresh.access_token ||
    !Number.isFinite(fresh.expires_in) ||
    fresh.expires_in <= 0
  )
    throw new Error("Invalid token response");
  await save({
    access: encrypt(fresh.access_token),
    refresh: fresh.refresh_token
      ? encrypt(fresh.refresh_token)
      : stored.refresh,
    expires: new Date(now + fresh.expires_in * 1000),
  });
  return fresh.access_token;
}
