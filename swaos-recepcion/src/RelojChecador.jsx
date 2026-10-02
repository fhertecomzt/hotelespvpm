import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function RelojChecador({ onVolver }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [errorCamara, setErrorCamara] = useState("");
  const [modelosCargados, setModelosCargados] = useState(false);
  const [estadoChecador, setEstadoChecador] = useState(
    "Cargando cerebro de IA (Aguarde)...",
  );

  // 1. CARGAR LOS MODELOS DE IA
  useEffect(() => {
    const cargarModelos = async () => {
      try {
        const MODEL_URL = "/models"; // Apunta a tu carpeta public/models

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        setModelosCargados(true);
        setEstadoChecador("Cámara lista. Esperando rostro...");
      } catch (err) {
        console.error("Error al cargar la red neuronal:", err);
        setErrorCamara(
          "Error al inicializar la Inteligencia Artificial. Revisa la carpeta /models.",
        );
      }
    };

    cargarModelos();
  }, []);

  // 2. ENCENDER CÁMARA (Solo si los modelos ya cargaron)
  useEffect(() => {
    let stream = null;

    if (modelosCargados) {
      const iniciarCamara = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false,
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          setErrorCamara(
            "No se pudo acceder a la cámara. Por favor, otorga los permisos.",
          );
        }
      };

      iniciarCamara();
    }

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [modelosCargados]);

  // 3. DETECTAR ROSTROS EN TIEMPO REAL
  const handleVideoPlay = () => {
    // Ejecutamos el análisis 2 veces por segundo para no saturar el procesador
    setInterval(async () => {
      if (videoRef.current && canvasRef.current && !videoRef.current.paused) {
        // La IA busca rostros usando el detector Tiny (más rápido para web)
        const detections = await faceapi
          .detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions(),
          )
          .withFaceLandmarks()
          .withFaceDescriptors();

        const displaySize = {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        };

        faceapi.matchDimensions(canvasRef.current, displaySize);
        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize,
        );

        // Limpiar el dibujo anterior
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Dibujar el cuadro y los puntos clave de la cara
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);

        if (detections.length > 0) {
          setEstadoChecador("¡Rostro detectado! Identificando...");
        } else {
          setEstadoChecador("Cámara lista. Esperando rostro...");
        }
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans relative overflow-hidden">
      <div className="absolute top-6 left-6 z-50">
        <button
          onClick={onVolver}
          className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2"
        >
          ← Volver a Acceso Administrativo
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8 z-10">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Reloj Checador{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Biométrico
            </span>
          </h1>
          <p className="text-slate-400 mt-3 font-semibold text-lg">
            Por favor, mira a la cámara para registrar tu asistencia.
          </p>
        </div>

        <div className="relative w-full max-w-2xl bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-800 z-10 flex items-center justify-center min-h-[300px]">
          {errorCamara ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-800">
              <span className="text-5xl mb-4">📷🚫</span>
              <p className="text-red-400 font-bold text-lg">{errorCamara}</p>
            </div>
          ) : !modelosCargados ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-300 font-bold">
                Cargando Motores Neuronales...
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onPlay={handleVideoPlay}
                // El transform invierte la cámara para modo espejo, el canvas también debe invertirse
                className="w-full h-auto max-h-[60vh] object-cover transform scale-x-[-1]"
              ></video>

              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full transform scale-x-[-1] pointer-events-none"
              />
            </>
          )}
        </div>

        <div className="mt-8 z-10 bg-slate-800/80 backdrop-blur-md px-8 py-4 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-4">
          <div
            className={`w-4 h-4 rounded-full shadow-lg ${estadoChecador.includes("detectado") ? "bg-cyan-500 animate-pulse shadow-cyan-500/50" : "bg-emerald-500 shadow-emerald-500/50"}`}
          ></div>
          <p className="text-slate-200 font-bold text-lg tracking-wide">
            {estadoChecador}
          </p>
        </div>
      </div>
    </div>
  );
}
