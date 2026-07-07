import { describe, expect, test } from "bun:test";
import {
  isValidPassword,
  isValidUrl,
  isValidUsername,
  isValidYoutubeUrl,
  parsePagination,
} from "../../src/validation";

describe("username (type#name)", () => {
  test("accepts 1-32 chars of [a-z0-9]", () => {
    expect(isValidUsername("a")).toBe(true);
    expect(isValidUsername("user123")).toBe(true);
    expect(isValidUsername("a".repeat(32))).toBe(true);
  });

  test("rejects empty, too long, uppercase and symbols", () => {
    expect(isValidUsername("")).toBe(false);
    expect(isValidUsername("a".repeat(33))).toBe(false);
    expect(isValidUsername("User")).toBe(false);
    expect(isValidUsername("user_name")).toBe(false);
    expect(isValidUsername(42)).toBe(false);
    expect(isValidUsername(undefined)).toBe(false);
  });
});

describe("password", () => {
  test("accepts 6-32 chars", () => {
    expect(isValidPassword("secret")).toBe(true);
    expect(isValidPassword("x".repeat(32))).toBe(true);
  });

  test("rejects short, long and non-strings", () => {
    expect(isValidPassword("12345")).toBe(false);
    expect(isValidPassword("x".repeat(33))).toBe(false);
    expect(isValidPassword(null)).toBe(false);
  });
});

describe("youtube-url", () => {
  test("accepts web, mobile and short urls", () => {
    expect(isValidYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isValidYoutubeUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isValidYoutubeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isValidYoutubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isValidYoutubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(true);
  });

  test("rejects other hosts and malformed urls", () => {
    expect(isValidYoutubeUrl("https://vimeo.com/12345")).toBe(false);
    expect(isValidYoutubeUrl("https://notyoutube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
    expect(isValidYoutubeUrl("https://www.youtube.com/watch")).toBe(false);
    expect(isValidYoutubeUrl("not a url")).toBe(false);
    expect(isValidYoutubeUrl("ftp://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
  });
});

describe("url (type#url)", () => {
  test("accepts http and https urls", () => {
    expect(isValidUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isValidUrl("http://example.com")).toBe(true);
    expect(isValidUrl("https://youtu.be/abc123")).toBe(true);
  });

  test("rejects non-http protocols and malformed values", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl(42)).toBe(false);
    expect(isValidUrl(undefined)).toBe(false);
  });
});

describe("pagination", () => {
  test("defaults skip=0 limit=20", () => {
    expect(parsePagination(new URLSearchParams())).toEqual({ skip: 0, limit: 20 });
  });

  test("parses provided values", () => {
    expect(parsePagination(new URLSearchParams("skip=10&limit=50"))).toEqual({
      skip: 10,
      limit: 50,
    });
  });

  test("rejects out-of-range values", () => {
    expect(() => parsePagination(new URLSearchParams("limit=0"))).toThrow();
    expect(() => parsePagination(new URLSearchParams("limit=51"))).toThrow();
    expect(() => parsePagination(new URLSearchParams("skip=-1"))).toThrow();
    expect(() => parsePagination(new URLSearchParams("skip=abc"))).toThrow();
  });
});
