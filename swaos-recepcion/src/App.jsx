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

  // 🔴 Agregamos "permisosPermitidos" a las propiedades
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
    return `${u.nombre} ${u.primer_apellido || ""} ${u.segundo_apellido || ""}`.trim();
  };

  return (
    <BrowserRouter>
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 relative transition-colors duration-300">
        {/* BARRA SUPERIOR DE SESIÓN Y TEMA */}
        {usuarioActual && (
          <div className="bg-slate-900 dark:bg-slate-950 text-slate-300 px-4 py-2.5 flex justify-between items-center text-xs font-bold print:hidden sticky top-0 z-50 shadow-md border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded border border-indigo-500/30 uppercase tracking-wider font-black">
                {usuarioActual.rol}
              </span>
              <span className="text-white text-sm font-extrabold">
                {getNombreCompleto(usuarioActual)}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* ESTE BOTÓN DEBE ESTAR AL INICIO DEL MENÚ DE ACCIONES PARA QUE TODOS LO VEAN */}
              <button
                onClick={alternarTema}
                title="Cambiar apariencia visual"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg shadow transition-all flex items-center gap-1.5 font-extrabold text-[11px]"
              >
                {tema === "light" && (
                  <>
                    <span>☀️</span>{" "}
                    <span className="hidden sm:inline">Claro</span>
                  </>
                )}
                {tema === "dark" && (
                  <>
                    <span>🌙</span>{" "}
                    <span className="hidden sm:inline">Oscuro</span>
                  </>
                )}
                {tema === "system" && (
                  <>
                    <span>💻</span>{" "}
                    <span className="hidden sm:inline">Sistema</span>
                  </>
                )}
              </button>

              {/* BOTÓN DE DASHBOARD: SOLO ADMIN Y SUPERUSUARIO */}

                <Link
                  to="/"
                  title="Volver a mi panel principal"
                  className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-lg shadow transition-colors flex items-center gap-1 font-bold"
                >
                  <span>🏠</span>{" "}
                  <span className="hidden sm:inline">Inicio</span>
                </Link>
            
              {/* BOTÓN DE ADMINISTRACIÓN: ADMIN, SUPERUSUARIO O PERSONAL CON PERMISOS ESPECIALES */}
              {(usuarioActual.rol === "Administrador" ||
                usuarioActual.rol === "Superusuario" ||
                (usuarioActual.permisos &&
                  usuarioActual.permisos.length > 0)) && (
                <Link
                  to="/admin"
                  className="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 px-3 py-1.5 rounded-lg shadow transition-colors flex items-center gap-1 font-bold"
                >
                  <span>⚙️</span>{" "}
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}

              {/* BOTÓN DE ESCANEAR: OCULTO PARA RECEPCIÓN */}
              {usuarioActual.rol !== "Recepcion" && (
                <Link
                  to="/escaner"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg shadow transition-colors flex items-center gap-1 font-bold"
                >
                  <span>📷</span>{" "}
                  <span className="hidden sm:inline">Escanear</span>
                </Link>
              )}

              <button
                onClick={() => {
                  setUsuarioActual(null);
                  localStorage.removeItem("swaos_usuario"); // Borra la sesión física
                }}
                className="hover:text-red-400 text-slate-400 transition-colors flex items-center gap-1 ml-1 border-l border-slate-800 pl-3"
              >
                <span>🚪</span> <span className="hidden md:inline">Salir</span>
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
              <RutaProtegida
                rolesPermitidos={["Administrador", "Superusuario"]}
              >
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
