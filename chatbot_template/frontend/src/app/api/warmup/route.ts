// Server-side proxy: browser GET /api/warmup -> IAM-locked Cloud Run /warmup
// Preheats Cloud Run container and initializes agent/tools before the user sends
// their first message.

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
  const url = `${BACKEND_URL}/warmup`;
  const headers: Record<string, string> = { "Accept": "application/json" };

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

  try {
    const upstream = await fetch(url, { method: "GET", headers });
    const data = await upstream.json().catch(() => ({ status: "ok" }));
    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: "warmup_requested",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
}
