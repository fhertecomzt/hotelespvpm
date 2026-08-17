import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    //  Pplugin PWA aquí, dentro de los corchetes de plugins
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "SWAOS Plataforma Operativa",
        short_name: "SWAOS",
        description:
          "Sistema inteligente para gestión de limpieza y mantenimiento.",
        theme_color: "#0f172a",
        background_color: "#f8fafc",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
      },
    }),
  ],
  // configuración del proxy local
  server: {
    proxy: {
      "/sistema/swaos-api": {
        target: "http://localhost/hotelespvpm/",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
