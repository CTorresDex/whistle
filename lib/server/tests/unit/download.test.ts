import { describe, expect, test } from "bun:test";
import { formatDuration, parseProgressLine, parseSearchResults } from "../../src/download";

describe("formatDuration (type#duration)", () => {
  test("formats seconds, minutes and hours", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(25)).toBe("25s");
    expect(formatDuration(300)).toBe("5m");
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(3725)).toBe("1h2m5s");
  });
});

describe("parseProgressLine", () => {
  test("parses yt-dlp --newline progress output", () => {
    expect(parseProgressLine("[download]  45.2% of 3.45MiB at 1.23MiB/s ETA 00:12")).toEqual({
      progress: 45,
      estimated: "12s",
    });
    expect(parseProgressLine("[download] 100.0% of 1.00MiB at 1.00MiB/s ETA 00:00")).toEqual({
      progress: 100,
      estimated: "0s",
    });
    expect(parseProgressLine("[download]   5.0% of ~9MiB at 512KiB/s ETA 01:02:03")).toEqual({
      progress: 5,
      estimated: "1h2m3s",
    });
  });

  test("ignores non-progress lines", () => {
    expect(parseProgressLine("[youtube] Extracting URL")).toBeNull();
    expect(parseProgressLine("[download] Destination: /audios/1.opus")).toBeNull();
    expect(parseProgressLine("")).toBeNull();
  });
});

describe("parseSearchResults (type#youtube-search)", () => {
  test("maps flat-playlist entries to youtube-search results", () => {
    const raw = JSON.stringify({
      entries: [
        {
          id: "vid1",
          title: "First",
          duration: 200,
          url: "https://www.youtube.com/watch?v=vid1",
          thumbnails: [{ url: "https://i.ytimg.com/vi/vid1/default.jpg" }, { url: "https://i.ytimg.com/vi/vid1/hq.jpg" }],
        },
        { id: "vid2", title: "Second", duration: 75 },
      ],
    });
    expect(parseSearchResults(raw)).toEqual([
      {
        title: "First",
        url: "https://www.youtube.com/watch?v=vid1",
        duration: "3m20s",
        thumbnail: "https://i.ytimg.com/vi/vid1/hq.jpg",
      },
      {
        title: "Second",
        url: "https://www.youtube.com/watch?v=vid2",
        duration: "1m15s",
        thumbnail: null,
      },
    ]);
  });

  test("drops entries without a title or resolvable url and handles missing entries", () => {
    const raw = JSON.stringify({
      entries: [
        { id: "ok", title: "Keep", duration: 10 },
        { title: "NoUrl" },
        { id: "nope" },
      ],
    });
    const results = parseSearchResults(raw);
    expect(results).toHaveLength(1);
    expect(results[0]!.title).toBe("Keep");
    expect(parseSearchResults(JSON.stringify({}))).toEqual([]);
  });
});
