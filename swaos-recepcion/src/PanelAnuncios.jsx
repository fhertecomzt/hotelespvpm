import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { alertaToast } from "./utils";

const API_URL = "/sistema/swaos-api";

export default function PanelAnuncios({
  usuarios,
  hoteles,
  usuarioActual,
  token,
}) {
  const [anuncios, setAnuncios] = useState([]);
  const [cargando, setCargando] = useState(true);

  // ESTADOS DE PAGINACIÓN (NUEVO)
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 5;

  const getItemsPaginados = (lista) => {
    const indiceUltimoItem = paginaActual * itemsPorPagina;
    const indicePrimerItem = indiceUltimoItem - itemsPorPagina;
    return lista.slice(indicePrimerItem, indiceUltimoItem);
  };
  const totalPaginas = (lista) => Math.ceil(lista.length / itemsPorPagina);

  // Estados del Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const primerInputRef = useRef(null);

  // Campos del Formulario
  const [edicionId, setEdicionId] = useState(0);
  const [tipoAlcance, setTipoAlcance] = useState("Hotel");
  const [hotelId, setHotelId] = useState(usuarioActual?.hotel_id || 0);
  const [usuarioId, setUsuarioId] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().split("T")[0],
  );

  const tresDiasDespues = new Date();
  tresDiasDespues.setDate(tresDiasDespues.getDate() + 3);
  const [fechaFin, setFechaFin] = useState(
    tresDiasDespues.toISOString().split("T")[0],
  );
  const [estatus, setEstatus] = useState("Activo");

  const cargarAnuncios = () => {
    setCargando(true);
    fetch(`${API_URL}/api_anuncios.php?accion=leer`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setAnuncios(res.anuncios);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  };

  useEffect(() => {
    cargarAnuncios();
  }, []);

  useEffect(() => {
    if (modalAbierto) setTimeout(() => primerInputRef.current?.focus(), 100);
  }, [modalAbierto]);

  const abrirModalNuevo = () => {
    setEdicionId(0);
    setTipoAlcance("Hotel");
    setHotelId(usuarioActual?.hotel_id || 0);
    setUsuarioId(0);
    setMensaje("");
    setFechaInicio(new Date().toISOString().split("T")[0]);
    setFechaFin(tresDiasDespues.toISOString().split("T")[0]);
    setEstatus("Activo");
    setModalAbierto(true);
  };

  const abrirModalEditar = (a) => {
    setEdicionId(a.id);
    setTipoAlcance(a.tipo_alcance);
    setHotelId(a.hotel_id);
    setUsuarioId(a.usuario_id);
    setMensaje(a.mensaje);
    setFechaInicio(a.fecha_inicio);
    setFechaFin(a.fecha_fin);
    setEstatus(a.estatus);
    setModalAbierto(true);
  };

  const handleGuardar = (e) => {
    e.preventDefault();
    if (!navigator.onLine) {
      alertaToast("error", "⚡ Sin conexión a internet.");
      return;
    }
    setGuardando(true);

    const payload = {
      id: edicionId,
      tipo_alcance: tipoAlcance,
      hotel_id: tipoAlcance === "Global" ? 0 : hotelId,
      usuario_id: tipoAlcance === "Personal" ? usuarioId : 0,
      mensaje,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estatus,
    };

    fetch(`${API_URL}/api_anuncios.php?accion=guardar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((res) => {
        setGuardando(false);
        if (res.success) {
          alertaToast("success", res.message);
          setModalAbierto(false);
          cargarAnuncios();
        } else {
          alertaToast("error", res.message);
        }
      });
  };

  const handleEliminar = async (id) => {
    const confirmacion = await Swal.fire({
      title: "¿Eliminar aviso?",
      text: "El personal ya no podrá ver este comunicado en el reloj checador.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (confirmacion.isConfirmed) {
      fetch(`${API_URL}/api_anuncios.php?accion=eliminar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            alertaToast("success", res.message);
            cargarAnuncios();

            // Si borramos el último item de una página, regresamos a la anterior
            const itemsRestantes = anuncios.length - 1;
            const maxPaginas = Math.ceil(itemsRestantes / itemsPorPagina);
            if (paginaActual > maxPaginas && maxPaginas > 0) {
              setPaginaActual(maxPaginas);
            }
          }
        });
    }
  };

  const getDestinatarioLabel = (a) => {
    if (a.tipo_alcance === "Global")
      return (
        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">
          🌍 Toda la Cadena
        </span>
      );
    if (a.tipo_alcance === "Hotel") {
      const h = hoteles.find((hot) => Number(hot.id) === Number(a.hotel_id));
      return (
        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
          🏨 {h ? h.alias || h.nombre : "Hotel Desconocido"}
        </span>
      );
    }
    if (a.tipo_alcance === "Personal") {
      const u = usuarios.find((usr) => Number(usr.id) === Number(a.usuario_id));
      return (
        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">
          👤 {u ? `${u.nombre} ${u.primer_apellido}` : "Usuario Eliminado"}
        </span>
      );
    }
  };

  // COMPONENTE DE PAGINACIÓN (NUEVO)
  const RenderPaginacion = ({ lista }) => {
    const paginas = totalPaginas(lista);
    if (paginas <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 gap-4">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          Mostrando del {paginaActual * itemsPorPagina - itemsPorPagina + 1} al{" "}
          {Math.min(paginaActual * itemsPorPagina, lista.length)} de{" "}
          {lista.length} avisos
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Anterior
          </button>
          <div className="flex items-center gap-1 hidden sm:flex">
            {[...Array(paginas)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPaginaActual(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-bold ${paginaActual === i + 1 ? "bg-indigo-600 text-white shadow-md" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPaginaActual((p) => Math.min(paginas, p + 1))}
            disabled={paginaActual === paginas}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fadeIn">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
            <span>📢</span> Comunicados y Avisos de RH
          </h2>
          <p className="text-xs text-slate-400">
            Total registrados: {anuncios.length} avisos
          </p>
        </div>
        <button
          onClick={abrirModalNuevo}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-sm transition-colors flex items-center gap-2"
        >
          <span>➕</span> Redactar Aviso
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <th className="p-4">Mensaje</th>
              <th className="p-4">Dirigido a</th>
              <th className="p-4">Vigencia</th>
              <th className="p-4">Estatus</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {cargando ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  Cargando avisos...
                </td>
              </tr>
            ) : anuncios.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  No hay comunicados activos.
                </td>
              </tr>
            ) : (
              getItemsPaginados(anuncios).map((a) => (
                <tr
                  key={a.id}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${a.estatus === "Inactivo" ? "opacity-50" : ""}`}
                >
                  <td className="p-4 max-w-xs truncate" title={a.mensaje}>
                    <span className="font-bold text-slate-800 dark:text-white">
                      💬 {a.mensaje}
                    </span>
                  </td>
                  <td className="p-4">{getDestinatarioLabel(a)}</td>
                  <td className="p-4 text-xs">
                    <div className="flex flex-col">
                      <span className="text-emerald-600">
                        Desde: {a.fecha_inicio}
                      </span>
                      <span className="text-rose-500">
                        Hasta: {a.fecha_fin}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase border whitespace-nowrap ${a.estatus === "Activo" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-red-500/10 text-red-600 border-red-500/30"}`}
                    >
                      ● {a.estatus}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => abrirModalEditar(a)}
                        className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(a.id)}
                        className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                      >
                        🗑️ Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* RENDERIZADO DEL PAGINADOR */}
        <RenderPaginacion lista={anuncios} />
      </div>

      {/* MODAL (Sin cambios) */}
      {modalAbierto && (
        <div
          onClick={() => setModalAbierto(false)}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span>✍️</span>{" "}
              {edicionId > 0
                ? "Editar Comunicado"
                : "Redactar Nuevo Comunicado"}
            </h3>

            <form onSubmit={handleGuardar} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                    Tipo de Alcance
                  </label>
                  <select
                    value={tipoAlcance}
                    onChange={(e) => {
                      setTipoAlcance(e.target.value);
                      setUsuarioId(0);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                  >
                    <option value="Global">🌍 Global (Toda la Cadena)</option>
                    <option value="Hotel">🏨 Por Hotel</option>
                    <option value="Personal">👤 Personal (1 a 1)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                    Visible Desde
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                    Visible Hasta
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-400 outline-none"
                  />
                </div>
              </div>

              {tipoAlcance !== "Global" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                      Seleccionar Hotel
                    </label>
                    <select
                      value={hotelId}
                      onChange={(e) => setHotelId(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                    >
                      <option value={0}>-- Selecciona un Hotel --</option>
                      {hoteles.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.alias || h.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {tipoAlcance === "Personal" && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                        Seleccionar Empleado
                      </label>
                      <select
                        value={usuarioId}
                        onChange={(e) => setUsuarioId(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                      >
                        <option value={0}>-- Selecciona un Empleado --</option>
                        {usuarios
                          .filter(
                            (u) =>
                              Number(u.hotel_base_id) === Number(hotelId) &&
                              u.estatus !== "Inactivo",
                          )
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre} {u.primer_apellido} ({u.rol})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-1">
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5 flex justify-between">
                  <span>Mensaje a mostrar en pantalla</span>
                  <span
                    className={`text-[10px] ${mensaje.length > 200 ? "text-rose-500" : "text-slate-400"}`}
                  >
                    {mensaje.length}/250 caracteres
                  </span>
                </label>
                <textarea
                  ref={primerInputRef}
                  required
                  maxLength={250}
                  rows={3}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escribe aquí el comunicado..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
                />
              </div>

              <div className="pt-1 w-1/3">
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-0.5">
                  Estatus del Aviso
                </label>
                <select
                  value={estatus}
                  onChange={(e) => setEstatus(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                >
                  <option value="Activo">● Activo (Publicado)</option>
                  <option value="Inactivo">🚫 Inactivo (Oculto)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3 mt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl shadow-md disabled:opacity-50 text-xs transition-colors"
                >
                  {guardando
                    ? "Guardando..."
                    : edicionId > 0
                      ? "Actualizar Aviso"
                      : "Publicar Aviso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
