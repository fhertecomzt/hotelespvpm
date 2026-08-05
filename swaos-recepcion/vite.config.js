import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Le decimos a Vite que intercepte estas rutas relativas
      "/sistema/swaos-api": {
        target: "http://localhost/hotelespvpm/", // La dirección de tu servidor Apache/XAMPP local
        changeOrigin: true, // Necesario para evitar problemas de CORS en local
        secure: false, // Como estamos en localhost sin https, lo dejamos en false
      },
    },
  },
});
