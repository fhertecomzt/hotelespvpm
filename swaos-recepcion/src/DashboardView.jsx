import React, { useState, useEffect } from "react"
import BitacoraView from "./BitacoraView";

const API_URL = "http://localhost/hotelespvpm/sistema/swaos-api";

export default function DashboardView({ usuarioActual }) {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [hotelActivo, setHotelActivo] = useState(usuarioActual?.hotel_id || 1);
  const [pestañaSaaS, setPestañaSaaS] = useState(false);
  
  const esSuperusuario = usuarioActual?.rol === "Superusuario";
  
  const cargarMetrics = (silencioso = false) => {
    if (!silencioso) setCargando(true);
    const idConsulta = pestañaSaaS ? 0 : hotelActivo;
    fetch(
      `${API_URL}/obtener_dashboard.php?hotel_id=${idConsulta}&rol=${usuarioActual?.rol || ""}`,
    )
    .then((res) => res.json())
    .then((res) => {
      if (res.success) setData(res);
      if (!silencioso) setCargando(false);
    })
    .catch((err) => {
      console.error("Error al cargar dashboard:", err);
      if (!silencioso) setCargando(false);
    });
  };
  const [pestañaGerencial, setPestañaGerencial] = useState("metricas"); // 'metricas' o 'auditoria'

  useEffect(() => {
    cargarMetrics(false);
    const intr = setInterval(() => cargarMetrics(true), 15000);
    return () => clearInterval(intr);
  }, [hotelActivo, pestañaSaaS]);

  const descargarExcel = () => {
    window.location.href = `${API_URL}/exportar_reporte.php?hotel_id=${hotelActivo}`;
  };

  if (cargando || !data) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-lg animate-pulse transition-colors">
        📊 Generando analítica gerencial...
      </div>
    );
  }

  const { kpis, zonas_progreso, saas_comparativa, hoteles_lista = [] } = data;

  // LÓGICA DINÁMICA PARA EL NOMBRE Y ALIAS DEL HOTEL ACTUAL EN PANTALLA
  const hotelObjeto = hoteles_lista.find(
    (h) => Number(h.id) === Number(hotelActivo),
  ) || { nombre: `Hotel ${hotelActivo}`, alias: `Hotel ${hotelActivo}` };
  const textoHotelHeader = `${hotelObjeto.nombre} (${hotelObjeto.alias})`;

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-100 p-4 md:p-8 pb-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABECERA GERENCIAL DINÁMICA */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 transition-colors">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-wide">
                📊 Inteligencia Operativa{" "}
                {pestañaSaaS && (
                  <span className="text-sm bg-purple-600 text-white px-3 py-1 rounded-full uppercase tracking-widest font-black">
                    SaaS Global
                  </span>
                )}
              </h1>
              <span
                className="flex h-3 w-3 relative"
                title="Tiempo real activo"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-semibold mt-1">
              {pestañaSaaS
                ? "Monitoreo multi-tenant y licencias de la plataforma"
                : `Resumen ejecutivo en tiempo real para ${textoHotelHeader}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* SELECTOR DINÁMICO DE HOTELES: SOLO SE MUESTRA EN MÉTRICAS */}
            {!pestañaSaaS && pestañaGerencial === "metricas" && (
              <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-300 dark:border-slate-700 flex flex-wrap gap-1">
                {hoteles_lista.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setHotelActivo(h.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${Number(hotelActivo) === Number(h.id) ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                  >
                    🏨 {h.alias || h.nombre} (ID {h.id})
                  </button>
                ))}
              </div>
            )}

            {/* BOTÓN EXCEL: SOLO SE MUESTRA EN MÉTRICAS */}
            {!pestañaSaaS && pestañaGerencial === "metricas" && (
              <button
                onClick={descargarExcel}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs shadow-md transition-all flex items-center gap-2"
              >
                <span>📥</span> Descargar Excel
              </button>
            )}

            {/* BOTÓN SUPERUSUARIO: SIEMPRE VISIBLE PARA EL DUEÑO */}
            {esSuperusuario && (
              <button
                onClick={() => setPestañaSaaS(!pestañaSaaS)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all border flex items-center gap-2 ${pestañaSaaS ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl" : "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/40"}`}
              >
                <span>🚀</span>{" "}
                {pestañaSaaS ? "Ver Vista Hotel" : "Comando SaaS"}
              </button>
            )}
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS GERENCIALES */}
        <div className="flex gap-2 bg-slate-200 dark:bg-slate-700/60 p-1 rounded-2xl w-fit my-2">
          <button
            onClick={() => setPestañaGerencial("metricas")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              pestañaGerencial === "metricas"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            📈 Métricas y KPIs
          </button>
          <button
            onClick={() => setPestañaGerencial("auditoria")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              pestañaGerencial === "auditoria"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            📑 Auditoría de Tiempos
          </button>
        </div>

        {/* CONTENIDO DINÁMICO SEGÚN PESTAÑA */}
        {pestañaGerencial === "auditoria" ? (
          <BitacoraView usuarioActual={usuarioActual} />
        ) : (
          <div className="space-y-6">
            {/* ... tus tarjetas, gráficas y tablas anteriores ... */}
          </div>
        )}

        {/* CONTENIDO KPI Y GRÁFICAS */}
        {!pestañaSaaS && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-5 rounded-3xl shadow-sm transition-all">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Avance de Limpieza
                  </span>
                  <span className="text-2xl">✨</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-800 dark:text-white">
                    {kpis.porcentaje_limpieza}%
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ({kpis.limpias} / {kpis.total_habitaciones})
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-1000"
                    style={{ width: `${kpis.porcentaje_limpieza}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-5 rounded-3xl shadow-sm transition-all">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    En Proceso Ahora
                  </span>
                  <span className="text-2xl">🧹</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-amber-500 dark:text-amber-400">
                    {kpis.en_proceso}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    camaristas activas
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-4 font-medium">
                  Habitaciones siendo aseadas en este minuto
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-5 rounded-3xl shadow-sm transition-all">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Por Limpiar hoy
                  </span>
                  <span className="text-2xl">⏳</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-blue-500 dark:text-blue-400">
                    {kpis.pendientes_atencion}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    cuartos pendientes
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-4 font-medium">
                  Incluye Ocupadas y Salidas Confirmadas
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-5 rounded-3xl shadow-sm transition-all">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Fallas Técnicas
                  </span>
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-red-500 dark:text-red-400">
                    {kpis.danos_activos}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    alertas activas
                  </span>
                </div>
                <p className="text-[11px] text-red-500/80 dark:text-red-300/80 mt-4 font-semibold">
                  Requieren atención de Mantenimiento
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-6 rounded-3xl lg:col-span-2 space-y-4 shadow-sm transition-all">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/80 pb-3">
                  <div>
                    <h3 className="font-black text-lg text-slate-800 dark:text-white">
                      🏆 Rendimiento y Avance por Zona
                    </h3>
                    <p className="text-xs text-slate-400">
                      Comparativa del trabajo matutino en las cargas asignadas
                    </p>
                  </div>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-3 py-1 rounded-full">
                    Hoy
                  </span>
                </div>

                <div className="space-y-4 pt-2">
                  {zonas_progreso.map((z, idx) => {
                    const total = Number(z.total) || 0;
                    const lim = Number(z.limpias) || 0;
                    const porc =
                      total > 0 ? Math.round((lim / total) * 100) : 0;
                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="text-indigo-600 dark:text-indigo-300 font-black">
                            {z.zona}
                          </span>
                          <span className="text-slate-800 dark:text-white">
                            {lim} / {total} habs.{" "}
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-1">
                              ({porc}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
                          <div
                            className="bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${porc}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-6 rounded-3xl space-y-4 flex flex-col justify-between shadow-sm transition-all">
                <div>
                  <h3 className="font-black text-lg text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700/80 pb-3 mb-4">
                    📍 Estatus de Inventario
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        l: "Limpia",
                        val: kpis.limpias,
                        c: "text-emerald-600 dark:text-emerald-400",
                        i: "✨",
                      },
                      {
                        l: "En Proceso",
                        val: kpis.en_proceso,
                        c: "text-amber-600 dark:text-amber-400",
                        i: "🧹",
                      },
                      {
                        l: "Ocupadas / Pendientes",
                        val: kpis.pendientes_atencion,
                        c: "text-blue-600 dark:text-blue-400",
                        i: "⏳",
                      },
                      {
                        l: "No Molestar (DND)",
                        val: kpis.dnd,
                        c: "text-red-600 dark:text-red-400",
                        i: "🚫",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800"
                      >
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <span>{item.i}</span> {item.l}
                        </span>
                        <span
                          className={`text-sm font-black bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 ${item.c}`}
                        >
                          {item.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-900/40 dark:to-slate-900 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 text-center mt-4">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-widest block mb-1">
                    ⏱️ SLA Operativo
                  </span>
                  <span className="text-xl font-extrabold text-slate-800 dark:text-white">
                    28 min / habitación
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Tiempo promedio estimado por camarista
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* VISTA SAAS MULTI-TENANT */}
        {pestañaSaaS && esSuperusuario && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-purple-100 via-white to-indigo-100 dark:from-purple-900/60 dark:via-slate-800 dark:to-indigo-900/60 border border-purple-300 dark:border-purple-500/40 p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors">
              <div>
                <span className="bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                  Superusuario SaaS Admin
                </span>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-2">
                  🏢 Ecosistema Multi-Tenant SWAOS
                </h2>
                <p className="text-xs text-slate-600 dark:text-purple-200 mt-1">
                  Visualizando el consumo y rendimiento de todas las licencias
                  de hoteles conectados a tu servidor.
                </p>
              </div>
              <button
                onClick={() =>
                  alert(
                    "⚡ Para aprovisionar nuevos hoteles, ve al módulo Admin -> pestaña Hoteles (SaaS).",
                  )
                }
                className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-purple-50 text-white dark:text-slate-900 font-black px-6 py-3 rounded-2xl text-xs shadow-xl transition-all whitespace-nowrap flex items-center gap-2"
              >
                <span>🚀</span> Gestión de Tenants
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl overflow-hidden shadow-lg transition-colors">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/40">
                <h3 className="font-black text-lg text-slate-800 dark:text-white">
                  📈 Rendimiento y Consumo por Propiedad
                </h3>
                <p className="text-xs text-slate-400">
                  Métricas consolidadas de activos y licencias activas en MySQL
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="p-4">Tenant ID</th>
                      <th className="p-4">Nombre del Cliente / Hotel</th>
                      <th className="p-4">Alias / Sigla</th>
                      <th className="p-4">Inventario de Habs.</th>
                      <th className="p-4">Avance Hoy</th>
                      <th className="p-4">Personal Registrado</th>
                      <th className="p-4 text-right">Estatus Licencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {saas_comparativa.map((tenant) => {
                      const habs = Number(tenant.total_habs) || 0;
                      const lim = Number(tenant.habs_limpias) || 0;
                      const avance =
                        habs > 0 ? Math.round((lim / habs) * 100) : 0;
                      return (
                        <tr
                          key={tenant.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="p-4 font-mono text-xs text-purple-600 dark:text-purple-400 font-bold">
                            #TENANT-{tenant.id}
                          </td>
                          <td className="p-4 font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="text-lg">🏨</span> {tenant.nombre}
                          </td>
                          <td className="p-4">
                            <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-black px-2.5 py-1 rounded-md text-xs border border-purple-300 dark:border-purple-800">
                              {tenant.alias}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-300">
                            {habs} cuartos configurados
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-200 dark:bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
                                <div
                                  className="bg-purple-600 dark:bg-purple-500 h-full"
                                  style={{ width: `${avance}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-bold text-purple-600 dark:text-purple-300">
                                {avance}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-300">
                            👥 {tenant.total_personal} usuarios activos
                          </td>
                          <td className="p-4 text-right">
                            <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black uppercase">
                              ● Activa (PRO)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
