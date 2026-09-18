export function reconcileItems(
  actual: string[],
  expected: string[],
  offset: number,
  batchSize = 100,
) {
  if (
    actual.some((id, i) => id !== expected[i]) ||
    actual.length > expected.length
  )
    throw new Error(
      "Playlist changed. Review it in Spotify before continuing.",
    );
  const end = Math.min(offset + batchSize, expected.length);
  if (actual.length === offset) return { offset, applied: false };
  if (actual.length === end) return { offset: end, applied: true };
  throw new Error("Playlist needs review before continuing.");
}
export const marker = (operationId: string) =>
  `Sortify · operation ${operationId}`;
export function reconcileCreation(
  playlists: {
    id: string;
    description: string;
    owner: { id: string };
    public: boolean;
  }[],
  userId: string,
  operationId: string,
) {
  const matches = playlists.filter(
    (p) =>
      p.owner?.id === userId &&
      p.description === marker(operationId) &&
      p.public === false,
  );
  if (matches.length !== 1)
    throw new Error("Playlist creation is still uncertain. Try again later.");
  return matches[0].id;
}
export function nextAppend(
  actual: string[],
  expected: string[],
  offset: number,
  uncertain: boolean,
) {
  const result = reconcileItems(actual, expected, offset);
  if (!result.applied && uncertain)
    throw new Error(
      "Playlist item update is still uncertain. Try again later.",
    );
  return result;
}
