import React, { useEffect } from "react";
import { Link } from "react-router-dom";

export default function PrivacidadView() {
  useEffect(() => {
    document.title = "SWAOS | Aviso de Privacidad";
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors">
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 shadow-xl rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Aviso de Privacidad
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1 uppercase tracking-wider">
              Plataforma Operativa SWAOS
            </p>
          </div>
          <Link
            to="/"
            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
          >
            <span>🔙</span> Volver
          </Link>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              1. Definición de Roles
            </h2>
            <p className="font-medium text-slate-600 dark:text-slate-300">
              Para efectos de la Ley Federal de Protección de Datos Personales
              en Posesión de los Particulares (LFPDPPP), las partes acuerdan que
              EL HOTEL (empleador) actúa como el <strong>"Responsable"</strong>{" "}
              de los datos personales de sus colaboradores. La plataforma SWAOS
              actúa única y exclusivamente como el <strong>"Encargado"</strong>{" "}
              del tratamiento de dichos datos para fines operativos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              2. Obligaciones del Encargado (SWAOS)
            </h2>
            <p className="font-medium text-slate-600 dark:text-slate-300">
              Como proveedores de la infraestructura tecnológica, nos
              comprometemos a:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 font-medium text-slate-600 dark:text-slate-300">
              <li>
                Tratar los datos personales únicamente conforme a las
                instrucciones del Responsable y para el funcionamiento estricto
                del sistema.
              </li>
              <li>
                Implementar las medidas de seguridad técnicas (incluyendo
                encriptación de contraseñas y transmisión por tokens JWT) para
                proteger los datos contra daño, pérdida, alteración o acceso no
                autorizado.
              </li>
              <li>
                No transferir los datos personales a terceros bajo ninguna
                circunstancia comercial, salvo requerimiento legal de autoridad
                competente.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              3. Uso de Tecnologías de Rastreo (Cookies / LocalStorage)
            </h2>
            <p className="font-medium text-slate-600 dark:text-slate-300">
              El software SWAOS utiliza almacenamiento local del navegador
              (LocalStorage) con el único fin de mantener segura y activa la
              sesión de los usuarios autenticados. No utilizamos cookies de
              terceros, píxeles de seguimiento, ni recolectamos actividad de
              navegación fuera de nuestra plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              4. Información recopilada de los empleados (en nombre de los
              hoteles)
            </h2>
            <p className="font-medium text-slate-600 dark:text-slate-300">
              En nombre de los hoteles y siguiendo sus instrucciones, podemos
              procesar:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 font-medium text-slate-600 dark:text-slate-300">
              <li>
                Identificadores o ID de empleados asignados por el cliente.
              </li>
              <li>Fotos del rostro.</li>
              <li>Horarios de trabajo y asignación de turnos.</li>
              <li>
                Registros de asistencia y horario, incluyendo entradas y
                salidas.
              </li>
              <li>
                Registros de uso del dispositivo, como marcas de tiempo e
                información de estado.
              </li>
              <li>
                Cuando el cliente lo habilite: plantillas biométricas utilizadas
                para la verificación de identidad.
              </li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              5. Información del sitio web y la aplicación
            </h2>
            <p className="font-medium text-slate-600 dark:text-slate-300">
              Cuando los usuarios visitan nuestros sitios web o utilizan
              nuestras aplicaciones, podemos recopilar:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 font-medium text-slate-600 dark:text-slate-300">
              <li>Dirección IP.</li>
              <li>Tipo de navegador y sistema operativo.</li>
              <li>URL de referencia e identificadores del dispositivo.</li>
              <li>
                Registros de uso, datos de diagnóstico y métricas de
                rendimiento.
              </li>
              <li>
                Cookies y tecnologías de seguimiento similares (según se
                describe en el aviso de cookies correspondiente).
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
