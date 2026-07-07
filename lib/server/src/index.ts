import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createFetchHandler } from "./app";
import { createSql, migrate, waitForDb } from "./db";
import { YtDlpDownloader } from "./download";

// envvar#jwt-secret(default="randomUUID") — random default persists between sessions
function resolveJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const file = process.env.JWT_SECRET_FILE ?? "/data/jwt-secret";
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  const secret = crypto.randomUUID();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://audiostation:audiostation@db:5432/audiostation";
const audiosDir = process.env.AUDIOS_DIR ?? "/audios";
const ytdlpBin = process.env.YTDLP_BIN ?? "yt-dlp";
const port = Number(process.env.PORT ?? 8080);

mkdirSync(audiosDir, { recursive: true });

const sql = createSql(databaseUrl);
await waitForDb(sql);
await migrate(sql);

const server = Bun.serve({
  port,
  idleTimeout: 120,
  fetch: createFetchHandler({
    sql,
    jwtSecret: resolveJwtSecret(),
    audiosDir,
    downloader: new YtDlpDownloader(ytdlpBin),
  }),
});

console.log(`audio-station server listening on :${server.port}`);
