import { ApiError } from "./errors";

// type#name.string — Min Length: 1, Max Length: 32, Allowed Characters: [a-z0-9]
export function isValidUsername(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]{1,32}$/.test(value);
}

// type#password.string — Min Length: 6, Max Length: 32
export function isValidPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 6 && value.length <= 32;
}

// type#url — Generic url (http/https)
export function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// type#youtube-url.url — Valid mobile or web youtube url
export function isValidYoutubeUrl(value: unknown): value is string {
  if (!isValidUrl(value)) return false;
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be") {
    return /^\/[\w-]{6,}/.test(url.pathname);
  }
  if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
    if (url.pathname === "/watch") return /^[\w-]{6,}$/.test(url.searchParams.get("v") ?? "");
    return /^\/(shorts|live|embed)\/[\w-]{6,}/.test(url.pathname);
  }
  return false;
}

export interface Pagination {
  skip: number;
  limit: number;
}

// type#pagination.object — skip.uint, limit.uint(min=1, max=50)
export function parsePagination(params: URLSearchParams): Pagination {
  const skip = params.has("skip") ? Number(params.get("skip")) : 0;
  const limit = params.has("limit") ? Number(params.get("limit")) : 20;
  if (!Number.isInteger(skip) || skip < 0) {
    throw ApiError.validation("skip must be a non-negative integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw ApiError.validation("limit must be an integer between 1 and 50");
  }
  return { skip, limit };
}
