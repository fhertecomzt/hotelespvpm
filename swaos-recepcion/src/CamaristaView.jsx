import React, { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import ModalReporteDano from "./ModalReporteDano";
import { alertaToast, comprimirImagen } from "./utils";

const API_URL = "/sistema/swaos-api";

const COLORES_ESTATUS = {
  Limpia: "bg-green-100 text-green-800 border-green-300",
  "En Proceso": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Salida Confirmada": "bg-blue-100 text-blue-800 border-blue-300",
  Ocupada: "bg-slate-100 text-slate-800 border-slate-300",
  "Solicitud Aseo": "bg-purple-100 text-purple-800 border-purple-300",
  DND: "bg-red-100 text-red-800 border-red-300",
};

// Recibimos al usuario logueado en las propiedades
export default function CamaristaView({ usuarioActual }) {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(null);
  const [modalDano, setModalDano] = useState(null);
  const [habitacionAEscanear, setHabitacionAEscanear] = useState(null);

  const handleValidarPresencia = (textoDetectado) => {
    if (textoDetectado) {
      try {
        const data = JSON.parse(textoDetectado[0].rawValue);

        // 1. Validamos que sea un QR de SWAOS y que el ID de la etiqueta coincida con el ID que guardamos en 'habitacionAEscanear'
        if (data.sys === "SWAOS") {
          if (parseInt(data.hab_id) === habitacionAEscanear) {
            // ¡ÉXITO! La camarista está en la puerta correcta
            alertaToast(
              "success",
              "📍 Presencia confirmada. ¡Arrancando tiempo!",
            );

            // Disparamos la actualización a la base de datos automáticamente
            handleCambioEstatus(habitacionAEscanear, "En Proceso");

            // Cerramos la cámara
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

  // Cargamos estrictamente las tareas del ID autenticado (soporta modo silencioso para tiempo real)
  const cargarTareas = (id, silencioso = false) => {
    if (!id) return;

    // Solo mostramos la pantalla de carga si NO es una actualización en segundo plano
    if (!silencioso) {
      setCargando(true);
    }

    fetch(`${API_URL}/obtener_tareas_camarista.php?usuario_id=${id}`)
      .then((res) => res.json())
      .then((fetchedData) => {
        setData(fetchedData);
        if (!silencioso) {
          setCargando(false);
        }
      })
      .catch((err) => {
        console.error("Error cargando tareas:", err);
        if (!silencioso) {
          setCargando(false);
        }
      });
  };

  useEffect(() => {
    if (usuarioActual?.id) {
      // 1. Primera carga: muestra el spinner normalmente
      cargarTareas(usuarioActual.id, false);

      // 2. Sincronización automática en vivo (cada 7 segundos y en silencio)
      const intervalo = setInterval(() => {
        cargarTareas(usuarioActual.id, true);
      }, 7000);

      // 3. Limpieza: apaga el temporizador si sale de la vista
      return () => clearInterval(intervalo);
    }
  }, [usuarioActual]);

  const handleCambioEstatus = (habitacionId, nuevoEstatus) => {
    // 1. Actualización optimista en la interfaz para que se sienta rápido
    const nuevasHabitaciones = data.habitaciones.map((hab) => {
      if (hab.id === habitacionId)
        return { ...hab, estatus_operativo: nuevoEstatus };
      return hab;
    });
    setData({ ...data, habitaciones: nuevasHabitaciones });

    // 2. Petición al servidor (Corregida sin la letra "h")
    fetch(`${API_URL}/actualizar_estatus.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        habitacionId: habitacionId, // 🔴 Corregido: Se envía el número puro
        nuevoEstatus: nuevoEstatus,
        usuario_id: usuarioActual.id, // Añadimos el ID por si la bitácora lo requiere
      }),
    })
      .then((res) => res.json())
      .then((respuesta) => {
        // Si el servidor marca error, recargamos los datos para corregir la pantalla
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
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoFoto(habitacionId);

    try {
      const blobComprimido = await comprimirImagen(file);
      const formData = new FormData();
      formData.append("foto", blobComprimido, `evidencia_${habitacionId}.webp`);
      formData.append("habitacion_id", habitacionId);
      formData.append("usuario_id", usuarioActual.id); // Usamos ID real de sesión

      const res = await fetch(`${API_URL}/guardar_evidencia.php`, {
        method: "POST",
        body: formData,
      });
      const respuesta = await res.json();
      if (respuesta.success)
        alertaToast("success", "✅ Evidencia guardada en servidor.");
      else alertaToast("error", `❌ Error: ${respuesta.message}`);
    } catch (error) {
      alertaToast("error", "❌ Error de red o al procesar la imagen del daño.");
    } finally {
      setSubiendoFoto(null);
      e.target.value = "";
    }
  };

  if (!usuarioActual) return null;

  return (
    <div className="bg-slate-900 min-h-screen font-sans pb-16 relative">
      {/* CABECERA LIMPIA (Sin simulador, muestra el nombre y turno real) */}
      <div className="bg-slate-800 text-white p-4 sticky top-0 z-20 shadow-md border-b border-slate-700">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-black text-lg tracking-wide">
              📱 SWAOS Camaristas
            </h1>
            <p className="text-xs text-slate-400">Jornada 9:00 AM - 5:00 PM</p>
          </div>

          <div className="bg-slate-700/80 border border-slate-600 px-3 py-1.5 rounded-lg text-right">
            <span className="block text-xs font-black text-indigo-300 uppercase tracking-wider">
              Turno Activo
            </span>
            <span className="text-xs font-bold text-white">
              👤 {usuarioActual.nombre} {usuarioActual.primer_apellido}
            </span>
          </div>
        </div>
      </div>

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
                          onClick={() => setHabitacionAEscanear(hab.id)}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-3 rounded-lg text-sm shadow flex justify-center gap-1.5"
                        >
                          <span>📷</span> Escanear para Iniciar
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

      {/* MODAL DE REPORTES DE DAÑO REUTILIZABLE */}
      {modalDano && (
        <ModalReporteDano
          habitacionId={modalDano}
          usuarioId={usuarioActual.id}
          onClose={() => setModalDano(null)}
        />
      )}

      {/* MODAL DE VALIDACIÓN DE PRESENCIA CON CÁMARA */}
      {habitacionAEscanear && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fade-in-up">
          <h3 className="text-white font-black text-xl mb-6 flex items-center gap-2">
            <span>📷</span> Escanea la puerta
          </h3>

          <div className="w-full max-w-sm bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-500 relative">
            <Scanner
              onScan={handleValidarPresencia}
              formats={["qr_code"]}
              components={{
                audio: true,
                onOff: true,
                torch: true,
              }}
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
