import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ModalExportarKardex({
  movimientos,
  hoteles,
  filtroHotelActual,
  esGestorAlmacen,
  onClose,
}) {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const diaActual = hoy.toISOString().split("T")[0];

  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(diaActual);

  // NUEVO: Estado del hotel dentro del modal (inicia con el que tenías en la tabla)
  const [hotelReporte, setHotelReporte] = useState(
    filtroHotelActual || "Todos",
  );

  // NUEVO: Helper para obtener el nombre real del hotel (para el PDF/Excel)
  const getNombreHotel = (id) => {
    const h = hoteles?.find((item) => Number(item.id) === Number(id));
    return h ? h.alias || h.nombre : `Hotel ${id}`;
  };

  // NUEVO: La lógica de filtrado ahora evalúa fecha Y hotel
  const movimientosAExportar = movimientos.filter((mov) => {
    const fechaMov = mov.fecha_movimiento.split(" ")[0];
    const entraEnFecha = fechaMov >= fechaInicio && fechaMov <= fechaFin;
    const entraEnHotel =
      hotelReporte === "Todos" || Number(mov.hotel_id) === Number(hotelReporte);

    return entraEnFecha && entraEnHotel;
  });

  const generarPDF = () => {
    if (movimientosAExportar.length === 0)
      return alert("No hay movimientos con estos filtros.");

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reporte de Movimientos de Almacén (Kardex)", 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);

    // Si seleccionó un hotel específico, lo mostramos en el subtítulo
    const nombreSede =
      hotelReporte === "Todos"
        ? "Todos los Hoteles"
        : getNombreHotel(hotelReporte);
    doc.text(
      `Sede: ${nombreSede} | Periodo: ${fechaInicio} al ${fechaFin}`,
      14,
      28,
    );

    const columnas = [
      "Fecha",
      "Hotel",
      "Producto",
      "Tipo",
      "Cant.",
      "Stock Final",
      "Usuario",
      "Motivo",
    ];
    const filas = movimientosAExportar.map((m) => [
      m.fecha_movimiento.substring(0, 16),
      getNombreHotel(m.hotel_id), // Uso del helper dinámico
      m.producto_nombre,
      m.tipo_movimiento,
      `${m.tipo_movimiento === "Entrada" || m.tipo_movimiento === "Ajuste" ? "+" : "-"}${parseFloat(m.cantidad)}`,
      parseFloat(m.stock_nuevo),
      m.usuario_nombre || "Sistema",
      m.motivo || "-",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [columnas],
      body: filas,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`Kardex_${nombreSede.replace(/ /g, "_")}_${fechaInicio}.pdf`);
    onClose();
  };

  const generarExcel = () => {
    if (movimientosAExportar.length === 0)
      return alert("No hay movimientos con estos filtros.");

    const datosExcel = movimientosAExportar.map((m) => ({
      "Fecha y Hora": m.fecha_movimiento,
      Hotel: getNombreHotel(m.hotel_id), // Uso del helper dinámico
      Producto: m.producto_nombre,
      "Tipo de Movimiento": m.tipo_movimiento,
      Cantidad: parseFloat(m.cantidad),
      "Stock Resultante": parseFloat(m.stock_nuevo),
      "Usuario que registró": m.usuario_nombre || "Sistema",
      Motivo: m.motivo || "-",
    }));

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Kardex Histórico");

    const nombreSede =
      hotelReporte === "Todos" ? "Global" : getNombreHotel(hotelReporte);
    XLSX.writeFile(libro, `Kardex_${nombreSede}_${fechaInicio}.xlsx`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-xl font-black text-slate-800 dark:text-white">
            🖨️ Exportar Reporte
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
            Selecciona los filtros para generar tu documento.
          </p>

          {/* NUEVO: Selector de Hotel (Solo si es gestor/administrador) */}
          {esGestorAlmacen && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Hotel / Sede
              </label>
              <select
                value={hotelReporte}
                onChange={(e) => setHotelReporte(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
              >
                <option value="Todos">🏢 Todos los Hoteles (Global)</option>
                {hoteles?.map((h) => (
                  <option key={h.id} value={h.id}>
                    🏨 {h.alias || h.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>
          </div>

          <div className="pt-2 text-center text-sm font-bold text-slate-600 dark:text-slate-300">
            Movimientos a exportar:{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              {movimientosAExportar.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={generarPDF}
              className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 p-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 shadow-sm"
            >
              <span className="text-2xl">📄</span>
              PDF
            </button>
            <button
              onClick={generarExcel}
              className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 p-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 shadow-sm"
            >
              <span className="text-2xl">📊</span>
              Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
