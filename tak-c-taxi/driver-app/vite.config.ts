import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "تكسي سائق — Tak-C.taxi Driver",
        short_name: "تكسي سائق",
        description: "استقبل طلبات الركوب وأدرها — تكسي للسائقين",
        lang: "ar",
        dir: "rtl",
        start_url: "/",
        display: "standalone",
        background_color: "#EFE8D8",
        theme_color: "#EFE8D8",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
});
