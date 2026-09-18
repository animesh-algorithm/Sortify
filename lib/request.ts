export class ProviderError extends Error {
  constructor(
    public status: number,
    public retryAfter = 0,
  ) {
    super(`Provider request failed (${status})`);
  }
}
export async function request(
  url: string,
  init: RequestInit = {},
  write = false,
): Promise<Response> {
  const deadline = Date.now() + 45000;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(
        Math.max(1, Math.min(10000, deadline - Date.now())),
      ),
    });
    if (response.ok) return response;
    const header = Number(response.headers.get("retry-after"));
    const delay = header > 0 ? header * 1000 : 1000 * 2 ** attempt;
    if (response.status === 429 || (!write && response.status >= 500)) {
      if (attempt === 3 || Date.now() + delay + 10000 > deadline)
        throw new ProviderError(response.status, delay / 1000);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    throw new ProviderError(response.status);
  }
  throw new Error("Try again");
}
