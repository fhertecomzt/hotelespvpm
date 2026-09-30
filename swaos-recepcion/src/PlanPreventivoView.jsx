import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { alertaToast } from "./utils";
import ModalNuevoPreventivo from "./ModalNuevoPreventivo";
import ModalCumplirPreventivo from "./ModalCumplirPreventivo";

const API_URL = import.meta.env.DEV
  ? "http://localhost/hotelespvpm/sistema/swaos-api"
  : "/sistema/swaos-api";

export default function PlanPreventivoView({ usuarioActual }) {
  const [tareas, setTareas] = useState([]);
  const [hotelesLista, setHotelesLista] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [tareaAEliminar, setTareaAEliminar] = useState(null);
  const [tareaAEditar, setTareaAEditar] = useState(null);
  const [tareaACumplir, setTareaACumplir] = useState(null);
  const [modoVista, setModoVista] = useState(() =>
    window.innerWidth >= 1024 ? "tabla" : "tarjetas",
  );

  const [filtroHotel, setFiltroHotel] = useState("0");
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [filtroEstatus, setFiltroEstatus] = useState("Todos");

  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 10;
  const token = localStorage.getItem("swaos_token");

  // --- SISTEMA DE ALERTAS (CERO PRETEXTOS) ---
  const prevAlertasRef = useRef(null); // Memoria para saber si llegaron NUEVAS urgencias
  const audioRef = useRef(new Audio("/alerta.mp3"));
  const [totalUrgencias, setTotalUrgencias] = useState(0);

  const calcularUrgencia = (fechaProxima) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const proxima = new Date(fechaProxima);
    proxima.setHours(0, 0, 0, 0);
    const diffDias = Math.ceil(
      (proxima.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDias < 0) return { texto: "Vencido", color: "red" };
    if (diffDias <= 3) return { texto: "Urgente", color: "amber" };
    return { texto: "Al Día", color: "emerald" };
  };

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

  // El Radar: Se ejecuta cada vez que 'tareas' cambia
  useEffect(() => {
    // 1. Contamos cuántas tareas están en foco rojo (Vencidas o Urgentes)
    const urgenciasActuales = tareas.filter((t) => {
      const urg = calcularUrgencia(t.proxima_ejecucion);
      return urg.texto === "Vencido" || urg.texto === "Urgente";
    }).length;

    setTotalUrgencias(urgenciasActuales);

    // 2. Si el número SUBIÓ respecto a la última revisión (y no es la primera carga)
    if (
      prevAlertasRef.current !== null &&
      urgenciasActuales > prevAlertasRef.current
    ) {
      // Lanzar sonido (Cachamos el error por si el navegador bloquea el autoplay)
      audioRef.current
        .play()
        .catch((e) =>
          console.log(
            "Sonido bloqueado hasta que el usuario interactúe con la página",
          ),
        );

      // 3. Lanzar Notificación de Windows/Mac con Try/Catch
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("SWAOS | Tareas Urgentes", {
            body: `Hay ${urgenciasActuales} rutinas preventivas que requieren atención.`,
            icon: "/icono-manto.ico",
          });
        }
      } catch (error) {
        console.warn(
          "Notificaciones Push no soportadas nativamente en este dispositivo móvil.",
        );
      }
    }

    // Guardar el nuevo número en la memoria
    prevAlertasRef.current = urgenciasActuales;
  }, [tareas]);
  // -------------------------------------------------

  useEffect(() => {
    document.title = "SWAOS | Plan Preventivo";
    cargarTareas(false);
    const intervalo = setInterval(() => cargarTareas(true), 10000);

    const handleResize = () =>
      setModoVista(window.innerWidth >= 1024 ? "tabla" : "tarjetas");
    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(
    () => setPaginaActual(1),
    [filtroHotel, busqueda, filtroCategoria, filtroEstatus],
  );

  const cargarTareas = (silencioso = false) => {
    if (!silencioso) setCargando(true);
    fetch(`${API_URL}/obtener_preventivos.php`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTareas(data.tareas || []);
          if (data.hoteles_lista) setHotelesLista(data.hoteles_lista);
        }
        if (!silencioso) setCargando(false);
      })
      .catch((err) => {
        if (!silencioso) setCargando(false);
      });
  };

  const confirmarEliminacion = async () => {
    if (!tareaAEliminar) return;
    try {
      const res = await fetch(`${API_URL}/eliminar_preventivo.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: tareaAEliminar }),
      });
      const data = await res.json();
      if (data.success) {
        alertaToast("success", "🗑️ Tarea eliminada.");
        setTareaAEliminar(null);
        cargarTareas(true);
      } else {
        alertaToast("error", "❌ " + data.message);
      }
    } catch (err) {
      alertaToast("error", "❌ Error al conectar.");
    }
  };

  const tareasFiltradas = tareas.filter((tarea) => {
    const urgencia = calcularUrgencia(tarea.proxima_ejecucion);
    const coincideHotel =
      filtroHotel === "0" || Number(tarea.hotel_id) === Number(filtroHotel);
    const coincideCategoria =
      filtroCategoria === "Todas" || tarea.categoria === filtroCategoria;
    const coincideEstatus =
      filtroEstatus === "Todos" || urgencia.texto === filtroEstatus;
    const coincideBusqueda =
      tarea.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      tarea.ubicacion.toLowerCase().includes(busqueda.toLowerCase());
    return (
      coincideHotel && coincideCategoria && coincideEstatus && coincideBusqueda
    );
  });

  const indiceUltimo = paginaActual * elementosPorPagina;
  const indicePrimer = indiceUltimo - elementosPorPagina;
  const tareasPaginadas = tareasFiltradas.slice(indicePrimer, indiceUltimo);
  const totalPaginas = Math.ceil(tareasFiltradas.length / elementosPorPagina);
  const categoriasUnicas = [
    "Todas",
    ...new Set(tareas.map((t) => t.categoria)),
  ];

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABECERA PRINCIPAL */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                📅 Mantenimiento Preventivo
              </h1>
              {/* Indicador de conexión verde */}
              <span
                className="flex h-3 w-3 relative"
                title="Sincronización en vivo cada 10 segundos"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Agenda de rutinas, inspecciones y limpieza programada.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0 items-center">
            {/* CAMPANITA DE NOTIFICACIONES */}
            <div
              className="relative flex items-center justify-center w-10 h-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 mr-2"
              title="Tareas Vencidas o Urgentes"
            >
              <span
                className={`text-lg ${totalUrgencias > 0 ? "animate-pulse" : "opacity-50"}`}
              >
                🔔
              </span>
              {totalUrgencias > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
                  {totalUrgencias}
                </span>
              )}
            </div>

            <Link
              to="/mantenimiento"
              className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
            >
              ← Volver a Incidencias
            </Link>
            <button
              onClick={() =>
                setModoVista(modoVista === "tabla" ? "tarjetas" : "tabla")
              }
              className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors"
            >
              {modoVista === "tabla" ? "📱 Tarjetas" : "📄 Tabla"}
            </button>
            <button
              onClick={() => {
                setTareaAEditar(null);
                setMostrarModalNuevo(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-colors"
            >
              + Nueva Tarea
            </button>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
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
              placeholder="Buscar rutina o ubicación..."
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
              <option value="Vencido">🚨 Vencidos</option>
              <option value="Urgente">⚠️ Urgentes</option>
              <option value="Al Día">✅ Al Día</option>
            </select>
          </div>
        </div>

        {/* CONTENIDO */}
        {cargando && tareas.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold animate-pulse">
            Sincronizando agenda con el servidor...
          </div>
        ) : tareasFiltradas.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold">
            No se encontraron tareas con estos filtros.
          </div>
        ) : (
          <>
            {modoVista === "tabla" ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <th className="p-4">Rutina</th>
                        <th className="p-4">Categoría</th>
                        <th className="p-4">Ubicación</th>
                        <th className="p-4">Frecuencia</th>
                        <th className="p-4">Próxima Fecha</th>
                        <th className="p-4">Estatus</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {tareasPaginadas.map((tarea) => {
                        const urgencia = calcularUrgencia(
                          tarea.proxima_ejecucion,
                        );
                        return (
                          <tr
                            key={tarea.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                          >
                            <td className="p-4 font-black text-slate-800 dark:text-white">
                              {tarea.titulo}
                            </td>
                            <td className="p-4">
                              <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg text-[10px] uppercase border border-slate-200 dark:border-slate-600">
                                {tarea.categoria}
                              </span>
                            </td>
                            <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                              {tarea.ubicacion}
                            </td>
                            <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                              Cada {tarea.frecuencia_dias} días
                            </td>
                            <td className="p-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                              {tarea.proxima_ejecucion}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border bg-${urgencia.color}-100 text-${urgencia.color}-700 border-${urgencia.color}-300 dark:bg-${urgencia.color}-900/30 dark:text-${urgencia.color}-400 dark:border-${urgencia.color}-800/50`}
                              >
                                {urgencia.texto}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => setTareaACumplir(tarea)}
                                className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-colors"
                              >
                                ✅ Cumplir
                              </button>
                              <button
                                onClick={() => {
                                  setTareaAEditar(tarea);
                                  setMostrarModalNuevo(true);
                                }}
                                className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-600 transition-colors"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => setTareaAEliminar(tarea.id)}
                                className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2 py-1.5 rounded-lg text-xs font-bold border border-rose-200 dark:border-rose-800 transition-colors"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tareasPaginadas.map((tarea) => {
                  const urgencia = calcularUrgencia(tarea.proxima_ejecucion);
                  return (
                    <div
                      key={tarea.id}
                      className={`bg-white dark:bg-slate-800 rounded-3xl p-5 border shadow-sm hover:shadow-md border-${urgencia.color}-300 dark:border-${urgencia.color}-800/50 flex flex-col justify-between transition-all`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600">
                            {tarea.categoria}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setTareaAEditar(tarea);
                                setMostrarModalNuevo(true);
                              }}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setTareaAEliminar(tarea.id)}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight mb-1">
                          {tarea.titulo}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                          <span>📍</span> {tarea.ubicacion}
                        </p>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border inline-block mb-4 bg-${urgencia.color}-100 text-${urgencia.color}-700 border-${urgencia.color}-300 dark:bg-${urgencia.color}-900/30 dark:text-${urgencia.color}-400 dark:border-${urgencia.color}-800/50`}
                        >
                          {urgencia.texto}
                        </span>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold space-y-1 mb-4">
                          <div>
                            🔄 Se repite: Cada {tarea.frecuencia_dias} días
                          </div>
                          <div
                            className={`font-bold text-${urgencia.color}-600 dark:text-${urgencia.color}-400`}
                          >
                            ⏰ Toca el: {tarea.proxima_ejecucion}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setTareaACumplir(tarea)}
                        className="w-full bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold py-2 rounded-xl text-sm transition-colors"
                      >
                        ✅ Registrar Cumplimiento
                      </button>
                    </div>
                  );
                })}
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
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all font-bold text-sm"
            >
              ← Anterior
            </button>
            <span className="text-sm font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() =>
                setPaginaActual((p) => Math.min(totalPaginas, p + 1))
              }
              disabled={paginaActual === totalPaginas}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all font-bold text-sm"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {mostrarModalNuevo && (
        <ModalNuevoPreventivo
          usuarioActual={usuarioActual}
          hotelesLista={hotelesLista}
          tareaAEditar={tareaAEditar}
          onClose={() => setMostrarModalNuevo(false)}
          onGuardado={() => {
            setMostrarModalNuevo(false);
            cargarTareas(true);
          }}
        />
      )}
      {tareaACumplir && (
        <ModalCumplirPreventivo
          tarea={tareaACumplir}
          usuarioActual={usuarioActual}
          onClose={() => setTareaACumplir(null)}
          onGuardado={() => {
            setTareaACumplir(null);
            cargarTareas(true);
          }}
        />
      )}
      {tareaAEliminar && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 text-center transition-colors">
            <div className="text-5xl mb-4">🗑️</div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
              ¿Eliminar Rutina?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-6">
              Estás a punto de borrar esta tarea de la agenda. También se
              perderá su historial. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setTareaAEliminar(null)}
                className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacion}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl shadow-md text-sm transition-colors"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
