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
  const procesandoRef = useRef(false); // Candado para no mandar 100 peticiones por segundo
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
              // Obtenemos la imagen usando la URL relativa al proxy de Vite
              const img = await faceapi.fetchImage(
                `${API_URL}/${usuario.foto_perfil_url}`,
              );
              const detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

              if (detection) {
                // Guardamos el ID del usuario como "Etiqueta" de este rostro
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
            // Creamos el "Cerebro" comparador con un 50% de estrictez (0.5 de distancia máxima)
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

  // 2. ENCENDER CÁMARA (Una vez que la IA esté entrenada)
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
    setEstadoChecador("Rostro Verificado. Obteniendo GPS...");

    if (!navigator.geolocation) {
      Swal.fire("Error", "Tu navegador no soporta GPS.", "error");
      procesandoRef.current = false;
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
              // 🥳 1. VERIFICAR CELEBRACIONES Y DISPARAR CONFETI
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

              // 📢 2. VERIFICAR SI HAY COMUNICADO DE RH
              if (res.anuncio) {
                Swal.fire({
                  title: tituloCelebracion,
                  html: `
                ${mensajeCelebracionHtml}
                <div class="text-sm text-slate-500 mb-2">Tienes un mensaje de Recursos Humanos:</div>
                <div class="text-lg font-bold text-slate-700 dark:text-slate-200 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  ${res.anuncio}
                </div>
                <div class="text-sm text-emerald-600 dark:text-emerald-400 mt-5 font-black uppercase tracking-widest">
                  ✅ ${res.tipo === "ENTRADA" ? "Entrada" : "Salida"} Registrada
                </div>
              `,
                  icon:
                    res.es_cumpleanos || res.anios_aniversario > 0
                      ? null
                      : "info",
                  confirmButtonText: "👍 Entendido",
                  confirmButtonColor: "#4f46e5",
                  allowOutsideClick: false,
                  customClass: { popup: "rounded-3xl" },
                }).then(() => {
                  procesandoRef.current = false;
                  setEstadoChecador("Cámara lista. Esperando rostro...");
                });
              } else {
                // 3. FLUJO NORMAL O CELEBRACIÓN SIN AVISO
                Swal.fire({
                  title: tituloCelebracion,
                  html: `${mensajeCelebracionHtml} <div class="text-slate-600 dark:text-slate-300 font-semibold">${res.message}</div>`,
                  icon:
                    res.es_cumpleanos || res.anios_aniversario > 0
                      ? null
                      : "success",
                  timer:
                    res.es_cumpleanos || res.anios_aniversario > 0
                      ? 6000
                      : 3500, // Si hay fiesta, les damos más tiempo para verla
                  showConfirmButton:
                    res.es_cumpleanos || res.anios_aniversario > 0, // Botón OK si hay fiesta
                  confirmButtonText: "¡Gracias!",
                  confirmButtonColor: res.es_cumpleanos ? "#ec4899" : "#f59e0b",
                  customClass: { popup: "rounded-3xl" },
                }).then(() => {
                  procesandoRef.current = false;
                  setEstadoChecador("Cámara lista. Esperando rostro...");
                });
              }
            } else {
              // ERROR DE ASISTENCIA (Fuera de horario, geocerca, etc.)
              Swal.fire({
                title: "Acceso Denegado",
                text: res.message,
                icon: "error",
                customClass: { popup: "rounded-3xl" },
              });
              setTimeout(() => {
                procesandoRef.current = false;
                setEstadoChecador("Cámara lista. Esperando rostro...");
              }, 4000);
            }
          })
          .catch(() => {
            Swal.fire("Error", "Fallo de conexión al servidor.", "error");
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
        procesandoRef.current = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 20000, // Subimos a 20 segundos para darle oportunidad al iPhone
        maximumAge: 0,
      },
    );
  };

  // 4. CICLO DE ESCANEO DE VIDEO (2 veces por segundo)
  const handleVideoPlay = () => {
    intervaloEscaneoRef.current = setInterval(async () => {
      // Si ya estamos procesando a alguien, ignoramos el video temporalmente
      if (procesandoRef.current) return;

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
          // Si no hay base de datos cargada, solo indicamos que vemos una cara
          if (!faceMatcherRef.current) {
            setEstadoChecador("Rostro detectado (Sin base de datos)");
            return;
          }

          // Tomamos el primer rostro que veamos en cámara
          const rostroEnCamara = detections[0].descriptor;
          const mejorCoincidencia =
            faceMatcherRef.current.findBestMatch(rostroEnCamara);

          // Si la distancia es menor a 0.5 (es la persona correcta) y no es "unknown"
          if (mejorCoincidencia.label !== "unknown") {
            // ¡MATCH ENCONTRADO! Bloqueamos el escáner y disparamos el proceso
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
          ) : !listoParaEscanear ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-300 font-bold">{faseCarga}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onPlay={handleVideoPlay}
                className={`w-full h-auto max-h-[60vh] object-cover transform scale-x-[-1] transition-opacity duration-300 ${procesandoRef.current ? "opacity-50" : "opacity-100"}`}
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
            className={`w-4 h-4 rounded-full shadow-lg ${
              procesandoRef.current
                ? "bg-amber-500 animate-pulse shadow-amber-500/50"
                : estadoChecador.includes("desconocido")
                  ? "bg-rose-500 shadow-rose-500/50"
                  : "bg-emerald-500 shadow-emerald-500/50"
            }`}
          ></div>
          <p className="text-slate-200 font-bold text-lg tracking-wide">
            {estadoChecador}
          </p>
        </div>
      </div>
    </div>
  );
}
