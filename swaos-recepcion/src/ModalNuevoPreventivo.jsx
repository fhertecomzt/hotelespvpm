import React, { useState } from "react";
import { alertaToast } from "./utils";

const API_URL = import.meta.env.DEV
  ? "http://localhost/hotelespvpm/sistema/swaos-api"
  : "/sistema/swaos-api";

// Agregamos la prop "tareaAEditar" (si viene nula, es una tarea nueva)
export default function ModalNuevoPreventivo({
  onClose,
  onGuardado,
  usuarioActual,
  hotelesLista,
  tareaAEditar,
}) {
  const categorias = [
    "Plomería",
    "Eléctrico",
    "Aire Acondicionado",
    "Alberca",
    "Jardinería",
    "Limpieza Profunda",
    "Fumigación",
    "Otro",
  ];
  const esCategoriaConocida = tareaAEditar
    ? categorias.includes(tareaAEditar.categoria)
    : true;

  // Llenado automático si estamos editando
  const [titulo, setTitulo] = useState(tareaAEditar?.titulo || "");
  const [categoria, setCategoria] = useState(
    tareaAEditar
      ? esCategoriaConocida
        ? tareaAEditar.categoria
        : "Otro"
      : "Plomería",
  );
  const [categoriaManual, setCategoriaManual] = useState(
    tareaAEditar && !esCategoriaConocida ? tareaAEditar.categoria : "",
  );
  const [ubicacion, setUbicacion] = useState(tareaAEditar?.ubicacion || "");
  const [frecuencia, setFrecuencia] = useState(
    tareaAEditar?.frecuencia_dias || 30,
  );

  const hoy = new Date().toISOString().split("T")[0];
  const [fechaInicio, setFechaInicio] = useState(
    tareaAEditar?.proxima_ejecucion || hoy,
  );
  const [instrucciones, setInstrucciones] = useState(
    tareaAEditar?.instrucciones || "",
  );
  const [hotelId, setHotelId] = useState(
    tareaAEditar?.hotel_id || usuarioActual?.hotel_id || 1,
  );
  const [guardando, setGuardando] = useState(false);

  const token = localStorage.getItem("swaos_token");

  const handleGuardar = async () => {
    if (!titulo.trim())
      return alertaToast("error", "⚠️ El título de la rutina es obligatorio.");
    if (frecuencia <= 0)
      return alertaToast(
        "error",
        "⚠️ La frecuencia debe ser de al menos 1 día.",
      );

    const categoriaFinal =
      categoria === "Otro" ? categoriaManual.trim() : categoria;
    if (categoria === "Otro" && !categoriaFinal)
      return alertaToast("error", "⚠️ Escribe la categoría.");

    setGuardando(true);
    try {
      // Determinamos si vamos a crear o editar según si existe la prop tareaAEditar
      const endpoint = tareaAEditar
        ? "editar_preventivo.php"
        : "crear_preventivo.php";

      const payload = {
        hotel_id: hotelId,
        titulo,
        categoria: categoriaFinal,
        ubicacion: ubicacion || "General",
        frecuencia_dias: frecuencia,
        instrucciones,
      };

      // Si es edición, mandamos el ID y modificamos 'proxima_ejecucion'
      if (tareaAEditar) {
        payload.id = tareaAEditar.id;
        payload.proxima_ejecucion = fechaInicio;
      } else {
        payload.fecha_inicio = fechaInicio;
      }

      const res = await fetch(`${API_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        alertaToast(
          "success",
          tareaAEditar
            ? "✅ Tarea actualizada correctamente."
            : "✅ Rutina preventiva programada.",
        );
        onGuardado();
      } else {
        alertaToast("error", "❌ " + data.message);
      }
    } catch (err) {
      alertaToast("error", "❌ Error de conexión al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
          <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <span>{tareaAEditar ? "✏️" : "📅"}</span>{" "}
            {tareaAEditar
              ? "Editar Tarea Programada"
              : "Programar Mantenimiento"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Hotel / Sede
            </label>
            <select
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
            >
              {hotelesLista?.map((h) => (
                <option key={h.id} value={h.id}>
                  🏨 {h.alias || h.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Título de la Rutina
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Fumigación preventiva"
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Ubicación o Área
              </label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ej. Hab. 101 a 110..."
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => {
                  setCategoria(e.target.value);
                  if (e.target.value !== "Otro") setCategoriaManual("");
                }}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {categoria === "Otro" && (
                <input
                  type="text"
                  value={categoriaManual}
                  onChange={(e) => setCategoriaManual(e.target.value)}
                  placeholder="Escribe la categoría..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold mt-2 border-dashed"
                />
              )}
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Repetir cada (Días)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={frecuencia}
                  onChange={(e) => setFrecuencia(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 pl-10 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">
                  🔄
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
              {tareaAEditar
                ? "Próxima fecha a realizarse"
                : "¿Cuándo inicia o toca la próxima vez?"}
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
              Instrucciones (Opcional)
            </label>
            <textarea
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium h-20 resize-none"
            ></textarea>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md text-sm"
          >
            {guardando
              ? "Guardando..."
              : tareaAEditar
                ? "✅ Actualizar Tarea"
                : "✅ Guardar Rutina"}
          </button>
        </div>
      </div>
    </div>
  );
}
