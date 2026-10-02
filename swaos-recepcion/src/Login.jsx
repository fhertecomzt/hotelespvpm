import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Turnstile } from "@marsidev/react-turnstile";
import { alertaToast } from "./utils";
import RelojChecador from "./RelojChecador";

const API_URL = "/sistema/swaos-api";

export default function Login({ setUsuarioActual }) {
  // Estado para saber si estamos iniciando sesión o checando tarjeta
  const [modoVista, setModoVista] = useState("login"); // 'login' | 'checador'

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false); // NUEVO: Estado del ojito
  const [recordar, setRecordar] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const correoGuardado = localStorage.getItem("swaos_email_recordado");
    if (correoGuardado) {
      setEmail(correoGuardado);
      setRecordar(true);
    }
    document.title =
      modoVista === "login"
        ? "SWAOS | Iniciar Sesión"
        : "SWAOS | Reloj Checador";
    const favicon = document.getElementById("favicon");
    if (favicon) favicon.href = "public/favicon.svg";
  }, [modoVista]);

  const handleEmailChange = (e) => {
    const correoLimpio = e.target.value.replace(/[^a-zA-Z0-9@.\-_]/g, "");
    setEmail(correoLimpio);
  };

  const handleLogin = (e) => {
    e.preventDefault();

    if (!captchaToken) {
      alertaToast(
        "error",
        "⚠️ Verificación de seguridad en proceso o fallida. Intenta de nuevo.",
      );
      return;
    }

    if (recordar) {
      localStorage.setItem("swaos_email_recordado", email);
    } else {
      localStorage.removeItem("swaos_email_recordado");
    }

    setError("");
    setCargando(true);

    fetch(`${API_URL}/login.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        cf_turnstile_response: captchaToken,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        setCargando(false);
        if (res.success) {
          localStorage.setItem("swaos_usuario", JSON.stringify(res.usuario));
          localStorage.setItem("swaos_token", res.token);
          setUsuarioActual(res.usuario);

          if (res.usuario.rol === "Recepcion") {
            navigate("/recepcion");
          } else if (res.usuario.rol === "Camarista") {
            navigate("/camarista");
          } else {
            navigate("/");
          }
        } else {
          setError(res.message);
        }
      })
      .catch((err) => {
        setCargando(false);
        setError("Error de conexión al servidor.");
        console.error(err);
      });
  };

  // SI EL MODO ES CHECADOR, RENDERIZAMOS EL OTRO COMPONENTE COMPLETAMENTE
  if (modoVista === "checador") {
    return <RelojChecador onVolver={() => setModoVista("login")} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans relative">
      {/* ¡AQUÍ ESTÁ EL BOTÓN FLOTANTE QUE FALTABA! */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={() => setModoVista("checador")}
          className="bg-white/80 backdrop-blur-md border border-slate-200 shadow-lg text-slate-700 hover:text-indigo-600 px-5 py-2.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 hover:-translate-y-0.5"
        >
          <span className="text-xl">📷</span> Reloj Checador Facial
        </button>
      </div>

      {/* PANEL IZQUIERDO - BRANDING (Oculto en móviles, 50% en PC) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">
        {/* Efectos de iluminación de fondo */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>

        <div className="relative z-10 p-16 text-white max-w-2xl">
          <div className="mb-8 flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-900 font-black text-3xl shadow-xl">
              S
            </div>
            <h1 className="text-4xl font-black tracking-tight">SWAOS</h1>
          </div>

          <span className="text-indigo-400 font-black text-xs tracking-widest uppercase mb-4 block">
            Plataforma Operativa
          </span>
          <h2 className="text-5xl font-extrabold mb-6 leading-tight">
            Gestión hotelera <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              unificada y en tiempo real.
            </span>
          </h2>
          <p className="text-slate-300 text-lg mb-10 leading-relaxed max-w-lg font-medium">
            Accede a tu panel para operar estatus de habitaciones, controlar
            incidencias de mantenimiento, ejecutar rutinas preventivas y
            gestionar el inventario del almacén de manera centralizada.
          </p>

          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex-1 hover:bg-white/20 transition-colors">
              <span className="text-3xl block mb-3">📊</span>
              <h4 className="font-bold text-sm">Operación</h4>
              <p className="text-xs text-slate-400 mt-1">Control operativo</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex-1 hover:bg-white/20 transition-colors">
              <span className="text-3xl block mb-3">🧹</span>
              <h4 className="font-bold text-sm">Camaristas</h4>
              <p className="text-xs text-slate-400 mt-1">Control de limpieza</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex-1 hover:bg-white/20 transition-colors">
              <span className="text-3xl block mb-3">🛠️</span>
              <h4 className="font-bold text-sm">Mantenimiento</h4>
              <p className="text-xs text-slate-400 mt-1">
                Plan preventivo y reportes de fallas
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl flex-1 hover:bg-white/20 transition-colors">
              <span className="text-3xl block mb-3">📦</span>
              <h4 className="font-bold text-sm">Almacén</h4>
              <p className="text-xs text-slate-400 mt-1">
                Kardex y existencias
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL DERECHO - FORMULARIO */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 sm:p-10 relative z-10">
          <div className="text-center mb-8">
            <div className="lg:hidden w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg mx-auto mb-5">
              S
            </div>
            <h2 className="text-3xl font-black text-slate-800">
              Iniciar Sesión
            </h2>
            <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-wider">
              Acceso Operativo
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-bold flex gap-3 items-start animate-fade-in">
              <span className="text-lg">⚠️</span>
              <p className="pt-0.5">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 text-lg">✉️</span>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="usuario@hotel.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 text-lg">🔒</span>
                </div>
                <input
                  type={mostrarPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                  title={
                    mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"
                  }
                >
                  {mostrarPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      ></path>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      ></path>
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordar}
                    onChange={(e) => setRecordar(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-600 select-none">
                    Recordar correo
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-center py-2">
              <Turnstile
                siteKey="0x4AAAAAAESSDDV0_9H9Qmj4"
                onSuccess={(token) => setCaptchaToken(token)}
                onError={() =>
                  alertaToast("error", "No se pudo cargar el sistema anti-bots")
                }
                options={{ theme: "light" }}
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className={`w-full py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider shadow-lg transition-all ${
                cargando
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30 hover:-translate-y-0.5"
              }`}
            >
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Autenticando...
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>
        </div>

        <div className="absolute bottom-6 text-center w-full">
          <Link
            to="/privacidad"
            className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
          >
            Aviso de Privacidad
          </Link>
        </div>
      </div>
    </div>
  );
}
