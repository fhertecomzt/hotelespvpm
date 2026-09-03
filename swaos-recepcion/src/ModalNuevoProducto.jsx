import React, { useState } from "react";
import { alertaToast } from "./utils";

const API_URL = import.meta.env.DEV
  ? "http://localhost/hotelespvpm/sistema/swaos-api"
  : "/sistema/swaos-api";

export default function ModalNuevoProducto({
  usuarioActual,
  onClose,
  onSuccess,
}) {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("Limpieza");
  const [unidad, setUnidad] = useState("Pza");
  const [stockInicial, setStockInicial] = useState("");
  const [stockMinimo, setStockMinimo] = useState("5");
  const [qr, setQr] = useState("");
  const [guardando, setGuardando] = useState(false);

  const token = localStorage.getItem("swaos_token");

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alertaToast("error", "⚠️ El nombre del producto es obligatorio.");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/crear_producto.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre,
          categoria,
          unidad_medida: unidad,
          stock_inicial: stockInicial || 0,
          stock_minimo: stockMinimo || 0,
          codigo_qr: qr,
          hotel_id: usuarioActual?.hotel_id || 1,
          usuario_id: usuarioActual?.id,
        }),
      });

      const respuesta = await res.json();

      if (respuesta.success) {
        alertaToast("success", "✅ " + respuesta.message);
        onSuccess(); // Recarga la lista
        onClose(); // Cierra el modal
      } else {
        alertaToast("error", "❌ " + respuesta.message);
      }
    } catch (err) {
      console.error(err);
      alertaToast("error", "❌ Error de conexión al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in-up">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
        <h3 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
          <span className="text-indigo-500">➕</span> Nuevo Producto
        </h3>

        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Nombre del Producto
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Limpiador Multiusos Fabuloso..."
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800 dark:text-white"
              >
                <option value="Limpieza">Limpieza</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Amenidades">Amenidades</option>
                <option value="Blancos">Blancos</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Unidad
              </label>
              <input
                type="text"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                placeholder="Ej. Galones, Pza..."
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Stock Inicial
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={stockInicial}
                onChange={(e) => setStockInicial(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Alerta Mínima
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Código QR / Barras (Opcional)
            </label>
            <input
              type="text"
              value={qr}
              onChange={(e) => setQr(e.target.value)}
              placeholder="Escanea o escribe el código..."
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-800 dark:text-white"
            />
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
              disabled={guardando}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors disabled:opacity-50 text-sm"
            >
              {guardando ? "Guardando..." : "Guardar Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
