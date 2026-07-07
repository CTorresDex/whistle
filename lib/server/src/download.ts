import { ApiError } from "./errors";

export interface DownloadProgress {
  progress: number;
  estimated: string;
}

// type#duration — ex. 1h, 2h, 5m, 25s
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  let out = "";
  if (h > 0) out += `${h}h`;
  if (m > 0) out += `${m}m`;
  if (s > 0 || out === "") out += `${s}s`;
  return out;
}

function parseEtaSeconds(eta: string): number | null {
  const parts = eta.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

// yt-dlp --newline progress lines: "[download]  45.2% of 3.45MiB at 1.23MiB/s ETA 00:12"
export function parseProgressLine(line: string): DownloadProgress | null {
  const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
  if (!match) return null;
  const progress = Math.min(100, Math.floor(Number(match[1])));
  const etaMatch = line.match(/ETA\s+([\d:]+)/);
  const etaSeconds = etaMatch ? parseEtaSeconds(etaMatch[1]!) : null;
  return { progress, estimated: formatDuration(etaSeconds ?? 0) };
}

// type#youtube-search — one result of a yt-dlp video search
export interface YoutubeSearchResult {
  title: string;
  url: string;
  duration: string;
  thumbnail: string | null;
}

function pickThumbnail(entry: Record<string, unknown>): string | null {
  const thumbs = entry.thumbnails;
  if (Array.isArray(thumbs) && thumbs.length > 0) {
    const last = thumbs[thumbs.length - 1];
    if (last && typeof last.url === "string") return last.url;
  }
  if (typeof entry.thumbnail === "string") return entry.thumbnail;
  return null;
}

// Maps the JSON emitted by `yt-dlp -J --flat-playlist "ytsearchN:..."` (extract_flat: true)
// to youtube-search results. Entries without a usable url or title are dropped.
export function parseSearchResults(raw: string): YoutubeSearchResult[] {
  const data = JSON.parse(raw);
  const entries: unknown[] = Array.isArray(data?.entries) ? data.entries : [];
  const results: YoutubeSearchResult[] = [];
  for (const item of entries) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.title !== "string") continue;
    const id = typeof entry.id === "string" ? entry.id : null;
    const url =
      typeof entry.url === "string"
        ? entry.url
        : id
          ? `https://www.youtube.com/watch?v=${id}`
          : "";
    if (url === "") continue;
    const duration = typeof entry.duration === "number" ? formatDuration(entry.duration) : "";
    results.push({ title: entry.title, url, duration, thumbnail: pickThumbnail(entry) });
  }
  return results;
}

export interface Downloader {
  fetchTitle(url: string): Promise<string>;
  download(
    url: string,
    outputPath: string,
    thumbnailPath: string,
    onProgress: (p: DownloadProgress) => void,
  ): Promise<void>;
  // Fetches only the webp thumbnail (no audio) to backfill already-downloaded audios.
  // Resolves true when the thumbnail was stored, false when none is available.
  downloadThumbnail(url: string, thumbnailPath: string): Promise<boolean>;
  // Searches YouTube via yt-dlp and returns up to 50 flat results
  search(query: string): Promise<YoutubeSearchResult[]>;
  // Streams a video's opus audio directly (no persistent storage)
  previewStream(url: string): ReadableStream<Uint8Array>;
}

export class YtDlpDownloader implements Downloader {
  constructor(private readonly bin: string) {}

  // Throws VideoNotFound when yt-dlp cannot resolve the video
  async fetchTitle(url: string): Promise<string> {
    const proc = Bun.spawn([this.bin, "-J", "--no-playlist", url], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) throw ApiError.videoNotFound();
    try {
      const info = JSON.parse(stdout);
      if (typeof info?.title !== "string") throw new Error("missing title");
      return info.title;
    } catch {
      throw ApiError.videoNotFound();
    }
  }

  // outputPath must end with .opus, thumbnailPath with .webp; yt-dlp receives each as an
  // "{base}.%(ext)s" template. The thumbnail is written next to the opus and converted to
  // webp via the "thumbnail:" output-type prefix so it lands in the thumbnails disk.
  async download(
    url: string,
    outputPath: string,
    thumbnailPath: string,
    onProgress: (p: DownloadProgress) => void,
  ): Promise<void> {
    const template = outputPath.replace(/\.opus$/, ".%(ext)s");
    const thumbTemplate = thumbnailPath.replace(/\.webp$/, ".%(ext)s");
    const proc = Bun.spawn(
      [
        this.bin,
        "-x",
        "--audio-format",
        "opus",
        "--write-thumbnail",
        "--convert-thumbnails",
        "webp",
        "--no-playlist",
        "--newline",
        "-o",
        template,
        "-o",
        `thumbnail:${thumbTemplate}`,
        url,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );

    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of proc.stdout) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const progress = parseProgressLine(line);
        if (progress) onProgress(progress);
      }
    }

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`yt-dlp exited with code ${exitCode}: ${stderr.slice(0, 500)}`);
    }
    if (!(await Bun.file(outputPath).exists())) {
      throw new Error(`yt-dlp finished but ${outputPath} was not created`);
    }
  }

  // Thumbnail-only fetch used by the backfill: --skip-download avoids re-extracting
  // the audio, and the "thumbnail:" output prefix writes the converted webp in place.
  async downloadThumbnail(url: string, thumbnailPath: string): Promise<boolean> {
    const thumbTemplate = thumbnailPath.replace(/\.webp$/, ".%(ext)s");
    const proc = Bun.spawn(
      [
        this.bin,
        "--skip-download",
        "--write-thumbnail",
        "--convert-thumbnails",
        "webp",
        "--no-playlist",
        "-o",
        `thumbnail:${thumbTemplate}`,
        url,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;
    return Bun.file(thumbnailPath).exists();
  }

  // GET /explore — first 50 youtube results for the terms, extract_flat: true
  async search(query: string): Promise<YoutubeSearchResult[]> {
    const proc = Bun.spawn([this.bin, "-J", "--flat-playlist", `ytsearch50:${query}`], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) return [];
    try {
      return parseSearchResults(stdout);
    } catch {
      return [];
    }
  }

  // GET /preview — extract opus and write it to stdout (-o -) instead of a file
  previewStream(url: string): ReadableStream<Uint8Array> {
    const proc = Bun.spawn(
      [this.bin, "-x", "--audio-format", "opus", "--no-playlist", "-o", "-", url],
      { stdout: "pipe", stderr: "pipe" },
    );
    return proc.stdout as ReadableStream<Uint8Array>;
  }
}
