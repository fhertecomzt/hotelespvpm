import React, { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import ModalReporteDano from "./ModalReporteDano";
import { alertaToast, comprimirImagen } from "./utils";

const API_URL = "/sistema/swaos-api";

// NUEVOS COLORES MODO OSCURO
const COLORES_ESTATUS = {
  Limpia: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "En Proceso": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Salida Confirmada": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Ocupada: "bg-slate-500/30 text-slate-300 border-slate-500/40",
  "Solicitud Aseo": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DND: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function CamaristaView({ usuarioActual }) {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(null);
  const [modalDano, setModalDano] = useState(null);
  const [habitacionAEscanear, setHabitacionAEscanear] = useState(null);
  const token = localStorage.getItem("swaos_token");

  const handleValidarPresencia = (textoDetectado) => {
    if (textoDetectado) {
      try {
        const data = JSON.parse(textoDetectado[0].rawValue);
        if (data.sys === "SWAOS") {
          if (parseInt(data.hab_id) === habitacionAEscanear) {
            alertaToast(
              "success",
              "📍 Presencia confirmada. ¡Arrancando tiempo!",
            );
            handleCambioEstatus(habitacionAEscanear, "En Proceso");
            setHabitacionAEscanear(null);
          } else {
            alertaToast(
              "error",
              `❌ Error: Escaneaste la Hab. ${data.num}. Debes estar en la correcta.`,
            );
          }
        } else {
          alertaToast("error", "❌ El código no pertenece a este hotel.");
        }
      } catch (err) {
        alertaToast("error", "❌ Formato de QR inválido o dañado.");
      }
    }
  };

  const cargarTareas = (id, silencioso = false) => {
    if (!id) return;
    if (!silencioso) setCargando(true);

    fetch(`${API_URL}/obtener_tareas_camarista.php?usuario_id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((fetchedData) => {
        setData(fetchedData);
        if (!silencioso) setCargando(false);
      })
      .catch((err) => {
        console.error("Error cargando tareas:", err);
        if (!silencioso) setCargando(false);
      });
  };

  useEffect(() => {
    document.title = `SWAOS | Camarista: ${usuarioActual?.nombre || ""}`;
    const favicon = document.getElementById("favicon");
    if (favicon) favicon.href = "/icono-limpieza.ico";
  }, [usuarioActual]);

  useEffect(() => {
    if (usuarioActual?.id) {
      cargarTareas(usuarioActual.id, false);
      const intervalo = setInterval(() => {
        cargarTareas(usuarioActual.id, true);
      }, 7000);
      return () => clearInterval(intervalo);
    }
  }, [usuarioActual]);

  const handleCambioEstatus = (habitacionId, nuevoEstatus) => {
    if (!navigator.onLine) {
      alertaToast(
        "error",
        "⚡ Sin conexión. Acércate a la red para registrar el cambio.",
      );
      return;
    }

    const nuevasHabitaciones = data.habitaciones.map((hab) => {
      if (hab.id === habitacionId)
        return { ...hab, estatus_operativo: nuevoEstatus };
      return hab;
    });
    setData({ ...data, habitaciones: nuevasHabitaciones });

    fetch(`${API_URL}/actualizar_estatus.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        habitacionId: habitacionId,
        nuevoEstatus: nuevoEstatus,
        usuario_id: usuarioActual.id,
      }),
    })
      .then((res) => res.json())
      .then((respuesta) => {
        if (!respuesta.success) {
          console.error("El backend no pudo actualizar:", respuesta.message);
          cargarTareas(usuarioActual.id, true);
          alertaToast("error", "❌ Error al cambiar estatus");
        }
      })
      .catch((err) => {
        console.error("Error de conexión:", err);
        cargarTareas(usuarioActual.id, true);
      });
  };

  const handleTomarFoto = async (e, habitacionId) => {
    if (!navigator.onLine) {
      alertaToast(
        "error",
        "⚡ Sin conexión. No se puede subir la foto en este momento.",
      );
      e.target.value = "";
      return;
    }

    const file = e.target.files[0];
    if (!file) return;
    setSubiendoFoto(habitacionId);

    try {
      const blobComprimido = await comprimirImagen(file);
      const formData = new FormData();
      formData.append("foto", blobComprimido, `evidencia_${habitacionId}.webp`);
      formData.append("habitacion_id", habitacionId);
      formData.append("usuario_id", usuarioActual.id);

      const res = await fetch(`${API_URL}/guardar_evidencia.php`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const respuesta = await res.json();
      if (respuesta.success) {
        alertaToast("success", "✅ Evidencia guardada en servidor.");
      } else {
        alertaToast("error", `❌ Error: ${respuesta.message}`);
      }
    } catch (error) {
      console.error("🚨 DETALLE DEL ERROR AL SUBIR FOTO:", error);
      alertaToast("error", "❌ Error de red o al procesar la imagen del daño.");
    } finally {
      setSubiendoFoto(null);
      e.target.value = "";
    }
  };

  if (!usuarioActual) return null;

  return (
    <div className="bg-slate-50 dark:bg-[#131620] min-h-screen font-sans pb-16 relative">
      {/* NOTA: El encabezado superior se eliminó porque ahora lo controla App.jsx */}

      <div className="max-w-md mx-auto p-4 mt-2">
        {cargando && (
          <div className="text-center py-12 text-slate-400 font-bold animate-pulse">
            Cargando habitaciones asignadas...
          </div>
        )}

        {!cargando && data && data.sin_asignacion && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center mt-6 shadow-lg">
            <div className="text-4xl mb-3">☕</div>
            <h2 className="text-white font-bold text-lg mb-1">
              Sin Zona Asignada
            </h2>
            <p className="text-slate-400 text-sm">{data.mensaje}</p>
          </div>
        )}

        {!cargando && data && !data.sin_asignacion && (
          <>
            <div className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white p-5 rounded-2xl shadow-lg mb-6 flex justify-between items-center">
              <div>
                <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider mb-1 block">
                  Tu zona hoy
                </span>
                <h2 className="text-xl font-black leading-none mb-1">
                  {data.zona.nombre}
                </h2>
              </div>
              <div className="bg-white/20 backdrop-blur-md w-14 h-14 rounded-full flex flex-col items-center justify-center border border-white/30 shadow-inner shrink-0">
                <span className="text-xl font-black leading-none">
                  {data.habitaciones.length}
                </span>
                <span className="text-[9px] uppercase font-bold leading-none mt-1">
                  Hab.
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {data.habitaciones.map((hab) => {
                const badgeColor =
                  COLORES_ESTATUS[hab.estatus_operativo] ||
                  "bg-slate-700 text-slate-300";
                const esLimpia = hab.estatus_operativo === "Limpia";
                const enProceso = hab.estatus_operativo === "En Proceso";
                const estaSubiendo = subiendoFoto === hab.id;

                return (
                  <div
                    key={hab.id}
                    className={`bg-white dark:bg-[#1c2130] rounded-2xl p-4 shadow-lg border transition-all ${esLimpia ? "opacity-60 border-emerald-900/50" : "border-slate-200 dark:border-slate-700/50"}`}
                  >
                    <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-700/50 pb-3">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-800 dark:text-white">
                            {hab.numero}
                          </span>
                        </div>
                        <span className="block text-[11px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
                          {hab.tipo}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase tracking-wider shadow-sm ${badgeColor}`}
                      >
                        {hab.estatus_operativo}
                      </span>
                    </div>

                    {/* BOTONES CON GRID RÍGIDO PARA MÓVIL */}
                    <div
                      className={`grid gap-2 items-stretch mt-2 ${esLimpia ? "grid-cols-[1fr_64px]" : "grid-cols-[1fr_64px_64px]"}`}
                    >
                      {!enProceso && !esLimpia && (
                        <button
                          onClick={() => setHabitacionAEscanear(hab.id)}
                          className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg flex items-center justify-center gap-1.5 p-2 transition-transform active:scale-95"
                        >
                          <span className="text-xl">📷</span>
                          <span className="text-[10px] leading-[1.1] text-left uppercase font-black tracking-wide">
                            Escanear e<br />
                            Iniciar
                          </span>
                        </button>
                      )}

                      {enProceso && (
                        <button
                          onClick={() => handleCambioEstatus(hab.id, "Limpia")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg flex items-center justify-center gap-1.5 p-2 animate-pulse transition-transform active:scale-95"
                        >
                          <span className="text-xl">✨</span>
                          <span className="text-[10px] leading-[1.1] text-left uppercase font-black tracking-wide">
                            Finalizar
                            <br />
                            Limpieza
                          </span>
                        </button>
                      )}

                      {esLimpia && (
                        <div className="flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50 p-2">
                          ✓ Limpieza Terminada
                        </div>
                      )}

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
                        className="bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600/50 text-slate-700 dark:text-slate-300 rounded-xl flex flex-col items-center justify-center py-1.5 transition-transform active:scale-95"
                      >
                        <span className="text-lg mb-0.5">
                          {estaSubiendo ? "⏳" : "📸"}
                        </span>
                        <span className="text-[9px] font-bold tracking-wider">
                          FOTOS
                        </span>
                      </button>

                      {!esLimpia && (
                        <button
                          onClick={() => setModalDano(hab.id)}
                          className="bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl flex flex-col items-center justify-center py-1.5 transition-transform active:scale-95"
                        >
                          <span className="text-lg mb-0.5">⚠️</span>
                          <span className="text-[9px] font-bold tracking-wider">
                            REPORTAR
                          </span>
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

      {modalDano && (
        <ModalReporteDano
          habitacionId={modalDano}
          usuarioId={usuarioActual.id}
          onClose={() => setModalDano(null)}
        />
      )}

      {habitacionAEscanear && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fade-in-up">
          <h3 className="text-white font-black text-xl mb-6 flex items-center gap-2">
            <span>📷</span> Escanea la puerta
          </h3>
          <div className="w-full max-w-sm bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-500 relative">
            <Scanner
              onScan={handleValidarPresencia}
              formats={["qr_code"]}
              components={{ audio: true, onOff: true, torch: true }}
            />
            <div className="absolute top-0 left-0 right-0 bg-black/60 p-2 text-center">
              <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">
                Validando ubicación física
              </p>
            </div>
          </div>
          <button
            onClick={() => setHabitacionAEscanear(null)}
            className="mt-8 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-colors"
          >
            ✖ Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
