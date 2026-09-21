/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Server Actions are enabled by default in Next 15; nothing extra needed.
  },

  // Dev-only CORS for the mobile API (app/api/v1/*): 01_untungin_mobile's
  // Expo *web* preview runs on localhost:8081, a different origin from this
  // app's localhost:3000, so the browser's CORS check blocks it without
  // this. The shipped Android app is unaffected either way — CORS is a
  // browser mechanism, native HTTP clients don't enforce it — so this
  // exists purely to let that local web preview reach a real API response.
  // Gated on NODE_ENV so `next build`/`next start` (and therefore the
  // Vercel deployment) never add these headers.
  async headers() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "http://localhost:8081" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
