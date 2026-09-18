export type Features = {
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
  valence: number;
  tempo: number;
  loudness: number;
};
export type Track = {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { id: string; name: string };
  image?: string;
  sources: string[];
  features?: Features;
  vector?: number[];
};
export type Source = {
  id: string;
  name: string;
  count: number;
  image?: string;
};
export type Suggestion = {
  id: string;
  name: string;
  trackIds: string[];
  selected: boolean;
};
export type RunData = {
  sources: Source[];
  tracks: Track[];
  suggestions: Suggestion[];
  skipped: number;
  enriched: number;
  algorithm: string;
  importedSources?: string[];
  importCursors?: Record<string, string | null>;
  importSeen?: Record<string, string[]>;
  enrichedThrough?: number;
};
export const ACTIVE = [
  "queued",
  "importing",
  "enriching",
  "analyzing",
  "publishing",
];
export const ALGORITHM = "sortify-v2";
