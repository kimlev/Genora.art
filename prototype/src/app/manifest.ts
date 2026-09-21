import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Genora.art",
    short_name: "Genora",
    description: "Единое пространство для работы с текстом, изображениями, видео и музыкой.",
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#FF6F00",
    icons: [
      { src: "/favicon/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
