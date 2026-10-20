import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Семейный бюджет",
    short_name: "Бюджет",
    description: "Учёт расходов семьи",
    lang: "ru",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#4f46e5",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press on the home-screen icon
    shortcuts: [
      { name: "Добавить расход", short_name: "Добавить", url: "/?add=1" },
      { name: "Расходы", url: "/expenses" },
    ],
  };
}
