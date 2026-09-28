import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ModalExportarMantenimiento({
  reportes,
  hoteles,
  filtroHotelActual,
  filtroEstatusActual,
  filtroBusquedaActual,
  tecnicosUnicos,
  onClose,
}) {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const diaActual = hoy.toISOString().split("T")[0];

  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(diaActual);

  const [hotelReporte, setHotelReporte] = useState(filtroHotelActual || "0");
  const [estatusReporte, setEstatusReporte] = useState(
    filtroEstatusActual === "Todos" ? "Todos" : filtroEstatusActual,
  );
  const [empleadoReporte, setEmpleadoReporte] = useState("Todos");
  const [busquedaReporte, setBusquedaReporte] = useState(
    filtroBusquedaActual || "",
  );

  const getNombreHotel = (id) => {
    const h = hoteles?.find((item) => Number(item.id) === Number(id));
    return h ? h.alias || h.nombre : `Hotel ${id}`;
  };

  // CALCULADORA GENÉRICA DE TIEMPO
  const calcularTiempo = (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) return "Pendiente";

    const inicio = new Date(fechaInicio.replace(/-/g, "/"));
    const fin = new Date(fechaFin.replace(/-/g, "/"));

    const diffMs = fin - inicio;
    if (diffMs < 0) return "Error en fechas";

    const diffMins = Math.floor(diffMs / 60000);
    const dias = Math.floor(diffMins / 1440);
    const horas = Math.floor((diffMins % 1440) / 60);
    const mins = diffMins % 60;

    let resultado = [];
    if (dias > 0) resultado.push(`${dias}d`);
    if (horas > 0) resultado.push(`${horas}h`);
    if (mins > 0 || resultado.length === 0) resultado.push(`${mins}m`);

    return resultado.join(" ");
  };

  const reportesAExportar = reportes.filter((r) => {
    const fechaBase = r.fecha_resolucion
      ? r.fecha_resolucion.split(" ")[0]
      : r.fecha_reporte
        ? r.fecha_reporte.split(" ")[0]
        : "";
    const entraEnFecha =
      (!fechaInicio || fechaBase >= fechaInicio) &&
      (!fechaFin || fechaBase <= fechaFin);

    const entraEnHotel =
      hotelReporte === "0" || Number(r.hotel_id) === Number(hotelReporte);
    const entraEnEstatus =
      estatusReporte === "Todos" || r.estatus === estatusReporte;

    const nombreTecnico =
      `${r.res_nombre || ""} ${r.res_apellido || ""}`.trim();
    const entraEnEmpleado =
      empleadoReporte === "Todos" || nombreTecnico === empleadoReporte;

    const busquedaMinuscula = busquedaReporte.toLowerCase();
    const entraEnBusqueda =
      !busquedaMinuscula ||
      r.habitacion_numero?.toString().includes(busquedaMinuscula) ||
      r.descripcion?.toLowerCase().includes(busquedaMinuscula) ||
      r.categoria?.toLowerCase().includes(busquedaMinuscula);

    return (
      entraEnFecha &&
      entraEnHotel &&
      entraEnEstatus &&
      entraEnEmpleado &&
      entraEnBusqueda
    );
  });

  const generarPDF = () => {
    if (reportesAExportar.length === 0)
      return alert("No hay reportes con estos filtros.");

    const doc = new jsPDF("landscape");
    doc.setFontSize(18);
    doc.text("Reporte de Mantenimiento e Incidencias", 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);

    const nombreSede =
      hotelReporte === "0" ? "Todos los Hoteles" : getNombreHotel(hotelReporte);
    doc.text(
      `Sede: ${nombreSede} | Periodo: ${fechaInicio} al ${fechaFin}`,
      14,
      28,
    );
    if (empleadoReporte !== "Todos")
      doc.text(`Técnico: ${empleadoReporte}`, 14, 34);

    const columnas = [
      "Hab.",
      "Hotel",
      "Categoría",
      "Falla Reportada",
      "Estatus",
      "Fecha Rep.",
      "Tiempo Resol.",
      "Atendido Por",
    ];
    const filas = reportesAExportar.map((r) => [
      r.habitacion_numero,
      getNombreHotel(r.hotel_id),
      r.categoria || "Gral",
      r.descripcion,
      r.estatus,
      (r.fecha_reporte || "").substring(0, 10),
      calcularTiempo(r.fecha_reporte, r.fecha_resolucion),
      `${r.res_nombre || ""} ${r.res_apellido || ""}`.trim() || "-",
    ]);

    autoTable(doc, {
      startY: empleadoReporte !== "Todos" ? 40 : 35,
      head: [columnas],
      body: filas,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 },
      columnStyles: { 3: { cellWidth: 70 } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(
      `Mantenimiento_${nombreSede.replace(/ /g, "_")}_${fechaInicio}.pdf`,
    );
    onClose();
  };

  const generarExcel = () => {
    if (reportesAExportar.length === 0)
      return alert("No hay reportes con estos filtros.");

    const datosExcel = reportesAExportar.map((r) => ({
      Habitación: r.habitacion_numero,
      Hotel: getNombreHotel(r.hotel_id),
      Categoría: r.categoria || "Gral",
      "Falla Reportada": r.descripcion,
      Estatus: r.estatus,
      "Fecha Reporte": r.fecha_reporte,
      "Fecha Diagnóstico": r.fecha_diagnostico || "-",
      "Tiempo en Diagnosticar": calcularTiempo(
        r.fecha_reporte,
        r.fecha_diagnostico,
      ), // NUEVA COLUMNA DE REACCIÓN
      "Fecha Resolución": r.fecha_resolucion || "-",
      "Tiempo Total de Resolución": calcularTiempo(
        r.fecha_reporte,
        r.fecha_resolucion,
      ),
      "Reportado Por": `${r.rep_nombre || ""} ${r.rep_apellido || ""}`.trim(),
      "Atendido/Resuelto Por":
        `${r.res_nombre || ""} ${r.res_apellido || ""}`.trim() || "-",
      Diagnóstico: r.diagnostico || "-",
      "Notas de Resolución": r.notas_resolucion || "-",
    }));

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Incidencias");

    const nombreSede =
      hotelReporte === "0" ? "Global" : getNombreHotel(hotelReporte);
    XLSX.writeFile(libro, `Mantenimiento_${nombreSede}_${fechaInicio}.xlsx`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <span>🖨️</span> Exportar Reporte
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-2">
            Selecciona los filtros para generar tu documento.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Hotel / Sede
              </label>
              <select
                value={hotelReporte}
                onChange={(e) => setHotelReporte(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer text-slate-800 dark:text-white"
              >
                <option value="0">🏢 Todos (Global)</option>
                {hoteles?.map((h) => (
                  <option key={h.id} value={h.id}>
                    🏨 {h.alias || h.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Estatus
              </label>
              <select
                value={estatusReporte}
                onChange={(e) => setEstatusReporte(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer text-slate-800 dark:text-white"
              >
                <option value="Todos">⏳ Todos</option>
                <option value="Pendiente">🚨 Pendiente</option>
                <option value="En Reparación">🔧 En Reparación</option>
                <option value="Resuelto">✅ Resuelto</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Buscar Cuarto o Falla
              </label>
              <input
                type="text"
                value={busquedaReporte}
                onChange={(e) => setBusquedaReporte(e.target.value)}
                placeholder="Ej. 1207, chapa..."
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 dark:text-white"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Técnico / Empleado
              </label>
              <select
                value={empleadoReporte}
                onChange={(e) => setEmpleadoReporte(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer text-slate-800 dark:text-white"
              >
                <option value="Todos">👥 Todos</option>
                {tecnicosUnicos.map((t, i) => (
                  <option key={i} value={t}>
                    👤 {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-2 text-center text-sm font-bold text-slate-600 dark:text-slate-300">
            Reportes a exportar:{" "}
            <span className="text-indigo-600 dark:text-indigo-400 text-lg">
              {reportesAExportar.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={generarPDF}
              className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 p-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 shadow-sm"
            >
              <span className="text-2xl">📄</span> PDF
            </button>
            <button
              onClick={generarExcel}
              className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 p-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 shadow-sm"
            >
              <span className="text-2xl">📊</span> Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
