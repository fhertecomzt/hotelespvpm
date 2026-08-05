import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useNavigate } from "react-router-dom";
import ModalReporteDano from "./ModalReporteDano"; // Ajusta la ruta según donde lo hayas guardado

export default function EscanerQR({ usuarioActual }) {
  const [datosHabitacion, setDatosHabitacion] = useState(null);
  const [errorQR, setErrorQR] = useState("");
  const navigate = useNavigate();
  const [mostrarModalDano, setMostrarModalDano] = useState(false);

  // Función que se ejecuta cada vez que la cámara capta un código
  const handleScan = (textoDetectado) => {
    if (textoDetectado) {
      try {
        // Intentamos decodificar el JSON que guardamos en la etiqueta
        const data = JSON.parse(textoDetectado[0].rawValue);

        // Validamos que sea un QR de nuestro sistema
        if (data.sys === "SWAOS") {
          setDatosHabitacion(data);
          setErrorQR("");
        } else {
          setErrorQR("El código escaneado no pertenece al ecosistema SWAOS.");
        }
      } catch (err) {
        setErrorQR("Formato de QR inválido o dañado.");
      }
    }
  };

  const handleCerrar = () => {
    navigate(-1); // Regresa a la pantalla anterior (Camarista o Recepción)
  };

  return (
    <div className="bg-slate-900 min-h-screen font-sans flex flex-col">
      {/* Cabecera del Escáner */}
      <div className="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center border-b border-slate-700 shrink-0">
        <h1 className="font-black text-lg tracking-wide flex items-center gap-2">
          <span>📷</span> Escáner SWAOS
        </h1>
        <button
          onClick={handleCerrar}
          className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
        >
          Cerrar ✖
        </button>
      </div>

      {/* Área Central: Cámara o Resultado */}
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        {!datosHabitacion ? (
          <div className="w-full max-w-sm bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 relative">
            {/* Lector de cámara en vivo */}
            <Scanner
              onScan={handleScan}
              formats={["qr_code"]}
              components={{
                audio: true, // Emite un "beep" al leer
                onOff: true, // Botón para prender la linterna del celular
                torch: true,
              }}
            />

            {errorQR && (
              <div className="absolute bottom-4 left-4 right-4 bg-red-600/90 backdrop-blur text-white p-3 rounded-lg text-sm font-bold text-center border border-red-400">
                {errorQR}
              </div>
            )}

            <p className="absolute top-4 left-0 right-0 text-center text-white/80 text-xs font-bold uppercase tracking-widest drop-shadow-md z-10">
              Apunta al QR de la puerta
            </p>
          </div>
        ) : (
          /* RESULTADO EXITOSO DEL ESCANEO */
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border-t-8 border-indigo-600 text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ✓
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-1">
              Hab. {datosHabitacion.num}
            </h2>
            <p className="text-slate-500 font-semibold text-sm mb-6 uppercase tracking-wider">
              Hotel ID: {datosHabitacion.hotel} | Reg: #{datosHabitacion.hab_id}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setMostrarModalDano(true)}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-colors border border-red-200"
              >
                ⚠️ Reportar Daño Rápido
              </button>

              <button
                onClick={handleCerrar}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-md transition-colors"
              >
                Volver a mi Panel
              </button>
            </div>
          </div>
        )}
      </div>
      {mostrarModalDano && (
        <ModalReporteDano
          habitacionId={datosHabitacion.hab_id}
          usuarioId={usuarioActual.id} // Asegúrate de pasar el usuarioActual al EscanerQR
          onClose={() => setMostrarModalDano(false)}
        />
      )}
    </div>
  );
}
