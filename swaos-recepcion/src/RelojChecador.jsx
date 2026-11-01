import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Swal from "sweetalert2";
import confetti from "canvas-confetti";

const API_URL = "/sistema/swaos-api";

export default function RelojChecador({ onVolver }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [errorCamara, setErrorCamara] = useState("");
  const [faseCarga, setFaseCarga] = useState("Cargando Motores Neuronales...");
  const [estadoChecador, setEstadoChecador] = useState("Iniciando...");
  const [listoParaEscanear, setListoParaEscanear] = useState(false);

  // Referencias para la lógica de la IA
  const faceMatcherRef = useRef(null);
  const procesandoRef = useRef(false); // Candado para no mandar peticiones encimadas
  const enPausaEscaneoRef = useRef(false); // 🛑 NUEVO: Pausa temporal de la cámara tras un registro exitoso
  const intervaloEscaneoRef = useRef(null);

  // 1. INICIALIZACIÓN: CARGAR MODELOS Y FOTOS MAESTRO
  useEffect(() => {
    const inicializarSistema = async () => {
      try {
        const MODEL_URL = "/models";

        // A. Cargar modelos neuronales
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        setFaseCarga("Entrenando IA con rostros del personal...");

        // B. Traer las fotos desde la base de datos (PHP)
        const res = await fetch(
          `${API_URL}/api_checador.php?accion=obtener_rostros`,
        );
        const data = await res.json();

        if (data.success && data.rostros && data.rostros.length > 0) {
          const labeledDescriptors = [];

          // Procesar cada foto y extraer sus vectores
          for (const usuario of data.rostros) {
            try {
              const img = await faceapi.fetchImage(
                `${API_URL}/${usuario.foto_perfil_url}`,
              );
              const detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

              if (detection) {
                labeledDescriptors.push(
                  new faceapi.LabeledFaceDescriptors(usuario.id.toString(), [
                    detection.descriptor,
                  ]),
                );
              }
            } catch (error) {
              console.warn(
                `No se pudo procesar la foto del usuario ID ${usuario.id}`,
              );
            }
          }

          if (labeledDescriptors.length > 0) {
            faceMatcherRef.current = new faceapi.FaceMatcher(
              labeledDescriptors,
              0.5,
            );
          }
        }

        setListoParaEscanear(true);
        setEstadoChecador("Cámara lista. Esperando rostro...");
      } catch (err) {
        console.error(err);
        setErrorCamara(
          "Fallo crítico al inicializar la Inteligencia Artificial.",
        );
      }
    };

    inicializarSistema();
  }, []);

  // 2. ENCENDER CÁMARA
  useEffect(() => {
    let stream = null;

    if (listoParaEscanear) {
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
            "Permiso de cámara denegado. Es necesario para registrar asistencia.",
          );
        }
      };

      iniciarCamara();
    }

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (intervaloEscaneoRef.current)
        clearInterval(intervaloEscaneoRef.current);
    };
  }, [listoParaEscanear]);

  // 3. ENVIAR ASISTENCIA AL BACKEND CON GPS
  const procesarAsistencia = (usuarioId) => {
    // Si hay una pausa activa, ignoramos para evitar ejecuciones encimadas
    if (enPausaEscaneoRef.current) return;
    enPausaEscaneoRef.current = true; // Bloqueamos la cámara de inmediato
    setEstadoChecador("Rostro Verificado. Obteniendo GPS...");

    if (!navigator.geolocation) {
      Swal.fire("Error", "Tu navegador no soporta GPS.", "error");
      procesandoRef.current = false;
      enPausaEscaneoRef.current = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const { latitude, longitude } = posicion.coords;

        setEstadoChecador("Validando geocerca y registrando...");

        fetch(`${API_URL}/api_checador.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "registrar_asistencia",
            usuario_id: usuarioId,
            latitud: latitude,
            longitud: longitude,
          }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.success) {
              let tituloCelebracion =
                res.tipo === "ENTRADA"
                  ? "¡Entrada Registrada!"
                  : "¡Salida Registrada!";
              let mensajeCelebracionHtml = "";

              if (res.es_cumpleanos) {
                tituloCelebracion = `🎉 ¡Feliz Cumpleaños, ${res.nombre_empleado}! 🎂`;
                mensajeCelebracionHtml = `<div class="text-pink-600 dark:text-pink-400 font-black text-lg mb-2">¡Que tengas un día espectacular! 🎈</div>`;
                confetti({
                  particleCount: 200,
                  spread: 100,
                  origin: { y: 0.5 },
                  zIndex: 9999,
                  colors: [
                    "#ff0a54",
                    "#ff477e",
                    "#ff7096",
                    "#ff85a1",
                    "#fbb1bd",
                    "#f9bec7",
                  ],
                });
              } else if (res.anios_aniversario > 0) {
                tituloCelebracion = `🏆 ¡Feliz ${res.anios_aniversario}° Aniversario! 🌟`;
                mensajeCelebracionHtml = `<div class="text-amber-500 font-black text-lg mb-2">Gracias por ser parte de nuestra historia. 👏</div>`;
                confetti({
                  particleCount: 150,
                  spread: 90,
                  origin: { y: 0.5 },
                  zIndex: 9999,
                  colors: ["#fbbf24", "#f59e0b", "#d97706", "#ffffff"],
                });
              }

              // Configuración unificada y limpia de los modales de éxito / RH
              const swalConfig = {
                title: tituloCelebracion,
                html: res.anuncio
                  ? `
                  ${mensajeCelebracionHtml}
                  <div class="text-sm text-slate-500 mb-2">Tienes un mensaje de Recursos Humanos:</div>
                  <div class="text-lg font-bold text-slate-700 dark:text-slate-200 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    ${res.anuncio}
                  </div>
                  <div class="text-sm text-emerald-600 dark:text-emerald-400 mt-5 font-black uppercase tracking-widest">
                    ✅ ${res.tipo === "ENTRADA" ? "Entrada" : "Salida"} Registrada
                  </div>
                `
                  : `${mensajeCelebracionHtml} <div class="text-slate-600 dark:text-slate-300 font-semibold">${res.message}</div>`,
                icon:
                  res.es_cumpleanos || res.anios_aniversario > 0 || res.anuncio
                    ? null
                    : "success",
                timer:
                  res.es_cumpleanos || res.anios_aniversario > 0 || res.anuncio
                    ? null
                    : 3500,
                showConfirmButton:
                  res.es_cumpleanos || res.anios_aniversario > 0 || res.anuncio
                    ? true
                    : false,
                confirmButtonText: "👍 Entendido",
                confirmButtonColor: res.es_cumpleanos ? "#ec4899" : "#4f46e5",
                allowOutsideClick: false,
                customClass: { popup: "rounded-3xl" },
              };

              Swal.fire(swalConfig).then(() => {
                // 🧹 LIMPIEZA TOTAL Y RESGUARDO DE PRIVACIDAD AL CERRAR LA ALERTA
                // Damos 10 segundos de gracia para que el empleado se aparte de la cámara
                setTimeout(() => {
                  enPausaEscaneoRef.current = false;
                  procesandoRef.current = false;
                  setEstadoChecador("Cámara lista. Esperando rostro...");
                }, 10000);
              });
            } else {
              // ERROR DE ASISTENCIA (Geocerca, cooldown, etc.)
              Swal.fire({
                title: "Acceso Denegado",
                text: res.message,
                icon: "error",
                customClass: { popup: "rounded-3xl" },
              });
              setTimeout(() => {
                enPausaEscaneoRef.current = false;
                procesandoRef.current = false;
                setEstadoChecador("Cámara lista. Esperando rostro...");
              }, 4000);
            }
          })
          .catch(() => {
            Swal.fire("Error", "Fallo de conexión al servidor.", "error");
            enPausaEscaneoRef.current = false;
            procesandoRef.current = false;
          });
      },
      (err) => {
        console.error("Error GPS detallado (Código):", err.code, err.message);

        let mensajeEspecifico =
          "Debes permitir el acceso a tu ubicación para checar.";
        if (err.code === 1) {
          mensajeEspecifico =
            "Permiso de ubicación denegado en el iPhone. Revisa que Safari tenga acceso al GPS en los Ajustes de iOS.";
        } else if (err.code === 3) {
          mensajeEspecifico =
            "El iPhone tardó demasiado en obtener la señal GPS (Timeout). Inténtalo cerca de una ventana o área abierta.";
        }

        Swal.fire("Error GPS (" + err.code + ")", mensajeEspecifico, "error");
        enPausaEscaneoRef.current = false;
        procesandoRef.current = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    );
  };

  // 4. CICLO DE ESCANEO DE VIDEO (2 veces por segundo)
  const handleVideoPlay = () => {
    intervaloEscaneoRef.current = setInterval(async () => {
      // 🛑 Si estamos procesando o la cámara está en pausa temporal, ignoramos el ciclo
      if (procesandoRef.current || enPausaEscaneoRef.current) return;

      if (videoRef.current && canvasRef.current && !videoRef.current.paused) {
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

        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);

        if (detections.length > 0) {
          if (!faceMatcherRef.current) {
            setEstadoChecador("Rostro detectado (Sin base de datos)");
            return;
          }

          const rostroEnCamara = detections[0].descriptor;
          const mejorCoincidencia =
            faceMatcherRef.current.findBestMatch(rostroEnCamara);

          if (mejorCoincidencia.label !== "unknown") {
            procesandoRef.current = true;
            ctx.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height,
            );
            procesarAsistencia(mejorCoincidencia.label);
          } else {
            setEstadoChecador("Rostro desconocido. Acércate más.");
          }
        } else {
          setEstadoChecador("Cámara lista. Esperando rostro...");
        }
      }
    }, 500);
  };

return (
  <div className="min-h-screen bg-slate-900 flex flex-col font-sans relative overflow-hidden">
    {/* Botón de retorno ordenado y sutil */}
    <div className="px-6 pt-6 z-50">
      <button
        onClick={onVolver}
        className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
      >
        ← Volver a Acceso Administrativo
      </button>
    </div>

    {/* Contenedor principal más compacto */}
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Título y subtítulo reducidos para móviles */}
      <div className="text-center mb-5 z-10">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Reloj Checador{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Biométrico
          </span>
        </h1>
        <p className="text-slate-400 mt-1 font-semibold text-xs sm:text-sm">
          Por favor, mira a la cámara para registrar tu asistencia.
        </p>
      </div>

      {/* Contenedor de la cámara con tamaño reducido (max-w-md y altura controlada) */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-black rounded-[1.5rem] overflow-hidden shadow-2xl border-2 border-slate-800 z-10 flex items-center justify-center min-h-[220px]">
        {errorCamara ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-800">
            <span className="text-4xl mb-3">📷🚫</span>
            <p className="text-red-400 font-bold text-sm">{errorCamara}</p>
          </div>
        ) : !listoParaEscanear ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-slate-300 font-bold text-xs">{faseCarga}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onPlay={handleVideoPlay}
              className={`w-full h-auto max-h-[40vh] sm:max-h-[45vh] object-cover transform scale-x-[-1] transition-opacity duration-300 ${procesandoRef.current ? "opacity-50" : "opacity-100"}`}
            ></video>
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full transform scale-x-[-1] pointer-events-none"
            />
          </>
        )}
      </div>

      {/* Indicador de estado compacto */}
      <div className="mt-5 z-10 bg-slate-800/80 backdrop-blur-md px-6 py-3 rounded-xl border border-slate-700 shadow-xl flex items-center gap-3">
        <div
          className={`w-3.5 h-3.5 rounded-full shadow-lg ${
            procesandoRef.current
              ? "bg-amber-500 animate-pulse shadow-amber-500/50"
              : estadoChecador.includes("desconocido")
                ? "bg-rose-500 shadow-rose-500/50"
                : "bg-emerald-500 shadow-emerald-500/50"
          }`}
        ></div>
        <p className="text-slate-200 font-bold text-xs sm:text-sm tracking-wide">
          {estadoChecador}
        </p>
      </div>
    </div>
  </div>
);
}
