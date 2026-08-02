import React, { useState, useEffect } from "react";

const API_URL = "/sistema/swaos-api";

export default function BitacoraView({ usuarioActual }) {
  const [bitacora, setBitacora] = useState([]);
  const [hotelesLista, setHotelesLista] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Filtros en memoria
  const [hotelActivo, setHotelActivo] = useState(0); // 0 = Todos
  const [busqueda, setBusqueda] = useState("");

  const cargarBitacora = (silencioso = false) => {
    if (!silencioso) setCargando(true);
    fetch(`${API_URL}/obtener_bitacora.php`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBitacora(data.bitacora || []);
          if (data.hoteles_lista) setHotelesLista(data.hoteles_lista);
        }
        if (!silencioso) setCargando(false);
      })
      .catch((err) => {
        console.error("Error cargando bitácora:", err);
        if (!silencioso) setCargando(false);
      });
  };

  useEffect(() => {
    cargarBitacora(false);
    // Actualización silenciosa cada 15 segundos para auditar en vivo
    const intervalo = setInterval(() => cargarBitacora(true), 15000);
    return () => clearInterval(intervalo);
  }, []);

  // FILTRADO DINÁMICO
  const registrosFiltrados = bitacora.filter((r) => {
    const coincideHotel =
      hotelActivo === 0 || Number(r.hotel_id) === Number(hotelActivo);
    const textoBusqueda = busqueda.toLowerCase();
    const coincideTexto =
      r.habitacion_numero.toString().includes(textoBusqueda) ||
      r.camarista_nombre.toLowerCase().includes(textoBusqueda) ||
      r.camarista_apellido.toLowerCase().includes(textoBusqueda);
    return coincideHotel && coincideTexto;
  });

  // CÁLCULO DE KPIS GERENCIALES (Sobre los datos filtrados)
  const totalLimpiezas = registrosFiltrados.length;

  const tiemposValidos = registrosFiltrados.filter(
    (r) => r.duracion_minutos > 0 && r.duracion_minutos < 480,
  );
  const tiempoPromedio =
    tiemposValidos.length > 0
      ? Math.round(
          tiemposValidos.reduce(
            (acc, curr) => acc + Number(curr.duracion_minutos),
            0,
          ) / tiemposValidos.length,
        )
      : 0;

  // Encontrar a la camarista más productiva
  const conteoCamaristas = {};
  registrosFiltrados.forEach((r) => {
    const nombreCompleto =
      `${r.camarista_nombre} ${r.camarista_apellido}`.trim();
    conteoCamaristas[nombreCompleto] =
      (conteoCamaristas[nombreCompleto] || 0) + 1;
  });
  let camaristaTop = "N/A";
  let maxLimpiezas = 0;
  Object.entries(conteoCamaristas).forEach(([nombre, total]) => {
    if (total > maxLimpiezas) {
      maxLimpiezas = total;
      camaristaTop = `${nombre} (${total})`;
    }
  });

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABECERA GERENCIAL */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 transition-colors">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800 dark:text-white">
                📊 Bitácora y Auditoría de Tiempos
              </h1>
              <span
                className="flex h-3 w-3 relative"
                title="Monitoreo en vivo activado"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Trazabilidad histórica minuto a minuto del rendimiento del
              personal de Ama de Llaves
            </p>
          </div>

          {/* SELECTOR DE HOTELES */}
          <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-300 dark:border-slate-700 flex flex-wrap gap-1">
            <button
              onClick={() => setHotelActivo(0)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${hotelActivo === 0 ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              🌐 Todos
            </button>
            {hotelesLista.map((h) => (
              <button
                key={h.id}
                onClick={() => setHotelActivo(h.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${Number(hotelActivo) === Number(h.id) ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
              >
                🏨 {h.alias || h.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* TARJETAS DE INDICADORES CLAVE (KPIS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-4 rounded-2xl text-2xl font-black">
              🛏️
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Habitaciones Auditadas
              </p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                {totalLimpiezas}{" "}
                <span className="text-xs font-normal text-slate-500">
                  registros
                </span>
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 p-4 rounded-2xl text-2xl font-black">
              ⏱️
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tiempo Promedio
              </p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                {tiempoPromedio}{" "}
                <span className="text-xs font-normal text-slate-500">
                  minutos / cuarto
                </span>
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl text-2xl font-black">
              🏆
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Mayor Rendimiento
              </p>
              <h3
                className="text-lg font-black text-slate-800 dark:text-white mt-0.5 truncate"
                title={camaristaTop}
              >
                {camaristaTop}
              </h3>
            </div>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA RÁPIDA */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <span className="text-slate-400 text-lg ml-2">🔍</span>
          <input
            type="text"
            placeholder="Filtrar por número de habitación (ej. 1102) o nombre de camarista (ej. Raquel)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-slate-800 dark:text-white focus:outline-none placeholder:text-slate-400"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 px-2.5 py-1 rounded-lg font-bold text-slate-600 dark:text-slate-300"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* TABLA DE TRAZABILIDAD Y AUDITORÍA */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
          {cargando ? (
            <div className="text-center py-20 text-slate-400 font-bold animate-pulse">
              Consultando historiales de limpieza en la base de datos...
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-medium">
              No se encontraron registros de auditoría que coincidan con los
              filtros actuales.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black">
                    <th className="py-4 px-6">Habitación / Hotel</th>
                    <th className="py-4 px-6">Camarista Responsable</th>
                    <th className="py-4 px-6">Hora Inicio</th>
                    <th className="py-4 px-6">Hora Término</th>
                    <th className="py-4 px-6 text-center">Duración Total</th>
                    <th className="py-4 px-6 text-right">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs font-semibold">
                  {registrosFiltrados.map((r) => {
                    const dur = Number(r.duracion_minutos);
                    // Colores de alerta según el tiempo de limpieza
                    let colorTiempo =
                      "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
                    if (dur > 0) {
                      if (dur <= 30)
                        colorTiempo =
                          "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60";
                      else if (dur <= 45)
                        colorTiempo =
                          "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60";
                      else
                        colorTiempo =
                          "bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60";
                    }

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-800 dark:text-white">
                              Hab. {r.habitacion_numero}
                            </span>
                            <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold px-2 py-0.5 rounded text-[10px] border border-indigo-200 dark:border-indigo-800/40">
                              🏨 {r.hotel_alias}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-700 dark:text-slate-300 font-bold">
                          👤 {r.camarista_nombre} {r.camarista_apellido}
                        </td>
                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {r.fecha_inicio ? r.fecha_inicio : "---"}
                        </td>
                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {r.fecha_fin ? r.fecha_fin : "En curso..."}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`px-3 py-1 rounded-full font-black text-[11px] inline-block shadow-sm ${colorTiempo}`}
                          >
                            {dur > 0 ? `${dur} min` : "⏱️ En proceso"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                            ✓ {r.estatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
