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

export async function POST(req: NextRequest) {
  const url = `${BACKEND_URL}/clear`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

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

  const upstream = await fetch(url, {
    method: "POST",
    headers,
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
