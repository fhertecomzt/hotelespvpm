import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";

const API_URL = "/sistema/swaos-api";

export default function GeneradorQR() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [hotelId, setHotelId] = useState(1);

  useEffect(() => {
    setCargando(true);
    fetch(`${API_URL}/obtener_habitaciones_qr.php?hotel_id=${hotelId}`)
      .then((res) => res.json())
      .then((fetchedData) => {
        setData(fetchedData);
        setCargando(false);
      })
      .catch((err) => {
        console.error("Error cargando QRs:", err);
        setCargando(false);
      });
  }, [hotelId]);

  // Función para lanzar el cuadro de diálogo de impresión del navegador
  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="bg-slate-100 min-h-screen p-6 font-sans print:bg-white print:p-0">
      {/* CABECERA DE CONTROL (Se oculta al imprimir con print:hidden) */}
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl shadow-sm mb-8 flex flex-col sm:flex-row justify-between items-center border border-slate-200 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            🖨️ Central de Etiquetas QR - SWAOS
          </h1>
          <p className="text-sm text-slate-500">
            Generador de códigos para escaneo rápido en puertas de habitaciones
          </p>
        </div>

        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          <select
            value={hotelId}
            onChange={(e) => setHotelId(Number(e.target.value))}
            className="bg-slate-50 border border-slate-300 font-bold text-slate-700 text-sm py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={1}>🏨 Hotel Playa Victoria (ID 1)</option>
            <option value={2}>🏨 Hotel 2 (ID 2)</option>
          </select>

          <button
            onClick={handleImprimir}
            disabled={cargando || !data?.etiquetas?.length}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-2.5 px-5 rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>🖨️</span> Imprimir Hoja
          </button>
        </div>
      </div>

      {/* ÁREA DE CARGA */}
      {cargando && (
        <div className="text-center py-20 text-slate-500 font-bold text-lg animate-pulse print:hidden">
          Generando vectores QR en memoria...
        </div>
      )}

      {/* REJILLA DE ETIQUETAS (Diseñada para hoja Carta/A4 en impresión) */}
      {!cargando && data && (
        <div className="max-w-6xl mx-auto">
          {/* Instrucciones rápidas en pantalla */}
          <div className="mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider print:hidden">
            Vista previa de impresión ({data.etiquetas.length} etiquetas):
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-3 print:gap-4 print:w-full">
            {data.etiquetas.map((etiqueta) => (
              <div
                key={etiqueta.id}
                className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow print:border-slate-400 print:shadow-none print:break-inside-avoid print:p-4"
              >
                {/* Cabecera de la etiqueta */}
                <span className="text-xs font-black tracking-widest text-indigo-600 uppercase mb-1 print:text-black">
                  SWAOS • OPERACIONES
                </span>
                <h2 className="text-3xl font-black text-slate-800 mb-0.5">
                  HAB. {etiqueta.numero}
                </h2>
                <span className="text-xs font-semibold text-slate-400 uppercase mb-4 print:text-slate-600">
                  {etiqueta.tipo}
                </span>

                {/* Código QR Vectorial */}
                <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-inner mb-3 print:border-none print:shadow-none print:p-0">
                  <QRCode
                    value={etiqueta.qr_data}
                    size={130}
                    level="M" // Nivel de corrección de errores medio (ideal para lectura rápida)
                    viewBox={`0 0 130 130`}
                  />
                </div>

                {/* Pie de etiqueta */}
                <p className="text-[10px] text-slate-400 font-mono mt-1 print:text-slate-500">
                  ID SCAN: #H{etiqueta.id}-Z{hotelId}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
