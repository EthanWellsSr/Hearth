import type { MetadataRoute } from "next";

// Served as a plain route rather than Next's special app/manifest.ts, which
// auto-injects a <link rel="manifest"> without credentials. The root layout
// links this one with crossOrigin="use-credentials" so the request passes
// Vercel Deployment Protection.
export const dynamic = "force-static";

const manifest: MetadataRoute.Manifest = {
  name: "Hearth",
  short_name: "Hearth",
  description: "A softer way to care for home, together.",
  id: "/",
  scope: "/",
  start_url: "/",
  display: "standalone",
  background_color: "#f8f5ed",
  theme_color: "#f8f5ed",
  icons: [
    {
      src: "/logo-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/logo-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};

export function GET() {
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
