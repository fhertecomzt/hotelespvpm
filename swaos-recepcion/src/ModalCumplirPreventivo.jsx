import React, { useState } from "react";
import { alertaToast, comprimirImagen } from "./utils";

const API_URL = import.meta.env.DEV
  ? "http://localhost/hotelespvpm/sistema/swaos-api"
  : "/sistema/swaos-api";

export default function ModalCumplirPreventivo({
  tarea,
  usuarioActual,
  onClose,
  onGuardado,
}) {
  const [notas, setNotas] = useState("");
  const [foto, setFoto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const token = localStorage.getItem("swaos_token");

  const handleCumplir = async () => {
    // Candado de seguridad offline
    if (!navigator.onLine) {
      return alertaToast(
        "error",
        "⚡ Sin conexión. Acércate a la red para enviar la evidencia.",
      );
    }

    setGuardando(true);
    try {
      const formData = new FormData();
      formData.append("tarea_id", tarea.id);
      formData.append("usuario_id", usuarioActual?.id || 1);
      formData.append("notas_trabajo", notas);

      if (foto) {
        const blobComprimido = await comprimirImagen(foto);
        formData.append("foto", blobComprimido, `prev_${tarea.id}.webp`);
      }

      const res = await fetch(`${API_URL}/cumplir_preventivo.php`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const respuesta = await res.json();

      if (respuesta.success) {
        alertaToast(
          "success",
          "✅ Tarea registrada. ¡El calendario se ha actualizado!",
        );
        onGuardado();
      } else {
        alertaToast("error", "❌ " + respuesta.message);
      }
    } catch (err) {
      console.error(err);
      alertaToast("error", "Fallo de conexión al enviar evidencia");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
          <span>✅</span> Registrar Cumplimiento
        </h3>

        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl mb-4 border border-indigo-100 dark:border-indigo-800">
          <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
            Estás a punto de completar:
          </p>
          <p className="font-black text-slate-800 dark:text-white">
            {tarea.titulo}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            Al confirmar, esta tarea se reprogramará automáticamente para dentro
            de {tarea.frecuencia_dias} días.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
            Observaciones o Notas del Trabajo
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. Se encontraron filtros muy sucios, se recomienda cambiarlos la próxima vez..."
            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium h-20 resize-none text-slate-800 dark:text-white"
          ></textarea>
        </div>

        <div className="mb-6">
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
            Evidencia Fotográfica (Opcional)
          </label>
          <input
            type="file"
            id="foto-prev-input"
            accept="image/*"
            onChange={(e) => setFoto(e.target.files[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => document.getElementById("foto-prev-input").click()}
            className={`w-full border border-dashed font-semibold p-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors ${
              foto
                ? "bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
            }`}
          >
            <span>📸</span>
            {foto
              ? `Foto lista: ${foto.name.substring(0, 20)}...`
              : "Adjuntar foto del trabajo realizado"}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCumplir}
            disabled={guardando}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 text-sm transition-colors"
          >
            {guardando ? "Registrando..." : "✅ Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
