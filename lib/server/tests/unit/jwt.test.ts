import { describe, expect, test } from "bun:test";
import { signJwt, verifyJwt } from "../../src/jwt";

const SECRET = "unit-test-secret";

describe("jwt", () => {
  test("sign/verify roundtrip preserves payload", () => {
    const token = signJwt({ user_id: 7, username: "alice" }, SECRET);
    expect(token.split(".")).toHaveLength(3);
    expect(verifyJwt(token, SECRET)).toEqual({ user_id: 7, username: "alice" });
  });

  test("rejects wrong secret", () => {
    const token = signJwt({ user_id: 7, username: "alice" }, SECRET);
    expect(verifyJwt(token, "other-secret")).toBeNull();
  });

  test("rejects tampered payload", () => {
    const token = signJwt({ user_id: 7, username: "alice" }, SECRET);
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ user_id: 1, username: "admin" })).toString(
      "base64url",
    );
    expect(verifyJwt(`${header}.${forged}.${signature}`, SECRET)).toBeNull();
  });

  test("rejects garbage tokens", () => {
    expect(verifyJwt("", SECRET)).toBeNull();
    expect(verifyJwt("a.b", SECRET)).toBeNull();
    expect(verifyJwt("a.b.c", SECRET)).toBeNull();
  });
});
