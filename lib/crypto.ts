import { env } from "cloudflare:workers";

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary);
}
function base64ToBytes(value: string) {
  const binary = atob(value); return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function encryptionKey() {
  const secret = env.TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 24) throw new Error("TOKEN_ENCRYPTION_KEY must be configured with at least 24 characters");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(value));
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(value: string) {
  const [version, iv, ciphertext] = value.split(".");
  if (version !== "v1" || !iv || !ciphertext) throw new Error("Stored credential is invalid");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, await encryptionKey(), base64ToBytes(ciphertext));
  return new TextDecoder().decode(decrypted);
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
