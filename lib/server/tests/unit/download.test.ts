import { describe, expect, test } from "bun:test";
import { formatDuration, parseProgressLine } from "../../src/download";

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
