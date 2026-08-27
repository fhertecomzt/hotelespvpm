import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
// Importamos el componente de Cloudflare Turnstile
import { Turnstile } from "@marsidev/react-turnstile";
// Importamos tu utilidad de alertas
import { alertaToast } from "./utils";

const API_URL = "/sistema/swaos-api";

export default function Login({ setUsuarioActual }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // ESTADO: Para la casilla de recordar
  const [recordar, setRecordar] = useState(false);

  // Estado para almacenar el token de seguridad
  const [captchaToken, setCaptchaToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const correoGuardado = localStorage.getItem("swaos_email_recordado");
    if (correoGuardado) {
      setEmail(correoGuardado);
      setRecordar(true);
    }
  }, []);

  const handleEmailChange = (e) => {
    // Filtro estricto para evitar inyecciones en el input
    const correoLimpio = e.target.value.replace(/[^a-zA-Z0-9@.\-_]/g, "");
    setEmail(correoLimpio);
  };

  const handleLogin = (e) => {
    e.preventDefault();

    // Candado de seguridad: Evitar envío si el bot no pasó la prueba
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
        cf_turnstile_response: captchaToken, // Enviamos el token al servidor
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        setCargando(false);
        if (res.success) {
          // Guardamos el usuario
          localStorage.setItem("swaos_usuario", JSON.stringify(res.usuario));
          // Guardamos el token
          localStorage.setItem("swaos_token", res.token);
          // Usuario global
          setUsuarioActual(res.usuario);

          // Redirección inteligente según el rol del empleado
          if (res.usuario.rol === "Recepcion") {
            navigate("/recepcion");
          } else if (res.usuario.rol === "Camarista") {
            navigate("/camarista");
          } else {
            navigate("/"); // Fallback
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

  useEffect(() => {
    document.title = "SWAOS | Iniciar Sesión";
    const favicon = document.getElementById("favicon");
    // Opcional: Si tienes un icono especial para el login en tu carpeta public
    if (favicon) favicon.href = "public/favicon.svg";
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-black text-slate-800 tracking-tight">
          SWAOS
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-semibold uppercase tracking-wider">
          Acceso Operativo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-100 text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700">
                Correo Electrónico
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={handleEmailChange} // APLICAMOS EL FILTRO AQUÍ
                  placeholder="ejemplo@hotel.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors mt-4"
                />
              </div>
            </div>

            {/* Casilla Recordar y Captcha */}
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordar}
                  onChange={(e) => setRecordar(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-600 font-semibold">
                  Recordar mi correo
                </span>
              </label>
            </div>

            <div className="flex justify-center my-4">
              <Turnstile
                siteKey="0x4AAAAAAESSDDV0_9H9Qmj4" // Llave de cloudflare
                onSuccess={(token) => setCaptchaToken(token)}
                onError={() =>
                  alertaToast("error", "No se pudo cargar el sistema anti-bots")
                }
                options={{ theme: "light" }}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={cargando}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70"
              >
                {cargando ? "Autenticando..." : "Iniciar Sesión"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8">
        <Link
          to="/privacidad"
          className="text-xs sm:text-sm text-slate-400 hover:text-indigo-600 font-bold transition-colors bg-white/50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:shadow"
        >
          Aviso de Privacidad
        </Link>
      </div>
    </div>
  );
}
