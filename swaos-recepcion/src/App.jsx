import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "./Login";
import KanbanBoard from "./KanbanBoard";
import CamaristaView from "./CamaristaView";
import GeneradorQR from "./GeneradorQR";
import EscanerQR from "./EscanerQR"; // 1. Importamos el escáner

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null);

  const RutaProtegida = ({ children, rolesPermitidos }) => {
    if (!usuarioActual) return <Navigate to="/" replace />;

    if (rolesPermitidos && !rolesPermitidos.includes(usuarioActual.rol)) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center max-w-sm w-full shadow-2xl">
            <h2 className="text-4xl mb-3">⛔</h2>
            <h3 className="text-red-700 font-black text-lg mb-1">
              Acceso Restringido
            </h3>
            <p className="text-red-600/80 text-sm font-semibold mb-4">
              Tu rol de "{usuarioActual.rol}" no tiene permisos para ver esta
              pantalla.
            </p>
            <button
              onClick={() => setUsuarioActual(null)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      );
    }
    return children;
  };

  return (
    <BrowserRouter>
      <div className="w-full min-h-screen bg-slate-50 relative">
        {/* Barra oscura de sesión activa (Flotante arriba) */}
        {usuarioActual && (
          <div className="bg-slate-900 text-slate-300 px-4 py-2 flex justify-between items-center text-xs font-bold print:hidden sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30">
                {usuarioActual.rol.toUpperCase()}
              </span>
              <span>{usuarioActual.nombre}</span>
            </div>

            <div className="flex items-center gap-4">
              {/* 2. Botón global para abrir la cámara desde cualquier lugar */}
              <Link
                to="/escaner"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md shadow transition-colors flex items-center gap-1.5"
              >
                <span>📷</span> Escanear
              </Link>

              <button
                onClick={() => setUsuarioActual(null)}
                className="hover:text-white transition-colors flex items-center gap-1 ml-2 border-l border-slate-700 pl-4"
              >
                Salir <span>🚪</span>
              </button>
            </div>
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              usuarioActual ? (
                <Navigate
                  to={
                    usuarioActual.rol === "Recepcion"
                      ? "/recepcion"
                      : "/camarista"
                  }
                  replace
                />
              ) : (
                <Login setUsuarioActual={setUsuarioActual} />
              )
            }
          />
          <Route
            path="/recepcion"
            element={
              <RutaProtegida rolesPermitidos={["Recepcion"]}>
                <KanbanBoard />
              </RutaProtegida>
            }
          />
          <Route
            path="/camarista"
            element={
              <RutaProtegida rolesPermitidos={["Camarista"]}>
                <CamaristaView />
              </RutaProtegida>
            }
          />
          <Route
            path="/qrs"
            element={
              <RutaProtegida rolesPermitidos={["Recepcion"]}>
                <GeneradorQR />
              </RutaProtegida>
            }
          />

          {/* 3. Nueva Ruta para el Escáner (Disponible para ambos roles) */}
          <Route
            path="/escaner"
            element={
              <RutaProtegida rolesPermitidos={["Recepcion", "Camarista"]}>
                <EscanerQR />
              </RutaProtegida>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
