import React, { useState } from "react";
import { alertaToast, comprimirImagen } from "./utils";

const API_URL = "/sistema/swaos-api";
const TIPOS_DANO = [
  "Aire Acondicionado",
  "Plomería",
  "Eléctrico",
  "Mobiliario",
  "Otro",
];

export default function ModalReporteDano({ habitacionId, usuarioId, onClose }) {
  const [tipoDano, setTipoDano] = useState(TIPOS_DANO[0]);
  const [descDano, setDescDano] = useState("");
  const [fotoDano, setFotoDano] = useState(null);
  const [enviandoReporte, setEnviandoReporte] = useState(false);

  const enviarReporteDano = async () => {
    if (!descDano || descDano.trim() === "") {
      alertaToast(
        "error",
        "⚠️ Por favor describe cuál es la falla antes de enviar.",
      );
      return;
    }

    setEnviandoReporte(true);
    try {
      const formData = new FormData();
      formData.append("habitacion_id", habitacionId);
      formData.append("usuario_id", usuarioId);
      formData.append("tipo_dano", tipoDano);
      formData.append("descripcion", descDano);

      if (fotoDano) {
        const blobComprimido = await comprimirImagen(fotoDano);
        formData.append("foto", blobComprimido, `dano_${habitacionId}.webp`);
      }

      const res = await fetch(`${API_URL}/reportar_dano.php`, {
        method: "POST",
        body: formData,
      });
      const respuesta = await res.json();

      if (respuesta.success) {
        alertaToast("success", "⚠️ Falla reportada a Mantenimiento");
        onClose(); // Esto cierra el modal automáticamente
      } else {
        alertaToast("error", "❌ Error" + respuesta.message);
      }
    } catch (err) {
      alertaToast("error", "❌ Error de red o al procesar la imagen del daño.");
    } finally {
      setEnviandoReporte(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-xl font-black text-slate-800 border-b pb-3 mb-4 flex items-center gap-2">
          <span>⚠️</span> Reportar Daño
        </h3>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
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

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Evidencia Fotográfica (Opcional)
          </label>
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
            onClick={() => document.getElementById("foto-dano-input").click()}
            className={`w-full border border-dashed font-semibold p-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors ${fotoDano ? "bg-red-50 border-red-400 text-red-700" : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"}`}
          >
            <span>📸</span>{" "}
            {fotoDano
              ? `Foto lista: ${fotoDano.name.substring(0, 18)}...`
              : "Tomar / Adjuntar foto del daño"}
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Detalles (Opcional)
          </label>
          <textarea
            value={descDano}
            onChange={(e) => setDescDano(e.target.value)}
            placeholder="Ej. La llave del lavabo está goteando..."
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-red-400 focus:outline-none h-20 resize-none"
          ></textarea>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
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
  );
}
