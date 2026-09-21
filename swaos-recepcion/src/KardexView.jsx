import React, { useState, useEffect } from "react";
// Opcional: Si usas alertas, impórtalas. Si no, puedes quitar esta línea.
// import { alertaToast } from "./utils";
import { Link } from "react-router-dom";
import ModalExportarKardex from "./ModalExportarKardex";

const API_URL = import.meta.env.DEV
  ? "http://localhost/hotelespvpm/sistema/swaos-api"
  : "/sistema/swaos-api";

export default function KardexView({ usuarioActual }) {
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroHotel, setFiltroHotel] = useState("Todos");
  const [hoteles, setHoteles] = useState([]);

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 7;

  const token = localStorage.getItem("swaos_token");

  // BARRERA DE SEGURIDAD
  const esAdministrador =
    usuarioActual?.rol === "Administrador" ||
    usuarioActual?.rol === "Superusuario";
  const esGestorAlmacen =
    esAdministrador || usuarioActual?.rol === "Almacenista";
  const tienePermisoInventario =
    usuarioActual?.permisos?.includes("ver_inventario");
  const accesoPermitido = esGestorAlmacen || tienePermisoInventario;

  // Cargar Hoteles (Solo gestores)
  useEffect(() => {
    if (esGestorAlmacen) {
      fetch(`${API_URL}/gestion_inventario.php?accion=leer_todo&hotel_id=0`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setHoteles(data.hoteles || []);
        })
        .catch((err) => console.error("Error al cargar hoteles:", err));
    }
  }, [esGestorAlmacen, token]);

  // Cargar Movimientos (Kardex)
  useEffect(() => {
    if (!accesoPermitido) return;
    setCargando(true);

    // Si no es gestor global, forzamos la carga solo de su hotel
    const paramHotel = esGestorAlmacen
      ? ""
      : `?hotel_id=${usuarioActual.hotel_id}`;

    fetch(`${API_URL}/obtener_kardex.php${paramHotel}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMovimientos(data.movimientos || []);
        }
        setCargando(false);
      })
      .catch((err) => {
        console.error("Error al cargar kardex:", err);
        setCargando(false);
      });
  }, [accesoPermitido, esGestorAlmacen, usuarioActual]);

  // Resetear paginación al filtrar
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroHotel]);

  if (!accesoPermitido) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 text-center max-w-sm">
          <span className="text-6xl mb-4 block">🚫</span>
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
            Acceso Restringido
          </h2>
          <p className="text-sm text-slate-500 font-semibold">
            No tienes autorización para ver la auditoría del almacén.
          </p>
        </div>
      </div>
    );
  }

  // Lógica de Filtrado
  const movimientosFiltrados = movimientos.filter((m) => {
    const textoBusqueda = busqueda.toLowerCase();
    const coincideBusqueda =
      m.producto_nombre?.toLowerCase().includes(textoBusqueda) ||
      m.usuario_nombre?.toLowerCase().includes(textoBusqueda) ||
      m.motivo?.toLowerCase().includes(textoBusqueda);

    const coincideHotel =
      filtroHotel === "Todos" || Number(m.hotel_id) === Number(filtroHotel);

    return coincideBusqueda && coincideHotel;
  });

  // Lógica de Paginación
  const indiceUltimo = paginaActual * elementosPorPagina;
  const indicePrimer = indiceUltimo - elementosPorPagina;
  const movimientosPaginados = movimientosFiltrados.slice(
    indicePrimer,
    indiceUltimo,
  );
  const totalPaginas = Math.ceil(
    movimientosFiltrados.length / elementosPorPagina,
  );

  // Helper: Formato de fecha
  const formatearFecha = (fechaString) => {
    const opciones = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(fechaString).toLocaleDateString("es-MX", opciones);
  };

  // Helper: Nombre de hotel
  const getNombreHotel = (id) => {
    const h = hoteles.find((item) => Number(item.id) === Number(id));
    return h ? h.alias || h.nombre : `Hotel ${id}`;
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABECERA */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
          <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white">
                📋 Kardex Histórico
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Auditoría y bitácora inmutable de movimientos de almacén
              </p>
            </div>

            {/* NUEVO: Botón para regresar al inventario */}
            <div className="flex shrink-0">
              <Link
                to="/inventario"
                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
              >
                ← Volver al Almacén
              </Link>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-2 border-t border-slate-100 dark:border-slate-700 pt-4">
            {esGestorAlmacen && (
              <select
                value={filtroHotel}
                onChange={(e) => setFiltroHotel(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold cursor-pointer md:w-56"
              >
                <option value="Todos">🏢 Todos los Hoteles</option>
                {hoteles.map((h) => (
                  <option key={h.id} value={h.id}>
                    🏨 {h.alias || h.nombre}
                  </option>
                ))}
              </select>
            )}

            <div className="flex-1 flex gap-2">
              <input
                type="search"
                placeholder="🔍 Buscar por producto, usuario o motivo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={() => setMostrarModalExportar(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all whitespace-nowrap flex items-center gap-2"
              >
                🖨️ Exportar
              </button>
            </div>
          </div>
        </div>

        {/* TABLA DE KARDEX */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4">Fecha y Hora</th>
                  {esGestorAlmacen && <th className="p-4">Hotel</th>}
                  <th className="p-4">Producto</th>
                  <th className="p-4 text-center">Tipo</th>
                  <th className="p-4 text-center">Cantidad</th>
                  <th className="p-4">Stock Resultante</th>
                  <th className="p-4">Usuario</th>
                  <th className="p-4">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {cargando ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400">
                      Cargando bitácora...
                    </td>
                  </tr>
                ) : movimientosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400">
                      No hay movimientos registrados.
                    </td>
                  </tr>
                ) : (
                  movimientosPaginados.map((mov) => {
                    const esEntrada =
                      mov.tipo_movimiento === "Entrada" ||
                      mov.tipo_movimiento === "Ajuste";

                    return (
                      <tr
                        key={mov.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="p-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {formatearFecha(mov.fecha_movimiento)}
                        </td>

                        {esGestorAlmacen && (
                          <td className="p-4">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50 px-2 py-1 rounded-lg whitespace-nowrap">
                              {getNombreHotel(mov.hotel_id)}
                            </span>
                          </td>
                        )}

                        <td className="p-4 font-bold text-slate-800 dark:text-white">
                          {mov.producto_nombre}
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${esEntrada ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                          >
                            {mov.tipo_movimiento}
                          </span>
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`text-base font-black ${esEntrada ? "text-emerald-500" : "text-rose-500"}`}
                          >
                            {esEntrada ? "+" : "-"}
                            {parseFloat(mov.cantidad)}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-400 line-through mr-1">
                              {parseFloat(mov.stock_anterior)}
                            </span>
                            <span>→</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {parseFloat(mov.stock_nuevo)}
                            </span>
                          </div>
                        </td>

                        <td className="p-4 text-xs text-slate-500">
                          {mov.usuario_nombre || "Sistema"}
                        </td>

                        <td
                          className="p-4 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate"
                          title={mov.motivo}
                        >
                          {mov.motivo || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6 mb-2">
            <button
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 shadow-sm transition-all font-bold text-sm"
            >
              ← Anterior
            </button>
            <span className="text-sm font-black text-slate-500 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() =>
                setPaginaActual((p) => Math.min(totalPaginas, p + 1))
              }
              disabled={paginaActual === totalPaginas}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 shadow-sm transition-all font-bold text-sm"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* MODAL DE EXPORTACIÓN */}
        {mostrarModalExportar && (
          <ModalExportarKardex
            movimientos={movimientos}
            hoteles={hoteles}
            filtroHotelActual={filtroHotel}
            esGestorAlmacen={esGestorAlmacen}
            onClose={() => setMostrarModalExportar(false)}
          />
        )}
        
      </div>
    </div>
  );
}