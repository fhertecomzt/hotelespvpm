import React, { useState, useEffect } from "react";
import { alertaToast } from "./utils";
import ModalNuevoProducto from "./ModalNuevoProducto";
import ModalMovimiento from "./ModalMovimiento";

// Detecta automáticamente si estás en local o en producción
const API_URL = import.meta.env.DEV
  ? "http://localhost/hotelespvpm/sistema/swaos-api"
  : "/sistema/swaos-api";

export default function InventarioView({ usuarioActual }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");

  const token = localStorage.getItem("swaos_token");

  // 1. BARRERA DE SEGURIDAD (Permisos)
  // Ajusta los roles según como los tengas escritos en tu base de datos
  const esAdministrador =
    usuarioActual?.rol === "Administrador" ||
    usuarioActual?.rol === "Superusuario";
  const tienePermisoInventario =
    usuarioActual?.permisos?.includes("ver_inventario");
  const accesoPermitido = esAdministrador || tienePermisoInventario;
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [movimientoActivo, setMovimientoActivo] = useState(null);

  const cargarInventario = (silencioso = false) => {
    if (!accesoPermitido) return;
    if (!silencioso) setCargando(true);

    fetch(`${API_URL}/obtener_inventario.php`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProductos(data.productos || []);
        } else {
          alertaToast("error", "No se pudo cargar el catálogo.");
        }
        if (!silencioso) setCargando(false);
      })
      .catch((err) => {
        console.error("Error al cargar inventario:", err);
        if (!silencioso) setCargando(false);
      });
  };

  useEffect(() => {
    document.title = "SWAOS | Almacén e Inventario";
    cargarInventario(false);
  }, [accesoPermitido]);

  // Si no tiene permisos, mostramos la pantalla de bloqueo inmediatamente
  if (!accesoPermitido) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 text-center max-w-sm">
          <span className="text-6xl mb-4 block">🚫</span>
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
            Acceso Restringido
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
            Tu nivel de usuario ({usuarioActual?.rol}) no tiene autorización
            para visualizar el almacén.
          </p>
        </div>
      </div>
    );
  }

  // Filtrado inteligente en el cliente
  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_qr && p.codigo_qr.includes(busqueda));
    const coincideCategoria =
      filtroCategoria === "Todos" || p.categoria === filtroCategoria;
    return coincideBusqueda && coincideCategoria;
  });

  const categorias = [
    "Todos",
    "Limpieza",
    "Mantenimiento",
    "Amenidades",
    "Blancos",
    "Otro",
  ];

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABECERA Y CONTROLES */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white">
                📦 Control de Almacén
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Gestión de stock, entradas y salidas de material
              </p>
            </div>
            {esAdministrador && (
              <button
                onClick={() => setMostrarModalNuevo(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all"
              >
                + Nuevo Producto
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-2 border-t border-slate-100 dark:border-slate-700 pt-4">
            <input
              type="text"
              placeholder="🔍 Buscar producto o escanear QR..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold cursor-pointer"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* LISTADO DE PRODUCTOS EN GRID RESPONSIVO */}
        {cargando ? (
          <div className="text-center py-20 text-slate-400 font-bold animate-pulse">
            Cargando catálogo de almacén...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {productosFiltrados.map((prod) => {
              const stock = parseFloat(prod.stock_actual);
              const minimo = parseFloat(prod.stock_minimo);
              const enPeligro = stock <= minimo;
              const sinStock = stock <= 0;

              return (
                <div
                  key={prod.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg">
                      {prod.categoria}
                    </span>
                    {prod.codigo_qr && (
                      <span className="text-lg" title={`QR: ${prod.codigo_qr}`}>
                        🔳
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black leading-tight mb-4">
                    {prod.nombre}
                  </h3>

                  <div className="mt-auto">
                    <div className="flex items-end justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                          En Stock
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-3xl font-black ${sinStock ? "text-red-500" : enPeligro ? "text-amber-500" : "text-emerald-500"}`}
                          >
                            {stock}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {prod.unidad_medida}
                          </span>
                        </div>
                      </div>

                      {/* Botones de acción rápida */}
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setMovimientoActivo({
                              producto: prod,
                              tipo: "Salida",
                            })
                          }
                          className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-2 rounded-xl text-sm transition-colors"
                          title="Registrar Salida"
                        >
                          ➖
                        </button>
                        <button
                          onClick={() =>
                            setMovimientoActivo({
                              producto: prod,
                              tipo: "Entrada",
                            })
                          }
                          className="bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-800/60 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl text-sm transition-colors border border-indigo-200 dark:border-indigo-700/50"
                          title="Registrar Entrada"
                        >
                          ➕
                        </button>
                      </div>
                    </div>

                    {enPeligro && !sinStock && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-2 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded-lg text-center border border-amber-200 dark:border-amber-800/50">
                        ⚠️ Stock mínimo alcanzado ({minimo})
                      </p>
                    )}
                    {sinStock && (
                      <p className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-2 bg-red-50 dark:bg-red-950/30 p-1.5 rounded-lg text-center border border-red-200 dark:border-red-800/50">
                        🚨 Producto Agotado
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* MODAL NUEVO PRODUCTO */}
      {mostrarModalNuevo && (
        <ModalNuevoProducto
          usuarioActual={usuarioActual}
          onClose={() => setMostrarModalNuevo(false)}
          onSuccess={() => cargarInventario(true)}
        />
      )}
      {/* MODAL ENTRADA/SALIDA DE STOCK */}
      {movimientoActivo && (
        <ModalMovimiento
          producto={movimientoActivo.producto}
          tipo={movimientoActivo.tipo}
          usuarioActual={usuarioActual}
          onClose={() => setMovimientoActivo(null)}
          onSuccess={() => cargarInventario(true)}
        />
      )}
    </div>
  );
}
