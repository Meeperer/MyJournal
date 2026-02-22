import type { NextConfig } from "next";

/** Security headers for all routes. CSP can be added later when ready to maintain a policy. */
async function headers() {
  return [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ];
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  headers,
};

export default nextConfig;
