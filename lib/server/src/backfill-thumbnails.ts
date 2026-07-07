// One-off maintenance script: fetches and stores thumbnails for audios that were
// downloaded before the thumbnail feature existed (thumbnail IS NULL). Safe to run
// repeatedly — it only touches rows that still lack a thumbnail.
//
// Run against a deployment with:
//   docker compose -f docker-compose.yml exec server bun src/backfill-thumbnails.ts
import { mkdirSync } from "node:fs";
import type { AudioRow } from "./db";
import { createSql, migrate, waitForDb } from "./db";
import { YtDlpDownloader } from "./download";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://audiostation:audiostation@db:5432/audiostation";
const thumbnailsDir = process.env.THUMBNAILS_DIR ?? "/thumbnails";
const ytdlpBin = process.env.YTDLP_BIN ?? "yt-dlp";

mkdirSync(thumbnailsDir, { recursive: true });

const sql = createSql(databaseUrl);
await waitForDb(sql);
// Ensures the thumbnail column exists even if the server hasn't migrated yet.
await migrate(sql);

const downloader = new YtDlpDownloader(ytdlpBin);

const rows: AudioRow[] = await sql`
  SELECT id, title, url, thumbnail FROM audio WHERE thumbnail IS NULL ORDER BY id
`;
console.log(`backfilling thumbnails for ${rows.length} audio(s) without one`);

let stored = 0;
for (const row of rows) {
  const thumbnailPath = `${thumbnailsDir}/${row.id}.webp`;
  try {
    const ok = await downloader.downloadThumbnail(row.url, thumbnailPath);
    if (ok) {
      await sql`UPDATE audio SET thumbnail = ${`/thumbnail/${row.id}.webp`} WHERE id = ${row.id}`;
      stored += 1;
      console.log(`  [${row.id}] stored thumbnail — ${row.title}`);
    } else {
      console.log(`  [${row.id}] no thumbnail available — ${row.title}`);
    }
  } catch (error) {
    console.error(`  [${row.id}] failed — ${row.title}`, error);
  }
}

console.log(`done: ${stored}/${rows.length} thumbnails stored`);
await sql.end();
