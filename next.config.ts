import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't generate AGENTS.md during builds.
  agentRules: false,
  // postgres.js uses Node built-ins; keep it out of the server bundle.
  serverExternalPackages: ["postgres"],
  async redirects() {
    // Old links from the first version of the app.
    return [{ source: "/students/new", destination: "/students?add=1", permanent: false }];
  },
};

export default nextConfig;
