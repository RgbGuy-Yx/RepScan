/**
 * Instagram URL and Username normalization and validation utilities.
 */

export interface ParsedInstagramProfile {
  username: string;
  profileUrl: string;
}

const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

/**
 * Normalizes an Instagram profile URL, handle, or username into a clean, canonical format.
 * Throws an Error with a user-friendly message if the input cannot be parsed or is invalid.
 */
export function normalizeInstagramProfile(input: string): ParsedInstagramProfile {
  if (!input || typeof input !== "string") {
    throw new Error("Instagram URL or username must be provided");
  }

  let raw = input.trim();

  // Strip leading @ if present
  if (raw.startsWith("@")) {
    raw = raw.slice(1).trim();
  }

  // If a URL was provided
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.includes("instagram.com")) {
    try {
      const urlStr = raw.startsWith("http") ? raw : `https://${raw}`;
      const parsedUrl = new URL(urlStr);

      // Check domain
      const hostname = parsedUrl.hostname.toLowerCase();
      if (!hostname.includes("instagram.com")) {
        throw new Error("URL must be an instagram.com link");
      }

      // Extract path segments
      const segments = parsedUrl.pathname
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);

      if (segments.length === 0) {
        throw new Error("URL does not point to a specific Instagram profile");
      }

      const firstSegment = segments[0].toLowerCase();
      // Guard against system or non-profile paths
      const reservedPaths = new Set([
        "p",
        "reel",
        "reels",
        "stories",
        "explore",
        "direct",
        "accounts",
        "about",
        "developer",
        "legal",
      ]);

      if (reservedPaths.has(firstSegment)) {
        throw new Error(`The URL points to /${firstSegment}/ instead of a public profile page`);
      }

      raw = firstSegment;
    } catch (err: any) {
      if (err instanceof Error && err.message) {
        throw err;
      }
      throw new Error("Invalid Instagram profile URL format");
    }
  }

  // Clean trailing punctuation or slashes
  raw = raw.replace(/\/+$/, "").toLowerCase();

  // Validate Instagram username rules
  if (!INSTAGRAM_USERNAME_REGEX.test(raw)) {
    throw new Error(
      "Invalid Instagram username. Usernames must be 1-30 characters long and contain only letters, numbers, periods, and underscores."
    );
  }

  if (raw.startsWith(".") || raw.endsWith(".")) {
    throw new Error("Instagram username cannot start or end with a period");
  }

  if (raw.includes("..")) {
    throw new Error("Instagram username cannot contain consecutive periods");
  }

  return {
    username: raw,
    profileUrl: `https://www.instagram.com/${raw}/`,
  };
}
