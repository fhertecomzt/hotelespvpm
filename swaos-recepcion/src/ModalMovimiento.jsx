import React, { useState } from "react";
import { alertaToast } from "./utils";

const API_URL = import.meta.env.DEV
  ? "http://localhost/hotelespvpm/sistema/swaos-api"
  : "/sistema/swaos-api";

export default function ModalMovimiento({
  producto,
  tipo,
  usuarioActual,
  onClose,
  onSuccess,
}) {
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState(
    tipo === "Entrada" ? "Compra Nueva" : "Surtido Camarista",
  );
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  const token = localStorage.getItem("swaos_token");
  const esEntrada = tipo === "Entrada";

  // Opciones de justificación según el tipo de movimiento
  const opcionesMotivo = esEntrada
    ? ["Compra Nueva", "Devolución", "Ajuste por Sobrante", "Otro"]
    : [
        "Surtido Camarista",
        "Reporte Mantenimiento",
        "Merma/Daño",
        "Ajuste por Faltante",
        "Otro",
      ];

  // Cálculo en vivo para que el usuario vea cómo quedará el stock
  const stockActual = parseFloat(producto.stock_actual);
  const valorIngresado = parseFloat(cantidad) || 0;
  const stockProyectado = esEntrada
    ? stockActual + valorIngresado
    : stockActual - valorIngresado;

  const handleGuardar = async (e) => {
    e.preventDefault();

    if (valorIngresado <= 0) {
      alertaToast("error", "⚠️ La cantidad debe ser mayor a cero.");
      return;
    }

    if (!esEntrada && stockProyectado < 0) {
      alertaToast(
        "error",
        `⚠️ Stock insuficiente. Solo tienes ${stockActual} ${producto.unidad_medida}.`,
      );
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/registrar_movimiento.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          producto_id: producto.id,
          usuario_id: usuarioActual?.id,
          tipo_movimiento: tipo,
          cantidad: valorIngresado,
          motivo: motivo,
          notas: notas,
        }),
      });

      const respuesta = await res.json();

      if (respuesta.success) {
        alertaToast("success", `✅ ${tipo} registrada correctamente.`);
        onSuccess(); // Recarga la vista del inventario
        onClose();
      } else {
        alertaToast(
          "error",
          "❌ " + (respuesta.message || "Error al registrar el movimiento."),
        );
      }
    } catch (err) {
      console.error(err);
      alertaToast("error", "❌ Error de red al procesar el movimiento.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in-up">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
          <span className={esEntrada ? "text-indigo-500" : "text-rose-500"}>
            {esEntrada ? "➕" : "➖"} Registrar {tipo}
          </span>
        </h3>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl mb-5 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">
            Producto seleccionado
          </p>
          <p className="text-sm font-black text-slate-800 dark:text-white">
            {producto.nombre}
          </p>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500">
              Stock actual:
            </span>
            <span className="text-sm font-black bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
              {stockActual} {producto.unidad_medida}
            </span>
          </div>
        </div>

        <form onSubmit={handleGuardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Cantidad a {esEntrada ? "Ingresar" : "Retirar"}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                autoFocus
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-lg text-center focus:ring-2 focus:ring-indigo-500 outline-none font-black text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex flex-col justify-end">
              <div
                className={`p-2.5 rounded-xl border text-center ${stockProyectado < 0 ? "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900" : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900"}`}
              >
                <span className="block text-[10px] font-bold text-slate-500 uppercase">
                  Stock Final
                </span>
                <span
                  className={`text-lg font-black ${stockProyectado < 0 ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {isNaN(stockProyectado) ? stockActual : stockProyectado}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Motivo / Justificación
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800 dark:text-white"
            >
              {opcionesMotivo.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Notas / Detalles (Opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder={
                esEntrada
                  ? "Ej. Factura #1234, proveedor local..."
                  : "Ej. Para carrito de limpieza piso 2..."
              }
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-16 resize-none"
            ></textarea>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || stockProyectado < 0}
              className={`flex-1 text-white font-bold py-3 rounded-xl shadow-md transition-colors disabled:opacity-50 text-sm ${esEntrada ? "bg-indigo-600 hover:bg-indigo-700" : "bg-rose-600 hover:bg-rose-700"}`}
            >
              {guardando ? "Procesando..." : `Confirmar ${tipo}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
