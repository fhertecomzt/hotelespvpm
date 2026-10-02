import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // 🔴 1. Aumentamos el límite de advertencia de Vite (para que no marque error amarillo)
  build: {
    chunkSizeWarningLimit: 5000,
  },
  plugins: [
    react(),
    // Plugin PWA aquí, dentro de los corchetes de plugins
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
        // 🔴 2. Aumentamos el límite de caché del Service Worker a 5MB (5242880 bytes)
        maximumFileSizeToCacheInBytes: 5242880,
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
