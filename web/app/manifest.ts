import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hearth",
    short_name: "Hearth",
    description: "A softer way to care for home, together.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f5ed",
    theme_color: "#f8f5ed",
    icons: [
      {
        src: "/logo-meadow.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
