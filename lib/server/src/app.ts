import type { Server } from "bun";
import { unlink } from "node:fs/promises";
import { ApiError, errorResponse } from "./errors";
import type { AudioRow, Sql, UserRow } from "./db";
import { signJwt, verifyJwt, type TokenPayload } from "./jwt";
import { RetryGuard } from "./retry-guard";
import type { Downloader } from "./download";
import {
  isValidPassword,
  isValidUsername,
  isValidYoutubeUrl,
  parsePagination,
} from "./validation";

export interface AppDeps {
  sql: Sql;
  jwtSecret: string;
  audiosDir: string;
  downloader: Downloader;
  loginGuard?: RetryGuard;
}

const AUDIO_PATH = /^\/audio\/(\d+)\.opus$/;

export function createFetchHandler(deps: AppDeps) {
  const { sql, jwtSecret, audiosDir, downloader } = deps;
  const loginGuard = deps.loginGuard ?? new RetryGuard();

  function authenticate(req: Request): TokenPayload {
    const header = req.headers.get("authorization") ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    const payload = match ? verifyJwt(match[1]!, jwtSecret) : null;
    if (!payload) throw ApiError.unauthorized();
    return payload;
  }

  async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
    try {
      const body = await req.json();
      if (typeof body !== "object" || body === null) throw new Error();
      return body as Record<string, unknown>;
    } catch {
      throw ApiError.validation("Request body must be a JSON object");
    }
  }

  async function handleSignup(req: Request): Promise<Response> {
    const body = await readJsonBody(req);
    if (!isValidUsername(body.username)) {
      throw ApiError.validation("username must be 1-32 chars of [a-z0-9]");
    }
    if (!isValidPassword(body.password)) {
      throw ApiError.validation("password must be 6-32 chars");
    }
    const hash = await Bun.password.hash(body.password, { algorithm: "bcrypt", cost: 12 });
    const inserted: { id: number }[] = await sql`
      INSERT INTO users (username, password) VALUES (${body.username}, ${hash})
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `;
    if (inserted.length === 0) throw ApiError.userAlreadyExist();
    return new Response(null, { status: 200 });
  }

  async function handleLogin(req: Request, ip: string): Promise<Response> {
    if (loginGuard.isBlocked(ip)) throw ApiError.maxAllowedRetriesExceeded();

    const body = await readJsonBody(req);
    const { username, password } = body;
    let user: UserRow | undefined;
    if (isValidUsername(username) && isValidPassword(password)) {
      const rows: UserRow[] = await sql`SELECT * FROM users WHERE username = ${username}`;
      user = rows[0];
    }
    const passwordOk =
      user !== undefined && (await Bun.password.verify(String(password), user.password));
    if (!user || !passwordOk) {
      loginGuard.recordFailure(ip);
      throw ApiError.invalidUsernameAndPassword();
    }

    loginGuard.clear(ip);
    const payload: TokenPayload = { user_id: user.id, username: user.username };
    return Response.json({
      token: signJwt(payload, jwtSecret),
      user_id: user.id,
      username: user.username,
    });
  }

  async function handleDownload(req: Request): Promise<Response> {
    authenticate(req);
    const body = await readJsonBody(req);
    const url = body.url;
    if (!isValidYoutubeUrl(url)) {
      throw ApiError.validation("url must be a valid youtube url");
    }

    // Resolve metadata first so VideoNotFound is a plain 404, before streaming starts
    const title = await downloader.fetchTitle(url);
    const rows: { id: number }[] = await sql`
      INSERT INTO audio (title, url) VALUES (${title}, ${url}) RETURNING id
    `;
    const audioId = rows[0]!.id;
    const outputPath = `${audiosDir}/${audioId}.opus`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: object) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        try {
          await downloader.download(url, outputPath, send);
          send({ progress: 100, estimated: "0s", id: audioId, title });
        } catch (error) {
          console.error("download failed", error);
          await sql`DELETE FROM audio WHERE id = ${audioId}`;
          await unlink(outputPath).catch(() => {});
          send({ error: "DownloadFailed" });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "content-type": "application/x-ndjson" },
    });
  }

  async function handleAudioFile(req: Request, id: string): Promise<Response> {
    authenticate(req);
    const rows: AudioRow[] = await sql`SELECT * FROM audio WHERE id = ${Number(id)}`;
    const file = Bun.file(`${audiosDir}/${id}.opus`);
    if (rows.length === 0 || !(await file.exists())) throw ApiError.notFound();
    return new Response(file, {
      headers: { "content-type": "audio/opus" },
    });
  }

  async function handleList(req: Request, params: URLSearchParams): Promise<Response> {
    authenticate(req);
    const { skip, limit } = parsePagination(params);
    const rows: AudioRow[] = await sql`
      SELECT id, title, url FROM audio ORDER BY id DESC OFFSET ${skip} LIMIT ${limit}
    `;
    return Response.json(rows);
  }

  return async function fetchHandler(req: Request, server: Server): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;
    const ip = server.requestIP(req)?.address ?? "unknown";
    try {
      if (req.method === "GET" && pathname === "/health") return new Response(null, { status: 200 });
      if (req.method === "POST" && pathname === "/signup") return await handleSignup(req);
      if (req.method === "POST" && pathname === "/login") return await handleLogin(req, ip);
      if (req.method === "POST" && pathname === "/download") return await handleDownload(req);
      if (req.method === "GET" && pathname === "/list") return await handleList(req, url.searchParams);
      const audioMatch = req.method === "GET" ? pathname.match(AUDIO_PATH) : null;
      if (audioMatch) return await handleAudioFile(req, audioMatch[1]!);
      throw ApiError.notFound();
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error);
      console.error(`unhandled error on ${req.method} ${pathname}`, error);
      return errorResponse(new ApiError("InternalServerError", 500));
    }
  };
}
