// Server-side SSE proxy: browser GET /api/stream?message=... -> IAM-locked
// Cloud Run /stream. Streams Server-Sent Events back to the browser without
// buffering.
//
// Same auth model as /api/chat: OIDC ID token minted via the metadata server
// using google-auth-library. Skipped for local dev (http://localhost:*).
//
// Note: we use a Web ReadableStream and pass through the upstream body
// directly. Firebase App Hosting's CDN should not buffer text/event-stream
// responses, but if buffering is observed in Phase 4.5 verification we'll
// add explicit no-cache + X-Accel-Buffering headers.

import { NextRequest } from "next/server";
import { GoogleAuth } from "google-auth-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
const isLocal = BACKEND_URL.startsWith("http://localhost");

let cachedAuth: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (!cachedAuth) cachedAuth = new GoogleAuth();
  return cachedAuth;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const message = params.get("message");
  if (!message) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstreamUrl = new URL(`${BACKEND_URL}/stream`);
  upstreamUrl.searchParams.set("message", message);
  const sessionId = params.get("session_id");
  if (sessionId) upstreamUrl.searchParams.set("session_id", sessionId);

  const headers: Record<string, string> = { Accept: "text/event-stream" };

  if (!isLocal) {
    try {
      const client = await getAuth().getIdTokenClient(BACKEND_URL);
      const idToken = await client.idTokenProvider.fetchIdToken(BACKEND_URL);
      headers.Authorization = `Bearer ${idToken}`;
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "failed to mint ID token for backend",
          detail: err instanceof Error ? err.message : String(err),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const upstream = await fetch(upstreamUrl.toString(), { headers });
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `upstream HTTP ${upstream.status}`, detail: text }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
