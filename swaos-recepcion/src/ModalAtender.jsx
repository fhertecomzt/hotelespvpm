import React, { useState } from "react";
import { alertaToast } from "./utils";

const OPCIONES_DIAGNOSTICO = [
  "Esperando refacción / material",
  "Requiere proveedor externo",
  "Trabajo mayor programado",
  "En revisión / diagnóstico",
  "Otro (Especificar)",
];

export default function ModalAtender({ reporteId, onClose, onConfirm }) {
  const [opcion, setOpcion] = useState(OPCIONES_DIAGNOSTICO[0]);
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleGuardar = async () => {
    // Validación: Si elige "Otro", debe escribir forzosamente algo.
    if (opcion === "Otro (Especificar)" && notas.trim() === "") {
      alertaToast(
        "error",
        "⚠️ Por favor especifica los detalles del diagnóstico.",
      );
      return;
    }

    setCargando(true);

    // Unimos la opción seleccionada con las notas escritas (si las hay)
    const diagnosticoFinal =
      notas.trim() !== "" ? `${opcion}: ${notas}` : opcion;

    // Ejecutamos la función que nos mandó el Padre (MantenimientoView)
    await onConfirm(reporteId, diagnosticoFinal);

    setCargando(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in-up">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-xl font-black text-slate-800 border-b pb-3 mb-4 flex items-center gap-2">
          <span className="text-amber-500">🔧</span> Atender Reporte
        </h3>

        <p className="text-xs text-slate-500 mb-4 font-semibold">
          El reporte pasará a estado{" "}
          <span className="text-amber-600 font-bold">"En Reparación"</span>. Por
          favor indica el motivo del estatus:
        </p>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Diagnóstico / Estatus
          </label>
          <select
            value={opcion}
            onChange={(e) => setOpcion(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-400 focus:outline-none font-semibold"
          >
            {OPCIONES_DIAGNOSTICO.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Observaciones (Opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. Se solicitó la pieza a compras. Llega mañana a las 10 AM..."
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-400 focus:outline-none h-24 resize-none"
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
            onClick={handleGuardar}
            disabled={cargando}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow-md transition-colors disabled:opacity-50"
          >
            {cargando ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
