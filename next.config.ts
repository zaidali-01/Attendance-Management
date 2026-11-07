import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't generate AGENTS.md during builds.
  agentRules: false,
  // postgres.js uses Node built-ins; keep it out of the server bundle.
  serverExternalPackages: ["postgres"],
  poweredByHeader: false,
  async headers() {
    const security = [
      // Don't let other sites show this app inside a frame (clickjacking).
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];
    return [
      { source: "/:path*", headers: security },
      // Student data must never be stored by browsers or shared caches.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  async redirects() {
    // Old links from the first version of the app.
    return [{ source: "/students/new", destination: "/students?add=1", permanent: false }];
  },
};

export default nextConfig;
