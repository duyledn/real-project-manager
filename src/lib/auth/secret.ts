import crypto from "crypto";

/**
 * Salted hashing for passwords and PINs. This is an internal tool with relaxed
 * security requirements, so a salted SHA-256 is sufficient (not bcrypt/scrypt).
 * Format: "<salt>:<hex digest>".
 */
export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(8).toString("hex");
  const digest = crypto.createHash("sha256").update(salt + secret).digest("hex");
  return `${salt}:${digest}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [salt, digest] = (stored || "").split(":");
  if (!salt || !digest) return false;
  const got = crypto.createHash("sha256").update(salt + secret).digest("hex");
  // Constant-time compare.
  const a = Buffer.from(got, "hex");
  const b = Buffer.from(digest, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Normalize a user-entered @tag: lowercase, strip a leading "@" and spaces. */
export function normalizeTag(raw: string): string {
  return (raw || "").trim().replace(/^@+/, "").toLowerCase();
}
