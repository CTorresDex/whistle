// Exercises the thumbnail-only fetch used by src/backfill-thumbnails.ts against the
// same yt-dlp stub the isolated environments use (no network, deterministic).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { YtDlpDownloader } from "../../src/download";

const stub = `${import.meta.dir}/../stubs/yt-dlp`;
const downloader = new YtDlpDownloader(stub);
const dir = `${tmpdir()}/thumb-backfill-${Math.floor(Math.random() * 1e12).toString(36)}`;

describe("downloadThumbnail (thumbnail backfill)", () => {
  beforeAll(() => mkdirSync(dir, { recursive: true }));
  afterAll(() => rm(dir, { recursive: true, force: true }));

  test("stores the converted webp and reports success", async () => {
    const path = `${dir}/42.webp`;
    const ok = await downloader.downloadThumbnail("https://youtu.be/abc123", path);
    expect(ok).toBe(true);
    expect(await Bun.file(path).text()).toBe("stub-webp-data");
  });

  test("reports failure and stores nothing for an unresolvable video", async () => {
    const path = `${dir}/99.webp`;
    const ok = await downloader.downloadThumbnail("https://youtu.be/notfound99", path);
    expect(ok).toBe(false);
    expect(await Bun.file(path).exists()).toBe(false);
  });
});
