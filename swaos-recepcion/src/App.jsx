import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "./Login";
import KanbanBoard from "./KanbanBoard";
import CamaristaView from "./CamaristaView";
import GeneradorQR from "./GeneradorQR";
import EscanerQR from "./EscanerQR";
import MantenimientoView from "./MantenimientoView";
import PanelAdmin from "./PanelAdmin";
import DashboardView from "./DashboardView";
import PrivacidadView from "./PrivacidadView";

function App() {
  const [usuarioActual, setUsuarioActual] = useState(() => {
    const usuarioGuardado = localStorage.getItem("swaos_usuario");
    return usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
  });

  // MOTOR DE TEMA: Lee localStorage o arranca en 'light' por defecto para evitar clics fantasma
  const [tema, setTema] = useState(
    () => localStorage.getItem("swaos_tema") || "light",
  );

  useEffect(() => {
    const root = window.document.documentElement;
    const esOscuro =
      tema === "dark" ||
      (tema === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (esOscuro) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("swaos_tema", tema);
  }, [tema]);

  // Rotación directa que garantiza cambio visual en cada clic: Claro -> Oscuro -> Sistema -> Claro...
  const alternarTema = () => {
    if (tema === "light") {
      setTema("dark");
    } else if (tema === "dark") {
      setTema("system");
    } else {
      setTema("light");
    }
  };

  // DETECTOR GLOBAL DE INTERNET
  const [hayInternet, setHayInternet] = useState(navigator.onLine);

  useEffect(() => {
    const manejarConexion = () => setHayInternet(true);
    const manejarDesconexion = () => setHayInternet(false);

    window.addEventListener("online", manejarConexion);
    window.addEventListener("offline", manejarDesconexion);

    // Limpieza del efecto
    return () => {
      window.removeEventListener("online", manejarConexion);
      window.removeEventListener("offline", manejarDesconexion);
    };
  }, []);

  // Agregamos "permisosPermitidos" a las propiedades
  const RutaProtegida = ({ children, rolesPermitidos, permisosPermitidos }) => {
    if (!usuarioActual) return <Navigate to="/" replace />;

    // Verificamos si tiene el rol
    const tieneRol =
      rolesPermitidos && rolesPermitidos.includes(usuarioActual.rol);

    // Verificamos si tiene al menos UN permiso que coincida con los solicitados
    const tienePermiso =
      permisosPermitidos &&
      usuarioActual.permisos &&
      usuarioActual.permisos.some((p) => permisosPermitidos.includes(p));

    // Si no tiene ni el rol ni el permiso especial, lo bloqueamos
    if (!tieneRol && !tienePermiso) {
      return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors">
          <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl text-center max-w-sm w-full shadow-2xl">
            <h2 className="text-4xl mb-3">⛔</h2>
            <h3 className="text-red-600 dark:text-red-400 font-black text-lg mb-1">
              Acceso Restringido
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold mb-4">
              Tu nivel de acceso no tiene permisos para ver esta pantalla.
            </p>
            <button
              onClick={() => {
                setUsuarioActual(null);
                localStorage.removeItem("swaos_usuario");
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      );
    }
    return children;
  };

  const getNombreCompleto = (u) => {
    if (!u) return "";
    return `${u.nombre} ${u.primer_apellido || ""} `.trim();
  };

return (
  <BrowserRouter>
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#131620] text-slate-800 dark:text-slate-100 relative transition-colors duration-300">
      {/* NUEVA BARRA SUPERIOR MÓVIL (Basada en el boceto) */}
      {usuarioActual && (
        <div className="bg-slate-900 dark:bg-[#1a1e2d] text-white p-3 sticky top-0 z-50 shadow-md border-b border-slate-800 flex justify-between items-center print:hidden">
          {/* Lado Izquierdo: Foto y Datos Dinámicos */}
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-10 h-10 shrink-0 rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-500 overflow-hidden">
              <span className="text-xl">👩‍💼</span>
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-bold text-[13px] leading-tight text-white truncate max-w-[130px] sm:max-w-[200px]">
                {getNombreCompleto(usuarioActual)}
              </span>
              <span className="text-[10px] text-indigo-300 dark:text-slate-400 tracking-wide uppercase mt-0.5 truncate">
                {usuarioActual.rol}
              </span>
            </div>
          </div>

          {/* Lado Derecho: Los Botones de Acción Intactos */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 1. Botón Tema (Conserva tu función alternarTema) */}
            <button
              onClick={alternarTema}
              title="Cambiar apariencia visual"
              className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors shrink-0"
            >
              <span className="text-sm">
                {tema === "light" ? "☀️" : tema === "dark" ? "🌙" : "💻"}
              </span>
            </button>

            {/* 2. Botón Inicio */}
            <Link
              to="/"
              title="Inicio"
              className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors shrink-0"
            >
              <span className="text-sm">🏠</span>
            </Link>

            {/* 3. Botón Admin (Conserva tu lógica de seguridad) */}
            {(usuarioActual.rol === "Administrador" ||
              usuarioActual.rol === "Superusuario" ||
              (usuarioActual.permisos &&
                usuarioActual.permisos.length > 0)) && (
              <Link
                to="/admin"
                title="Administración"
                className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg border border-indigo-500/40 transition-colors shrink-0"
              >
                <span className="text-sm">⚙️</span>
              </Link>
            )}

            {/* 4. Botón Cámara (Conserva tu lógica de ocultar a Recepción) */}
            {usuarioActual.rol !== "Recepcion" && (
              <Link
                to="/escaner"
                title="Escanear"
                className="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 rounded-lg border border-indigo-500 shadow-sm transition-colors shrink-0"
              >
                <span className="text-sm">📷</span>
              </Link>
            )}

            {/* 5. Botón Puerta (Salir y limpiar sesión) */}
            <button
              onClick={() => {
                setUsuarioActual(null);
                localStorage.removeItem("swaos_usuario");
              }}
              title="Salir del sistema"
              className="w-8 h-8 flex items-center justify-center hover:bg-red-950/40 rounded-lg transition-colors shrink-0 ml-0.5"
            >
              <span className="text-lg">🚪</span>
            </button>
          </div>
        </div>
      )}

      {/* BARRA DE ALERTA DE CONEXIÓN */}
      {!hayInternet && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-black flex justify-center items-center gap-2 sticky top-0 z-[60] shadow-md animate-pulse">
          <span>⚡</span>
          Atención: Sin conexión a Internet. Acércate a una zona con señal para
          continuar.
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={
            usuarioActual ? (
              <Navigate
                to={
                  usuarioActual.rol === "Administrador" ||
                  usuarioActual.rol === "Superusuario"
                    ? "/dashboard"
                    : usuarioActual.rol === "Mantenimiento"
                      ? "/mantenimiento"
                      : usuarioActual.rol === "Camarista"
                        ? "/camarista"
                        : "/recepcion"
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
            <RutaProtegida
              rolesPermitidos={[
                "Recepcion",
                "Ama de Llaves",
                "Administrador",
                "Superusuario",
              ]}
            >
              <KanbanBoard usuarioActual={usuarioActual} />
            </RutaProtegida>
          }
        />
        <Route
          path="/camarista"
          element={
            <RutaProtegida rolesPermitidos={["Camarista"]}>
              <CamaristaView usuarioActual={usuarioActual} />
            </RutaProtegida>
          }
        />
        <Route
          path="/mantenimiento"
          element={
            <RutaProtegida
              rolesPermitidos={[
                "Mantenimiento",
                "Administrador",
                "Superusuario",
              ]}
            >
              <MantenimientoView usuarioActual={usuarioActual} />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin"
          element={
            <RutaProtegida
              rolesPermitidos={["Administrador", "Superusuario"]}
              permisosPermitidos={[
                "crear_empleado",
                "gestionar_hoteles",
                "gestionar_zonas",
                "gestionar_habitaciones",
              ]}
            >
              <PanelAdmin usuarioActual={usuarioActual} />
            </RutaProtegida>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RutaProtegida rolesPermitidos={["Administrador", "Superusuario"]}>
              <DashboardView usuarioActual={usuarioActual} />
            </RutaProtegida>
          }
        />
        <Route
          path="/qrs"
          element={
            <RutaProtegida
              rolesPermitidos={[
                "Ama de Llaves",
                "Administrador",
                "Superusuario",
              ]}
            >
              <GeneradorQR />
            </RutaProtegida>
          }
        />
        <Route
          path="/escaner"
          element={
            <RutaProtegida
              rolesPermitidos={[
                "Camarista",
                "Ama de Llaves",
                "Mantenimiento",
                "Administrador",
                "Superusuario",
              ]}
            >
              <EscanerQR usuarioActual={usuarioActual} />
            </RutaProtegida>
          }
        />
        <Route path="/privacidad" element={<PrivacidadView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  </BrowserRouter>
);
}

export default App;
