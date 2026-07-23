import React, { useState, useEffect } from "react";

const API_URL = "http://localhost/hotelespvpm/sistema/swaos-api";

const COLORES_ESTATUS = {
  Limpia: "bg-green-100 text-green-800 border-green-300",
  "En Proceso": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Salida Confirmada": "bg-blue-100 text-blue-800 border-blue-300",
  Ocupada: "bg-slate-100 text-slate-800 border-slate-300",
  "Solicitud Aseo": "bg-purple-100 text-purple-800 border-purple-300",
  DND: "bg-red-100 text-red-800 border-red-300",
};

const TIPOS_DANO = [
  "Aire Acondicionado",
  "Plomería",
  "Eléctrico",
  "Mobiliario",
  "Otro",
];

export default function CamaristaView() {
  const [camaristaId, setCamaristaId] = useState(1);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(null);

  // Estados para el Modal de Reporte de Daños
  const [modalDano, setModalDano] = useState(null); // Guarda el ID de la habitación
  const [tipoDano, setTipoDano] = useState(TIPOS_DANO[0]);
  const [descDano, setDescDano] = useState("");
  const [fotoDano, setFotoDano] = useState(null);
  const [enviandoReporte, setEnviandoReporte] = useState(false);

  const cargarTareas = (id) => {
    setCargando(true);
    fetch(`${API_URL}/obtener_tareas_camarista.php?usuario_id=${id}`)
      .then((res) => res.json())
      .then((fetchedData) => {
        setData(fetchedData);
        setCargando(false);
      })
      .catch((err) => {
        console.error("Error cargando tareas:", err);
        setCargando(false);
      });
  };

  useEffect(() => {
    cargarTareas(camaristaId);
  }, [camaristaId]);

  const handleCambioEstatus = (habitacionId, nuevoEstatus) => {
    const nuevasHabitaciones = data.habitaciones.map((hab) => {
      if (hab.id === habitacionId)
        return { ...hab, estatus_operativo: nuevoEstatus };
      return hab;
    });
    setData({ ...data, habitaciones: nuevasHabitaciones });

    fetch(`${API_URL}/actualizar_estatus.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        habitacionId: `h${habitacionId}`,
        nuevoEstatus: nuevoEstatus,
      }),
    }).catch((err) => console.error("Error:", err));
  };

  const comprimirImagen = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => resolve(blob), "image/webp", 0.75);
        };
      };
    });
  };

  const handleTomarFoto = async (e, habitacionId) => {
    const file = e.target.files[0];
    if (!file) return;

    setSubiendoFoto(habitacionId);

    try {
      const blobComprimido = await comprimirImagen(file);
      const formData = new FormData();
      formData.append("foto", blobComprimido, `evidencia_${habitacionId}.webp`);
      formData.append("habitacion_id", habitacionId);
      formData.append("usuario_id", camaristaId);

      const res = await fetch(`${API_URL}/guardar_evidencia.php`, {
        method: "POST",
        body: formData,
      });
      const respuesta = await res.json();

      if (respuesta.success) alert(`✅ Evidencia guardada en servidor.`);
      else alert(`❌ Error al guardar: ${respuesta.message}`);
    } catch (error) {
      alert("❌ Ocurrió un error al procesar la imagen.");
    } finally {
      setSubiendoFoto(null);
      e.target.value = "";
    }
  };

  // Función para enviar el reporte de daño al backend
const enviarReporteDano = async () => {
  if (!modalDano) return;
  setEnviandoReporte(true);

  try {
    const formData = new FormData();
    formData.append("habitacion_id", modalDano);
    formData.append("usuario_id", camaristaId);
    formData.append("tipo_dano", tipoDano);
    formData.append("descripcion", descDano);

    // Si seleccionaron foto, la comprimimos a WebP antes de enviarla
    if (fotoDano) {
      const blobComprimido = await comprimirImagen(fotoDano);
      formData.append("foto", blobComprimido, `dano_${modalDano}.webp`);
    }

    const res = await fetch(`${API_URL}/reportar_dano.php`, {
      method: "POST",
      body: formData,
    });
    const respuesta = await res.json();

    if (respuesta.success) {
      alert("⚠️ Reporte y evidencia enviados a mantenimiento exitosamente.");
      setModalDano(null);
      setTipoDano(TIPOS_DANO[0]);
      setDescDano("");
      setFotoDano(null); // Limpiamos la foto
    } else {
      alert("❌ Error: " + respuesta.message);
    }
  } catch (err) {
    console.error("Error al reportar:", err);
    alert("❌ Error de red o al procesar la imagen del daño.");
  } finally {
    setEnviandoReporte(false);
  }
};

  return (
    <div className="bg-slate-900 min-h-screen font-sans pb-16 relative">
      {/* Barra superior */}
      <div className="bg-slate-800 text-white p-4 sticky top-0 z-20 shadow-md border-b border-slate-700">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-black text-lg tracking-wide">
              📱 SWAOS Camaristas
            </h1>
            <p className="text-xs text-slate-400">Jornada 9:00 AM - 5:00 PM</p>
          </div>
          <select
            value={camaristaId}
            onChange={(e) => setCamaristaId(e.target.value)}
            className="bg-slate-700 text-white text-xs font-bold py-1.5 px-2 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="1">👤 Raquel (ID 1)</option>
            <option value="2">👤 María (ID 2)</option>
            <option value="3">👤 Carmen (ID 3)</option>
          </select>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 mt-2">
        {cargando && (
          <div className="text-center py-12 text-slate-400 font-bold animate-pulse">
            Cargando habitaciones...
          </div>
        )}

        {!cargando && data && !data.sin_asignacion && (
          <>
            <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg mb-6 flex justify-between items-center">
              <div>
                <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">
                  Tu zona hoy
                </span>
                <h2 className="text-xl font-black">{data.zona.nombre}</h2>
              </div>
              <div className="bg-indigo-700 px-3 py-1 rounded-lg text-sm font-bold border border-indigo-500">
                {data.habitaciones.length} Hab.
              </div>
            </div>

            <div className="space-y-4">
              {data.habitaciones.map((hab) => {
                const badgeColor =
                  COLORES_ESTATUS[hab.estatus_operativo] ||
                  "bg-slate-100 text-slate-800";
                const esLimpia = hab.estatus_operativo === "Limpia";
                const enProceso = hab.estatus_operativo === "En Proceso";
                const estaSubiendo = subiendoFoto === hab.id;

                return (
                  <div
                    key={hab.id}
                    className={`bg-white rounded-xl p-4 shadow-md border transition-all ${esLimpia ? "opacity-70 border-slate-200" : "border-slate-300"}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-2xl font-black text-slate-800">
                          Hab. {hab.numero}
                        </span>
                        <span className="block text-xs font-semibold text-slate-400 uppercase mt-0.5">
                          {hab.tipo}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}
                      >
                        {hab.estatus_operativo}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                      {!enProceso && !esLimpia && (
                        <button
                          onClick={() =>
                            handleCambioEstatus(hab.id, "En Proceso")
                          }
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-3 rounded-lg text-sm shadow flex justify-center gap-1.5"
                        >
                          <span>🧹</span> Iniciar Aseo
                        </button>
                      )}

                      {enProceso && (
                        <button
                          onClick={() => handleCambioEstatus(hab.id, "Limpia")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-lg text-sm shadow flex justify-center gap-1.5 animate-pulse"
                        >
                          <span>✨</span> Marcar Limpia
                        </button>
                      )}

                      {esLimpia && (
                        <div className="flex-1 text-center py-2 text-emerald-600 font-bold text-sm bg-emerald-50 rounded-lg border border-emerald-200">
                          ✓ Terminada
                        </div>
                      )}

                      {/* Botón de Cámara */}
                      <input
                        type="file"
                        id={`camara-${hab.id}`}
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleTomarFoto(e, hab.id)}
                        className="hidden"
                      />
                      <button
                        onClick={() =>
                          document.getElementById(`camara-${hab.id}`).click()
                        }
                        disabled={estaSubiendo}
                        title="Evidencia"
                        className="bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 font-bold p-2.5 rounded-lg text-sm border flex justify-center"
                      >
                        {estaSubiendo ? "⏳" : "📸"}
                      </button>

                      {/* NUEVO BOTÓN: Reportar Daño */}
                      {!esLimpia && (
                        <button
                          onClick={() => setModalDano(hab.id)}
                          title="Reportar Daño"
                          className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold p-2.5 rounded-lg text-sm transition-colors"
                        >
                          ⚠️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* MODAL DE REPORTES DE DAÑO */}
      {modalDano && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 border-b pb-3 mb-4 flex items-center gap-2">
              <span>⚠️</span> Reportar Daño
            </h3>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                <input
                  type="file"
                  id="foto-dano-input"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFotoDano(e.target.files[0])}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("foto-dano-input").click()
                  }
                  className={`w-full border border-dashed font-semibold p-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors ${fotoDano ? "bg-red-50 border-red-400 text-red-700" : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"}`}
                >
                  <span>📸</span>{" "}
                  {fotoDano
                    ? `Foto lista: ${fotoDano.name.substring(0, 18)}...`
                    : "Tomar / Adjuntar foto del daño"}
                </button>
                ¿Qué está fallando?
              </label>
              <select
                value={tipoDano}
                onChange={(e) => setTipoDano(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-red-400 focus:outline-none"
              >
                {TIPOS_DANO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Detalles (Opcional)
              </label>
              <textarea
                value={descDano}
                onChange={(e) => setDescDano(e.target.value)}
                placeholder="Ej. La llave del lavabo está goteando..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-red-400 focus:outline-none h-24 resize-none"
              ></textarea>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalDano(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={enviarReporteDano}
                disabled={enviandoReporte}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                {enviandoReporte ? "Enviando..." : "Enviar Reporte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
