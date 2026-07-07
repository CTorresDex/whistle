import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Proxies /api/* to the audio-station server. Done as a route handler (not
// next.config rewrites) so API_URL is resolved at request time — rewrites are
// baked into the build and would freeze the destination at image-build time.
async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const apiUrl = process.env.API_URL ?? "http://localhost:8080";
  const { search } = new URL(req.url);

  const headers = new Headers();
  for (const name of ["content-type", "authorization"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const res = await fetch(`${apiUrl}/${path.join("/")}${search}`, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const contentType = res.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);
  return new Response(res.body, { status: res.status, headers: responseHeaders });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
