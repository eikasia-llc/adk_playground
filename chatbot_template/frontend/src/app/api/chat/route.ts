// Server-side proxy: browser POST /api/chat -> IAM-locked Cloud Run /chat.
//
// The Next.js server (running inside Firebase App Hosting's managed Cloud Run)
// mints an OIDC ID token via the GCP metadata server using google-auth-library.
// The runtime service account holds roles/run.invoker on the backend service.
// No browser ever sees a backend credential.
//
// Local dev: BACKEND_URL=http://localhost:8080. google-auth-library will fail
// to mint a token outside GCP — we detect that and skip auth for localhost.

import { NextRequest } from "next/server";
import { GoogleAuth } from "google-auth-library";

export const runtime = "nodejs"; // google-auth-library requires Node, not Edge
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
const isLocal = BACKEND_URL.startsWith("http://localhost");

let cachedAuth: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (!cachedAuth) cachedAuth = new GoogleAuth();
  return cachedAuth;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = `${BACKEND_URL}/chat`;
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
    body: JSON.stringify(body),
  });

  // Pass through status + JSON body verbatim.
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
