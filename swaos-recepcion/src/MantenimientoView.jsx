import React, { useState, useEffect, useRef } from "react";
import { alertaToast, comprimirImagen } from "./utils";
import ModalAtender from "./ModalAtender";
import { Link } from "react-router-dom";
import ModalExportarMantenimiento from "./ModalExportarMantenimiento";

const API_URL = "/sistema/swaos-api";

export default function MantenimientoView({ usuarioActual }) {
  const [reportes, setReportes] = useState([]);
  const [hotelesLista, setHotelesLista] = useState([]);
  const [cargando, setCargando] = useState(true);

  // ESTADOS DE VISTA Y PAGINACIÓN
  const [modoVista, setModoVista] = useState(() =>
    window.innerWidth >= 1024 ? "tabla" : "tarjetas",
  );
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 12;

  // ESTADOS DE LA BARRA DE FILTROS PRINCIPAL
  const [filtroHotel, setFiltroHotel] = useState("0");
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [filtroEstatus, setFiltroEstatus] = useState("Pendiente");

  // ESTADOS PARA MODALES DE OPERACIÓN
  const [reporteVistaDetalle, setReporteVistaDetalle] = useState(null);
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [notasResolucion, setNotasResolucion] = useState("");
  const [fotoResolucion, setFotoResolucion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [reporteAAtender, setReporteAAtender] = useState(null);

  // --- ESTADOS PARA EL MODAL DE EXPORTACIÓN ---
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false);
  const [expHotel, setExpHotel] = useState("0");
  const [expEstatus, setExpEstatus] = useState("Todos");
  const [expEmpleado, setExpEmpleado] = useState("Todos");

  // Por defecto, sugerimos del día 1 del mes actual hasta hoy
  const hoy = new Date().toISOString().split("T")[0];
  const primerDiaMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];
  const [expFechaInicio, setExpFechaInicio] = useState(primerDiaMes);
  const [expFechaFin, setExpFechaFin] = useState(hoy);

  const token = localStorage.getItem("swaos_token");

  // SISTEMA DE ALERTAS
  const prevAlertasRef = useRef(null);
  const audioRef = useRef(new Audio("/alerta.mp3"));
  const [totalAlertas, setTotalAlertas] = useState(0);

  // Pedir permiso de notificaciones Push al abrir la pantalla
  useEffect(() => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch (error) {
      console.warn(
        "El navegador móvil no soporta petición nativa de notificaciones.",
      );
    }
  }, []);

  useEffect(() => {
    const pendientes = reportes.filter((r) => r.estatus === "Pendiente").length;
    const enReparacion = reportes.filter(
      (r) => r.estatus === "En Reparación",
    ).length;
    const totalRequierenAtencion = pendientes + enReparacion;

    setTotalAlertas(totalRequierenAtencion);

    if (
      prevAlertasRef.current !== null &&
      totalRequierenAtencion > prevAlertasRef.current
    ) {
      // 1. Lanzamos el sonido (Atrapando bloqueos de autoplay)
      audioRef.current
        .play()
        .catch((e) => console.log("Sonido en espera de interacción"));

      // 2. Lanzamos la notificación envuelta en Try/Catch para salvar móviles
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("SWAOS | Mantenimiento", {
            body: `⚠️ Tienes ${pendientes} reportes nuevos y ${enReparacion} en reparación por revisar.`,
            icon: "/icono-manto.ico",
          });
        }
      } catch (error) {
        console.warn(
          "Notificaciones Push no soportadas nativamente en este dispositivo móvil.",
        );
      }
    }
    prevAlertasRef.current = totalRequierenAtencion;
  }, [reportes]);

  const cargarReportes = (silencioso = false) => {
    if (!silencioso) setCargando(true);
    fetch(`${API_URL}/obtener_reportes_mantenimiento.php`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReportes(data.reportes || []);
          if (data.hoteles_lista) setHotelesLista(data.hoteles_lista);
        }
        if (!silencioso) setCargando(false);
      })
      .catch((err) => {
        if (!silencioso) setCargando(false);
      });
  };

  useEffect(() => {
    document.title = "SWAOS | Mantenimiento";
    cargarReportes(false);
    const intervalo = setInterval(() => cargarReportes(true), 10000);
    const handleResize = () =>
      setModoVista(window.innerWidth >= 1024 ? "tabla" : "tarjetas");
    window.addEventListener("resize", handleResize);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroHotel, busqueda, filtroCategoria, filtroEstatus]);

  const getHotelAlias = (id, aliasBackend) => {
    if (aliasBackend) return aliasBackend;
    const h = hotelesLista.find((item) => Number(item.id) === Number(id));
    return h ? h.alias || h.nombre : `Hotel ${id}`;
  };

  const getImageUrl = (url) => {
    if (!url || typeof url !== "string" || url.trim() === "") return null;
    const rutaLimpia = url.trim();
    if (rutaLimpia.startsWith("http") || rutaLimpia.startsWith("data:image"))
      return rutaLimpia;

    let rutaSinDiagonal = rutaLimpia.replace(/^\/+/, "");
    if (!rutaSinDiagonal.includes("/")) {
      if (
        rutaSinDiagonal.startsWith("dano_") ||
        rutaSinDiagonal.startsWith("res_")
      ) {
        rutaSinDiagonal = `evidencias_danos/${rutaSinDiagonal}`;
      } else {
        rutaSinDiagonal = `evidencias/${rutaSinDiagonal}`;
      }
    }
    return `${API_URL}/${rutaSinDiagonal}`;
  };

  // Extraer lista única de técnicos que han resuelto o atendido tickets para el selector
  const tecnicosUnicos = Array.from(
    new Set(
      reportes
        .filter((r) => r.res_nombre)
        .map((r) => `${r.res_nombre} ${r.res_apellido || ""}`.trim()),
    ),
  );

  // ABRIR MODAL DE EXPORTACIÓN (Heredando filtros actuales)
  const abrirModalExportacion = () => {
    setExpHotel(filtroHotel);
    setExpEstatus(filtroEstatus === "Todos" ? "Todos" : filtroEstatus);
    setExpEmpleado("Todos");
    setMostrarModalExportar(true);
  };

  // CÁLCULO EN TIEMPO REAL DE MOVIMIENTOS A EXPORTAR
  const reportesAExportar = reportes.filter((r) => {
    const matchHotel =
      expHotel === "0" || Number(r.hotel_id) === Number(expHotel);
    const matchEstatus = expEstatus === "Todos" || r.estatus === expEstatus;
    const nombreTecnico =
      `${r.res_nombre || ""} ${r.res_apellido || ""}`.trim();
    const matchEmpleado =
      expEmpleado === "Todos" || nombreTecnico === expEmpleado;

    const fechaBase = r.fecha_resolucion
      ? r.fecha_resolucion.split(" ")[0]
      : r.fecha_reporte
        ? r.fecha_reporte.split(" ")[0]
        : "";
    const matchFecha =
      (!expFechaInicio || fechaBase >= expFechaInicio) &&
      (!expFechaFin || fechaBase <= expFechaFin);

    return matchHotel && matchEstatus && matchEmpleado && matchFecha;
  });

  const confirmarResolucion = async () => {
    if (!reporteSeleccionado) return;
    if (!navigator.onLine) return alertaToast("error", "⚡ Sin conexión.");
    setGuardando(true);
    try {
      const formData = new FormData();
      formData.append("reporte_id", reporteSeleccionado.id);
      formData.append("estatus", "Resuelto");
      formData.append("notas_resolucion", notasResolucion);
      formData.append("resuelto_por", usuarioActual?.id || 1);

      if (fotoResolucion) {
        const blobComprimido = await comprimirImagen(fotoResolucion);
        formData.append(
          "foto_resolucion",
          blobComprimido,
          `res_${reporteSeleccionado.id}.webp`,
        );
      }

      const res = await fetch(`${API_URL}/actualizar_estatus_dano.php`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const respuesta = await res.json();
      setGuardando(false);
      if (respuesta.success) {
        alertaToast("success", "¡Incidencia resuelta con evidencia!");
        setReporteSeleccionado(null);
        setReporteVistaDetalle(null);
        setFotoResolucion(null);
        cargarReportes();
      } else {
        alertaToast("error", respuesta.message || "Error");
      }
    } catch (err) {
      setGuardando(false);
      alertaToast("error", "Fallo de conexión");
    }
  };

  // LÓGICA DE FILTRADO PRINCIPAL DE LA VISTA
  const reportesFiltrados = reportes.filter((r) => {
    const coincideHotel =
      filtroHotel === "0" || Number(r.hotel_id) === Number(filtroHotel);
    const coincideEstatus =
      filtroEstatus === "Todos" || r.estatus === filtroEstatus;
    const catFalla = r.categoria || "Gral";
    const coincideCategoria =
      filtroCategoria === "Todas" || catFalla === filtroCategoria;
    const busquedaMinuscula = busqueda.toLowerCase();
    const coincideBusqueda =
      (r.habitacion_numero?.toString() || "").includes(busquedaMinuscula) ||
      (r.descripcion || "").toLowerCase().includes(busquedaMinuscula);

    return (
      coincideHotel && coincideEstatus && coincideCategoria && coincideBusqueda
    );
  });

  const indiceUltimo = paginaActual * elementosPorPagina;
  const indicePrimer = indiceUltimo - elementosPorPagina;
  const reportesPaginados = reportesFiltrados.slice(indicePrimer, indiceUltimo);
  const totalPaginas = Math.ceil(reportesFiltrados.length / elementosPorPagina);
  const categoriasUnicas = [
    "Todas",
    ...new Set(reportes.map((r) => r.categoria || "Gral")),
  ];

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABECERA PRINCIPAL */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                🛠️ Panel de Mantenimiento e Incidencias
              </h1>
              <span
                className="flex h-3 w-3 relative"
                title="Sincronización en vivo cada 10 segundos"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Control y resolución de reportes de fallas físicas emitidos por
              Recepción y Ama de Llaves.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end items-center">
            {/* CAMPANITA DE NOTIFICACIONES */}
            <div
              className="relative flex items-center justify-center w-10 h-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 mr-2"
              title="Reportes Pendientes o En Reparación"
            >
              <span
                className={`text-lg ${totalAlertas > 0 ? "animate-pulse" : "opacity-50"}`}
              >
                🔔
              </span>
              {totalAlertas > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
                  {totalAlertas}
                </span>
              )}
            </div>

            {/* NUEVO BOTÓN: EXPORTAR */}
            <button
              onClick={abrirModalExportacion}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2"
            >
              📥 Exportar
            </button>

            <Link
              to="/preventivo"
              className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
            >
              📅 Plan Preventivo
            </Link>

            <button
              onClick={() =>
                setModoVista(modoVista === "tabla" ? "tarjetas" : "tabla")
              }
              className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
            >
              {modoVista === "tabla" ? "📱 Tarjetas" : "📄 Tabla"}
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS ESTANDARIZADA */}
        <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-2 transition-colors">
          <div className="flex-shrink-0 lg:w-40">
            <select
              value={filtroHotel}
              onChange={(e) => setFiltroHotel(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-slate-800 dark:text-white"
            >
              <option value="0">🏢 Todos (Hoteles)</option>
              {hotelesLista?.map((h) => (
                <option key={h.id} value={h.id}>
                  🏨 {h.alias || h.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Buscar por cuarto o falla..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 pl-9 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
            />
          </div>
          <div className="flex-shrink-0 lg:w-44">
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-slate-800 dark:text-white"
            >
              {categoriasUnicas.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "Todas" ? "🏷️ Todas (Categorías)" : cat}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-shrink-0 lg:w-40">
            <select
              value={filtroEstatus}
              onChange={(e) => setFiltroEstatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-slate-800 dark:text-white"
            >
              <option value="Todos">⏳ Todos (Estatus)</option>
              <option value="Pendiente">🚨 Pendiente</option>
              <option value="En Reparación">🔧 En Reparación</option>
              <option value="Resuelto">✅ Resuelto</option>
            </select>
          </div>
        </div>

        {/* LISTADO DE REPORTES */}
        {cargando && reportes.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold animate-pulse">
            Sincronizando reportes...
          </div>
        ) : reportesFiltrados.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold">
            No hay reportes que coincidan con estos filtros.
          </div>
        ) : (
          <>
            {modoVista === "tabla" ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <th className="p-4">Habitación</th>
                        <th className="p-4">Hotel</th>
                        <th className="p-4">Categoría</th>
                        <th className="p-4">Falla Reportada</th>
                        <th className="p-4">Estatus</th>
                        <th className="p-4">Fecha</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {reportesPaginados.map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="p-4 font-black text-slate-800 dark:text-white text-lg">
                            🚪 {r.habitacion_numero}
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50 px-2 py-1 rounded-lg">
                              {getHotelAlias(r.hotel_id, r.hotel_alias)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg">
                              {r.categoria || "Gral"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div
                              className="text-xs max-w-xs truncate"
                              title={r.descripcion}
                            >
                              {r.descripcion}
                            </div>
                            {r.rep_nombre && (
                              <div className="text-[9px] text-slate-400 mt-0.5 font-semibold">
                                👤 Por: {r.rep_nombre} {r.rep_apellido || ""}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${r.estatus === "Pendiente" ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50" : r.estatus === "En Reparación" ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50" : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50"}`}
                            >
                              {r.estatus}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-500 font-mono">
                            {r.fecha_reporte
                              ? r.fecha_reporte.substring(0, 10)
                              : "Reciente"}
                          </td>
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => setReporteVistaDetalle(r)}
                              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm border border-slate-200 dark:border-slate-600"
                            >
                              👁️ Ver Detalles
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {reportesPaginados.map((r) => (
                  <div
                    key={r.id}
                    className={`bg-white dark:bg-slate-800 rounded-3xl p-5 border shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${r.estatus === "Pendiente" ? "border-red-300 bg-gradient-to-b from-red-50/30 to-white dark:from-red-950/10 dark:to-slate-800" : r.estatus === "En Reparación" ? "border-amber-300 bg-gradient-to-b from-amber-50/30 to-white dark:from-amber-950/10 dark:to-slate-800" : "border-slate-200 dark:border-slate-700 opacity-80"}`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div>
                          <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/40 text-[11px] block w-fit mb-1">
                            🏨 {getHotelAlias(r.hotel_id, r.hotel_alias)}
                          </span>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                            <span>🚪</span> Hab. {r.habitacion_numero}
                          </h3>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${r.estatus === "Pendiente" ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50" : r.estatus === "En Reparación" ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50" : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50"}`}
                        >
                          ● {r.estatus}
                        </span>
                      </div>
                      <div className="space-y-2 my-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                          <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[11px]">
                            Categoría:
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                            {r.categoria || "Gral"}
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                          "{r.descripcion}"
                        </div>
                        {(getImageUrl(r.foto_url) ||
                          getImageUrl(r.foto_resolucion_url) ||
                          r.diagnostico ||
                          r.notas_resolucion) && (
                          <button
                            onClick={() => setReporteVistaDetalle(r)}
                            className="w-full mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/50 hover:bg-indigo-100 transition-colors"
                          >
                            👁️ Ver Fotografías y Diagnóstico
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2 mt-2">
                      <div className="text-[10px] text-slate-400 font-semibold">
                        <div>
                          📅{" "}
                          {r.fecha_reporte
                            ? r.fecha_reporte.substring(0, 16)
                            : "Reciente"}
                        </div>
                        {r.rep_nombre && (
                          <div>
                            👤 Por: {r.rep_nombre} {r.rep_apellido || ""}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {r.estatus === "Pendiente" && (
                          <button
                            onClick={() => setReporteAAtender(r.id)}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-3 rounded-lg text-sm flex gap-1 items-center shadow-sm"
                          >
                            🔧 Atender
                          </button>
                        )}
                        {(r.estatus === "Pendiente" ||
                          r.estatus === "En Reparación") && (
                          <button
                            onClick={() => {
                              setReporteSeleccionado(r);
                              setNotasResolucion(r.notas_resolucion || "");
                              setFotoResolucion(null);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                          >
                            <span>✅</span> Resolver
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6 mb-2">
            <button
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-bold text-sm disabled:opacity-50"
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
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 font-bold text-sm disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* --- NUEVO MODAL DE EXPORTACIÓN EXTERNO --- */}
      {mostrarModalExportar && (
        <ModalExportarMantenimiento
          reportes={reportes}
          hoteles={hotelesLista}
          filtroHotelActual={filtroHotel}
          filtroEstatusActual={filtroEstatus}
          filtroBusquedaActual={busqueda}
          tecnicosUnicos={tecnicosUnicos}
          onClose={() => setMostrarModalExportar(false)}
        />
      )}

      {/* MODAL VISTA DE DETALLES */}
      {reporteVistaDetalle && (
        <div
          onClick={() => setReporteVistaDetalle(null)}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span>📋</span> Detalle - Hab.{" "}
                {reporteVistaDetalle.habitacion_numero}
              </h3>
              <button
                onClick={() => setReporteVistaDetalle(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-start bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">
                    Estatus
                  </span>
                  <span
                    className={`font-black ${reporteVistaDetalle.estatus === "Pendiente" ? "text-red-500" : reporteVistaDetalle.estatus === "En Reparación" ? "text-amber-500" : "text-emerald-500"}`}
                  >
                    {reporteVistaDetalle.estatus}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">
                    Reportado el
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                    {reporteVistaDetalle.fecha_reporte}
                  </span>
                  {reporteVistaDetalle.rep_nombre && (
                    <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                      👤 Por: {reporteVistaDetalle.rep_nombre}{" "}
                      {reporteVistaDetalle.rep_apellido || ""}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Descripción:
                </span>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 text-sm font-medium text-slate-800 dark:text-slate-200">
                  "{reporteVistaDetalle.descripcion}"
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {getImageUrl(reporteVistaDetalle.foto_url) && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                      📸 El Antes:
                    </span>
                    <a
                      href={getImageUrl(reporteVistaDetalle.foto_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={getImageUrl(reporteVistaDetalle.foto_url)}
                        alt="Antes"
                        className="w-full h-40 object-cover bg-slate-100 rounded-xl"
                      />
                    </a>
                  </div>
                )}
                {getImageUrl(reporteVistaDetalle.foto_resolucion_url) && (
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 block mb-1 uppercase tracking-wider">
                      🛠️ El Después:
                    </span>
                    <a
                      href={getImageUrl(
                        reporteVistaDetalle.foto_resolucion_url,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={getImageUrl(
                          reporteVistaDetalle.foto_resolucion_url,
                        )}
                        alt="Después"
                        className="w-full h-40 object-cover bg-slate-100 rounded-xl"
                      />
                    </a>
                  </div>
                )}
              </div>

              {reporteVistaDetalle.diagnostico && (
                <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/40 text-sm text-amber-800 dark:text-amber-300">
                  <div className="flex justify-between items-start mb-2 border-b border-amber-200/50 dark:border-amber-800/50 pb-2">
                    <span className="font-bold block text-[10px] uppercase">
                      🔍 Diagnóstico:
                    </span>
                    <div className="text-right">
                      {reporteVistaDetalle.res_nombre && (
                        <span className="text-[10px] font-bold opacity-90 block">
                          👤 {reporteVistaDetalle.res_nombre}{" "}
                          {reporteVistaDetalle.res_apellido || ""}
                        </span>
                      )}
                      {reporteVistaDetalle.fecha_diagnostico && (
                        <span className="text-[9px] opacity-75 font-mono block mt-0.5">
                          🗓️ {reporteVistaDetalle.fecha_diagnostico}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-1">{reporteVistaDetalle.diagnostico}</div>
                </div>
              )}

              {reporteVistaDetalle.notas_resolucion && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-sm text-emerald-800 dark:text-emerald-300">
                  <div className="flex justify-between items-start mb-2 border-b border-emerald-200/50 dark:border-emerald-800/50 pb-2">
                    <span className="font-bold block text-[10px] uppercase">
                      📝 Resolución:
                    </span>
                    <div className="text-right">
                      {reporteVistaDetalle.res_nombre && (
                        <span className="text-[10px] font-bold opacity-90 block">
                          👤 {reporteVistaDetalle.res_nombre}{" "}
                          {reporteVistaDetalle.res_apellido || ""}
                        </span>
                      )}
                      {reporteVistaDetalle.fecha_resolucion && (
                        <span className="text-[9px] opacity-75 font-mono block mt-0.5">
                          🗓️ {reporteVistaDetalle.fecha_resolucion}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-1">
                    {reporteVistaDetalle.notas_resolucion}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              {reporteVistaDetalle.estatus === "Pendiente" && (
                <button
                  onClick={() => {
                    setReporteAAtender(reporteVistaDetalle.id);
                    setReporteVistaDetalle(null);
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl shadow-md text-sm"
                >
                  🔧 Atender
                </button>
              )}
              {(reporteVistaDetalle.estatus === "Pendiente" ||
                reporteVistaDetalle.estatus === "En Reparación") && (
                <button
                  onClick={() => {
                    setReporteSeleccionado(reporteVistaDetalle);
                    setNotasResolucion(
                      reporteVistaDetalle.notas_resolucion || "",
                    );
                    setFotoResolucion(null);
                    setReporteVistaDetalle(null);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md text-sm"
                >
                  ✅ Marcar Resuelto
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESOLVER */}
      {reporteSeleccionado && (
        <div
          onClick={() => {
            setReporteSeleccionado(null);
            setFotoResolucion(null);
          }}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span>✅</span> Concluir Trabajo - Hab.{" "}
              {reporteSeleccionado.habitacion_numero}
            </h3>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                ¿Qué se realizó?
              </label>
              <textarea
                value={notasResolucion}
                onChange={(e) => setNotasResolucion(e.target.value)}
                placeholder="Ej. Se reemplazó..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-emerald-400 focus:outline-none h-24 resize-none"
              ></textarea>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Foto del Trabajo
              </label>
              <input
                type="file"
                id="foto-res-input"
                accept="image/*"
                onChange={(e) => setFotoResolucion(e.target.files[0])}
                className="hidden"
              />
              <button
                type="button"
                onClick={() =>
                  document.getElementById("foto-res-input").click()
                }
                className={`w-full border border-dashed font-semibold p-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors ${fotoResolucion ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-slate-50 border-slate-300 text-slate-600"}`}
              >
                <span>📎</span>{" "}
                {fotoResolucion
                  ? `Adjunta: ${fotoResolucion.name.substring(0, 22)}...`
                  : "Subir evidencia"}
              </button>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setReporteSeleccionado(null);
                  setFotoResolucion(null);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={confirmarResolucion}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 text-xs"
              >
                {guardando ? "Guardando..." : "Confirmar Resolución"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ATENDER */}
      {reporteAAtender && (
        <ModalAtender
          reporteId={reporteAAtender}
          onClose={() => setReporteAAtender(null)}
          onConfirm={async (id, diagnostico) => {
            try {
              const res = await fetch(
                `${API_URL}/actualizar_estatus_dano.php`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    reporte_id: id,
                    estatus: "En Reparación",
                    diagnostico: diagnostico,
                    usuario_id: usuarioActual.id,
                  }),
                },
              );
              const respuesta = await res.json();
              if (respuesta.success) {
                alertaToast("success", "✅ Reporte actualizado.");
                setReporteAAtender(null);
                cargarReportes();
              } else {
                alertaToast("error", "❌ " + respuesta.message);
              }
            } catch (error) {
              alertaToast("error", "❌ Error de conexión.");
            }
          }}
        />
      )}
    </div>
  );
}
