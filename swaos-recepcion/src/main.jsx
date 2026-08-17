import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
// 1. Importamos el motor PWA
import { registerSW } from "virtual:pwa-register";

// 2. Activamos la instalación en segundo plano
registerSW({ immediate: true });

// 3. Renderizamos la aplicación una sola vez
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
