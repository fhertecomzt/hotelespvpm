import React, { useState, useEffect } from "react";
import { alertaToast, comprimirImagen } from "./utils";

const API_URL = "/sistema/swaos-api";

export default function MantenimientoView({ usuarioActual }) {
  const [reportes, setReportes] = useState([]);
  const [hotelesLista, setHotelesLista] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [hotelActivo, setHotelActivo] = useState(0);
  const [filtroEstatus, setFiltroEstatus] = useState("Pendiente");

  // MODAL PARA RESOLVER INCIDENCIA CON EVIDENCIA
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [notasResolucion, setNotasResolucion] = useState("");
  const [fotoResolucion, setFotoResolucion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const token = localStorage.getItem("swaos_token"); // Sacamos el token

  const cargarReportes = (silencioso = false) => {
    if (!silencioso) setCargando(true);
    fetch(`${API_URL}/obtener_reportes_mantenimiento.php`, {
      headers: {
        Authorization: `Bearer ${token}`, // Lo enviamos al PHP
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReportes(data.reportes || []);
          if (data.hoteles_lista) {
            setHotelesLista(data.hoteles_lista);
          }
        }
        if (!silencioso) setCargando(false);
      })
      .catch((err) => {
        console.error("Error al cargar mantenimiento:", err);
        if (!silencioso) setCargando(false);
      });
  };

  useEffect(() => {
    document.title = "SWAOS | Mantenimiento";
    const favicon = document.getElementById("favicon");
    if (favicon) favicon.href = "/icono-manto.ico";
  }, []);

  useEffect(() => {
    cargarReportes(false);
    const intervalo = setInterval(() => cargarReportes(true), 10000);
    return () => clearInterval(intervalo);
  }, []);

  // TRADUCTOR DINÁMICO DE ID A ALIAS
  const getHotelAlias = (id, aliasBackend) => {
    if (aliasBackend) return aliasBackend;
    const h = hotelesLista.find((item) => Number(item.id) === Number(id));
    if (!h) return `Hotel ${id}`;
    return h.alias || h.nombre;
  };

  // RESOLVEDOR INTELIGENTE PARA TUS CARPETAS REALES (evidencias / evidencias_danos)
  const getImageUrl = (url) => {
    if (!url || typeof url !== "string" || url.trim() === "") return null;
    const rutaLimpia = url.trim();
    if (
      rutaLimpia.startsWith("http://") ||
      rutaLimpia.startsWith("https://") ||
      rutaLimpia.startsWith("data:image")
    ) {
      return rutaLimpia;
    }

    let rutaSinDiagonal = rutaLimpia.replace(/^\/+/, "");

    // Si en MySQL solo se guardó el nombre del archivo (ej: dano_hab_3...), lo enviamos a tu carpeta correcta
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

  // CAMBIAR ESTATUS RÁPIDO
  const cambiarEstatus = (id, nuevoEstatus) => {
        //Candado de seguridad Offline Centralizado
        if (!navigator.onLine) {
          alertaToast(
            "error",
            "⚡ Sin conexión. Acércate a la red para registrar el cambio.",
          );
          return; // Detiene la función y evita el fetch
        }

    fetch(`${API_URL}/actualizar_estatus_dano.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reporte_id: id,
        estatus: nuevoEstatus,
        resuelto_por: usuarioActual?.id || 1,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          alertaToast("success", `Estatus cambiado a: ${nuevoEstatus}`);
          cargarReportes();
        } else {
          alertaToast("error", res.message || "No se pudo actualizar");
        }
      })
      .catch(() => alertaToast("error", "Error de red al actualizar"));
  };

  // GUARDAR RESOLUCIÓN CON FOTO (FormData) EN evidencias_danos/
  const confirmarResolucion = async () => {
    if (!reporteSeleccionado) return;

    //Candado de seguridad Offline para Resoluciones con Foto
    if (!navigator.onLine) {
      alertaToast(
        "error",
        "⚡ Sin conexión. Acércate a la red para enviar la foto y cerrar el reporte.",
      );
      return;
    }
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const respuesta = await res.json();

      setGuardando(false);
      if (respuesta.success) {
        alertaToast("success", "¡Incidencia resuelta con evidencia!");
        setReporteSeleccionado(null);
        setFotoResolucion(null);
        cargarReportes();
      } else {
        alertaToast("error", respuesta.message || "Error al guardar");
      }
    } catch (err) {
      setGuardando(false);
      alertaToast("error", "Fallo de conexión al enviar evidencia");
    }
  };;

  const reportesFiltrados = reportes.filter((r) => {
    const coincideHotel =
      hotelActivo === 0 || Number(r.hotel_id) === Number(hotelActivo);
    const coincideEstatus =
      filtroEstatus === "Todos" || r.estatus === filtroEstatus;
    return coincideHotel && coincideEstatus;
  });

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABECERA */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 transition-colors">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800 dark:text-white">
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
              Recepción y Ama de Llaves
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-300 dark:border-slate-700 flex flex-wrap gap-1">
              <button
                onClick={() => setHotelActivo(0)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${hotelActivo === 0 ? "bg-amber-600 text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
              >
                🌐 Todos los Hoteles
              </button>
              {hotelesLista.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setHotelActivo(h.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${Number(hotelActivo) === Number(h.id) ? "bg-amber-600 text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                >
                  🏨 {h.alias || h.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PESTAÑAS DE ESTATUS */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          {["Pendiente", "En Reparación", "Resuelto", "Todos"].map((est) => {
            const conteo = reportes.filter(
              (r) =>
                (est === "Todos" ? true : r.estatus === est) &&
                (hotelActivo === 0 ||
                  Number(r.hotel_id) === Number(hotelActivo)),
            ).length;
            const activo = filtroEstatus === est;
            return (
              <button
                key={est}
                onClick={() => setFiltroEstatus(est)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                  activo
                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md scale-105"
                    : "bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span>
                  {est === "Pendiente"
                    ? "🚨"
                    : est === "En Reparación"
                      ? "🔧"
                      : est === "Resuelto"
                        ? "✅"
                        : "📋"}
                </span>
                <span>{est}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${activo ? "bg-white/20 dark:bg-black/10" : "bg-slate-200 dark:bg-slate-700"}`}
                >
                  {conteo}
                </span>
              </button>
            );
          })}
        </div>

        {/* LISTA DE TARJETAS */}
        {cargando ? (
          <div className="text-center py-20 text-slate-400 font-bold animate-pulse">
            Sincronizando reportes de fallas con el servidor...
          </div>
        ) : reportesFiltrados.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/50 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
            <span className="text-4xl block mb-2">🎉</span>
            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg">
              Todo en orden
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              No hay reportes con el estatus "{filtroEstatus}" para la selección
              actual.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportesFiltrados.map((r) => {
              const alias = getHotelAlias(r.hotel_id, r.hotel_alias);
              const esPendiente = r.estatus === "Pendiente";
              const esReparacion = r.estatus === "En Reparación";
              const esResuelto = r.estatus === "Resuelto";

              const urlAntes = getImageUrl(r.foto_url);
              const urlDespues = getImageUrl(r.foto_resolucion_url);

              return (
                <div
                  key={r.id}
                  className={`bg-white dark:bg-slate-800 rounded-3xl p-5 border shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                    esPendiente
                      ? "border-red-300 dark:border-red-500/30 bg-gradient-to-b from-red-50/30 to-white dark:from-red-950/10 dark:to-slate-800"
                      : esReparacion
                        ? "border-amber-300 dark:border-amber-500/30 bg-gradient-to-b from-amber-50/30 to-white dark:from-amber-950/10 dark:to-slate-800"
                        : "border-slate-200 dark:border-slate-700 opacity-80"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div>
                        <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/40 text-[11px] block w-fit mb-1">
                          🏨 {alias}
                        </span>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                          <span>🚪</span> Hab. {r.habitacion_numero}
                        </h3>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                          esPendiente
                            ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300"
                            : esReparacion
                              ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300"
                        }`}
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

                      <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        "{r.descripcion}"
                      </div>

                      {/* EVIDENCIA FOTOGRÁFICA: EL ANTES */}
                      {urlAntes && (
                        <div className="mt-2">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                            📸 Evidencia (El Antes):
                          </span>
                          <a
                            href={urlAntes}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={urlAntes}
                              alt="Falla reportada"
                              className="w-full h-32 object-cover bg-slate-100 dark:bg-slate-900"
                            />
                          </a>
                        </div>
                      )}

                      {/* EVIDENCIA FOTOGRÁFICA: EL DESPUÉS */}
                      {urlDespues && (
                        <div className="mt-2">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mb-1 uppercase tracking-wider">
                            🛠️ Trabajo Terminado (El Después):
                          </span>
                          <a
                            href={urlDespues}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-800 hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={urlDespues}
                              alt="Reparación completada"
                              className="w-full h-32 object-cover bg-slate-100 dark:bg-slate-900"
                            />
                          </a>
                        </div>
                      )}

                      {/* NOTAS DE RESOLUCIÓN */}
                      {r.notas_resolucion && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 mt-2">
                          <span className="font-bold block text-[10px] uppercase tracking-wider mb-0.5">
                            📝 Detalle técnico:
                          </span>
                          {r.notas_resolucion}
                        </div>
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
                      {r.rep_nombre && <div>👤 Por: {r.rep_nombre}</div>}
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      {esPendiente && (
                        <button
                          onClick={() => cambiarEstatus(r.id, "En Reparación")}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          🔧 Atender
                        </button>
                      )}

                      {(esPendiente || esReparacion) && (
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
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL RESOLVER */}
      {reporteSeleccionado && (
        <div
          onClick={() => {
            setReporteSeleccionado(null);
            setFotoResolucion(null);
          }}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                ¿Qué reparación o cambio técnico se realizó?
              </label>
              <textarea
                value={notasResolucion}
                onChange={(e) => setNotasResolucion(e.target.value)}
                placeholder="Ej. Se reemplazó el condensador del aire acondicionado y se verificó enfriamiento..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-emerald-400 focus:outline-none h-24 resize-none"
              ></textarea>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Adjuntar Foto del Trabajo Terminado (El Después)
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
                className={`w-full border border-dashed font-semibold p-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors ${fotoResolucion ? "bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
              >
                <span>📎</span>{" "}
                {fotoResolucion
                  ? `Adjunta: ${fotoResolucion.name.substring(0, 22)}...`
                  : "Subir foto o evidencia de resolución"}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setReporteSeleccionado(null);
                  setFotoResolucion(null);
                }}
                className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl text-xs"
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
    </div>
  );
}
