// Integration tests — run against a real server + postgres inside the isolated
// docker-compose.test.yml environment (yt-dlp replaced by tests/stubs/yt-dlp).
// Tests in this file are ordered: they share one user session and the login
// rate-limit test must run last (the guard is per client IP).
import { describe, expect, test } from "bun:test";

const BASE = process.env.SERVER_URL ?? "http://localhost:8080";
const username = `it${Math.floor(Math.random() * 1e12).toString(36)}`;
const password = "secret123";

let token = "";
let audioId = 0;

async function post(path: string, body: unknown, auth?: string) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function get(path: string, auth?: string) {
  return fetch(`${BASE}${path}`, {
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
  });
}

describe("audio-station server API", () => {
  test("GET /health returns 200", async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
  });

  test("POST /signup creates a user", async () => {
    const res = await post("/signup", { username, password });
    expect(res.status).toBe(200);
  });

  test("POST /signup with taken username throws UserAlreadyExist", async () => {
    const res = await post("/signup", { username, password });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("UserAlreadyExist");
  });

  test("POST /signup validates username and password types", async () => {
    expect((await post("/signup", { username: "Bad_Name", password })).status).toBe(400);
    expect((await post("/signup", { username: "okname", password: "short" })).status).toBe(400);
  });

  test("POST /login with wrong password throws InvalidUsernameAndPassword", async () => {
    const res = await post("/login", { username, password: "wrongpass" });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("InvalidUsernameAndPassword");
  });

  test("POST /login returns token, user_id and username", async () => {
    const res = await post("/login", { username, password });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.token).toBe("string");
    expect(body.token.split(".")).toHaveLength(3);
    expect(typeof body.user_id).toBe("number");
    expect(body.username).toBe(username);
    token = body.token;
  });

  test("authenticated endpoints reject missing/invalid tokens", async () => {
    expect((await get("/list")).status).toBe(401);
    expect((await get("/list", "not-a-token")).status).toBe(401);
    expect((await post("/download", { url: "https://youtu.be/dQw4w9WgXcQ" })).status).toBe(401);
  });

  test("GET /list starts empty", async () => {
    const res = await get("/list", token);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test("GET /list validates pagination", async () => {
    expect((await get("/list?limit=51", token)).status).toBe(400);
    expect((await get("/list?skip=-1", token)).status).toBe(400);
  });

  test("POST /download rejects non-youtube urls", async () => {
    const res = await post("/download", { url: "https://vimeo.com/123456" }, token);
    expect(res.status).toBe(400);
  });

  test("POST /download throws VideoNotFound for unresolvable videos", async () => {
    const res = await post("/download", { url: "https://youtu.be/notfound1234" }, token);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("VideoNotFound");
  });

  test("POST /download streams progress and completes", async () => {
    const res = await post("/download", { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, token);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    const text = await res.text();
    const events = text.trim().split("\n").map((line) => JSON.parse(line));
    expect(events.length).toBeGreaterThan(1);
    for (const event of events) {
      expect(typeof event.progress).toBe("number");
      expect(typeof event.estimated).toBe("string");
    }
    const last = events[events.length - 1];
    expect(last.progress).toBe(100);
    expect(last.title).toBe("Stub Video");
    audioId = last.id;
    expect(audioId).toBeGreaterThan(0);
  });

  test("GET /list returns the downloaded audio, newest first", async () => {
    const res = await get("/list", token);
    const audios = await res.json();
    expect(audios).toHaveLength(1);
    expect(audios[0]).toEqual({
      id: audioId,
      title: "Stub Video",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  });

  test("GET /audio/{id}.opus serves the stored file", async () => {
    const res = await get(`/audio/${audioId}.opus`, token);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("stub-opus-data");
  });

  test("GET /audio/{id}.opus for unknown id returns 404", async () => {
    const res = await get("/audio/999999.opus", token);
    expect(res.status).toBe(404);
  });

  // Must stay last: it exhausts the per-IP login retry budget for this client.
  test("login guard throws MaxAllowedRetriesExceeded after 5 failed retries", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await post("/login", { username, password: "wrongpass" });
      expect(res.status).toBe(401);
    }
    const blocked = await post("/login", { username, password });
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toBe("MaxAllowedRetriesExceeded");
  });
});
