/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output: Next.js emits a self-contained .next/standalone tree
  // with only the runtime files and minimal node_modules. Used by the
  // alternative Dockerfile path; ignored by Firebase App Hosting buildpacks.
  // https://nextjs.org/docs/app/api-reference/next-config-js/output
  output: "standalone",

  // Backend access happens server-side via the Next.js proxy routes
  // (src/app/api/chat, src/app/api/stream) using the BACKEND_URL env var,
  // not via NEXT_PUBLIC_BACKEND_URL. The browser never sees the backend URL.
};

export default nextConfig;
