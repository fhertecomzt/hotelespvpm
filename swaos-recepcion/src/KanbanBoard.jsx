import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { alertaToast, comprimirImagen } from "./utils";

const API_URL = "/sistema/swaos-api";

const ESTATUS_LISTA = [
  "Ocupada",
  "Salida Confirmada",
  "Solicitud Aseo",
  "En Proceso",
  "Limpia",
  "DND",
];

const COLORES_ESTATUS = {
  Limpia:
    "bg-green-100 text-green-800 border-green-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-500/40",
  "En Proceso":
    "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-500/40",
  "Salida Confirmada":
    "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-500/40",
  Ocupada:
    "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  "Solicitud Aseo":
    "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-500/40",
  DND: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-500/40",
};

const TIPOS_DANO = [
  "Aire Acondicionado",
  "Plomería",
  "Eléctrico",
  "Mobiliario",
  "Otro",
];

export default function KanbanBoard({ usuarioActual }) {
  const [data, setData] = useState(null);
  const [vista, setVista] = useState("estatus");
  const [hotelActivo, setHotelActivo] = useState(usuarioActual?.hotel_id || 1);

  const [modalDano, setModalDano] = useState(null);
  const [tipoDano, setTipoDano] = useState(TIPOS_DANO[0]);
  const [descDano, setDescDano] = useState("");
  const [fotoDano, setFotoDano] = useState(null);
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const token = localStorage.getItem("swaos_token"); // Sacamos el token

  const esRecepcion = usuarioActual?.rol === "Recepcion";

  const cargarTablero = (silencioso = false) => {
    fetch(`${API_URL}/obtener_tablero.php?hotel_id=${hotelActivo}`, {
      headers: {
        Authorization: `Bearer ${token}`, // Lo enviamos al PHP
      },
    })
      .then((res) => res.json())
      .then((fetchedData) => {
        if (fetchedData.success || fetchedData.columnas) {
          setData(fetchedData);
        }
      })
      .catch((err) => console.error("Error cargando tablero:", err));
  };

  useEffect(() => {
    if (!esRecepcion) {
      setVista("zonas");
    }
    cargarTablero(false);

    // Sincronización automática en segundo plano cada 10 segundos
    const intervalo = setInterval(() => cargarTablero(true), 10000);
    return () => clearInterval(intervalo);
  }, [esRecepcion, hotelActivo]);

  // TRADUCTOR DINÁMICO DE ID A ALIAS
  const getHotelAlias = (id) => {
    const lista = data?.hoteles_lista || [];
    const h = lista.find((item) => Number(item.id) === Number(id));
    if (!h) return `Hotel ${id}`;
    return h.alias || h.nombre;
  };

  const handleAsignarCamarista = (columnaId, nuevoUsuarioId) => {
    if (esRecepcion) {
      alertaToast("error", "Recepción no tiene permisos para reasignar zonas.");
      return;
    }

    const dataActualizada = { ...data };
    if (dataActualizada.columnas[columnaId]) {
      dataActualizada.columnas[columnaId].camarista_id = nuevoUsuarioId
        ? parseInt(nuevoUsuarioId)
        : null;
      setData(dataActualizada);
    }

    const idRealZona = columnaId.replace("col-", "");

    fetch(`${API_URL}/asignar_camarista.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ zonaId: idRealZona, usuarioId: nuevoUsuarioId }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) alertaToast("success", "Camarista asignada a la zona");
      })
      .catch((err) => console.error("Error:", err));
  };

  const enviarReporteDano = async () => {
    if (!modalDano) return;

    // 🔒 VALIDACIÓN DE TEXTO VACÍO: Evita reportes en blanco o de puros espacios
    if (!descDano || descDano.trim() === "") {
      alertaToast(
        "error",
        "⚠️ Por favor describe cuál es la falla antes de enviar.",
      );
      return;
    }

    setEnviandoReporte(true);

    try {
      const formData = new FormData();
      formData.append("habitacion_id", modalDano);
      formData.append("usuario_id", usuarioActual?.id || 4);
      formData.append("tipo_dano", tipoDano);
      formData.append("descripcion", descDano);

      if (fotoDano) {
        const blobComprimido = await comprimirImagen(fotoDano);
        formData.append("foto", blobComprimido, `dano_rec_${modalDano}.webp`);
      }

      const res = await fetch(`${API_URL}/reportar_dano.php`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const respuesta = await res.json();

      if (respuesta.success) {
        alertaToast("success", "Incidencia enviada a Mantenimiento");
        setModalDano(null);
        setTipoDano(TIPOS_DANO[0]);
        setDescDano("");
        setFotoDano(null);
      } else {
        alertaToast("error", "Error: " + respuesta.message);
      }
    } catch (err) {
      alertaToast("error", "Error de red al reportar");
    } finally {
      setEnviandoReporte(false);
    }
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const dataActualizada = { ...data };

    if (vista === "zonas") {
      if (esRecepcion) return;

      const columnaOrigen = dataActualizada.columnas[source.droppableId];
      const columnaDestino = dataActualizada.columnas[destination.droppableId];

      if (columnaOrigen === columnaDestino) {
        const nuevasHabitaciones = Array.from(columnaOrigen.habitacionIds);
        nuevasHabitaciones.splice(source.index, 1);
        nuevasHabitaciones.splice(destination.index, 0, draggableId);
        columnaOrigen.habitacionIds = nuevasHabitaciones;
      } else {
        const habitacionesOrigen = Array.from(columnaOrigen.habitacionIds);
        habitacionesOrigen.splice(source.index, 1);
        const habitacionesDestino = Array.from(columnaDestino.habitacionIds);
        habitacionesDestino.splice(destination.index, 0, draggableId);

        columnaOrigen.habitacionIds = habitacionesOrigen;
        columnaDestino.habitacionIds = habitacionesDestino;

        const idRealHab = draggableId.replace("hab-", "");
        const idRealZona = destination.droppableId.replace("col-", "");

        fetch(`${API_URL}/actualizar_zona.php`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            habitacionId: idRealHab,
            nuevaZonaId: idRealZona,
          }),
        }).catch((err) => console.error("Error:", err));
      }
    } else {
      const nuevoEstatus = destination.droppableId.replace("estatus-", "");
      if (dataActualizada.habitaciones[draggableId]) {
        dataActualizada.habitaciones[draggableId].estatus = nuevoEstatus;
      }

      const idRealHab = draggableId.replace("hab-", "");

      fetch(`${API_URL}/actualizar_estatus.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitacionId: idRealHab,
          nuevoEstatus: nuevoEstatus,
        }),
      }).catch((err) => console.error("Error:", err));
    }

    setData(dataActualizada);
  };

  if (!data)
    return (
      <div className="p-10 text-center text-slate-500 dark:text-slate-400 font-bold animate-pulse">
        Cargando operaciones del tablero...
      </div>
    );
  if (data.error)
    return (
      <div className="p-10 text-center text-red-500 font-bold">
        Error: {data.error}
      </div>
    );
  if (!data.ordenColumnas)
    return (
      <div className="p-10 text-center text-amber-500 font-bold">
        Sin zonas operativas configuradas para este hotel.
      </div>
    );

  let columnasRender = [];

  if (vista === "zonas") {
    columnasRender = data.ordenColumnas.map((id) => {
      const col = data.columnas[id];
      return { ...col, habitacionIds: col.habitacionIds || [] };
    });
  } else {
    columnasRender = ESTATUS_LISTA.map((estatus) => {
      const habitacionesEnEstatus = Object.values(data.habitaciones || {})
        .filter((h) => h.estatus === estatus)
        .map((h) => h.id);

      return {
        id: `estatus-${estatus}`,
        titulo: estatus,
        habitacionIds: habitacionesEnEstatus,
      };
    });
  }

  const camaristasCasa = data.camaristas
    ? data.camaristas.filter(
        (c) => Number(c.hotel_base_id) === Number(hotelActivo),
      )
    : [];
  const camaristasApoyo = data.camaristas
    ? data.camaristas.filter(
        (c) => Number(c.hotel_base_id) !== Number(hotelActivo),
      )
    : [];

  const listaHoteles = data.hoteles_lista || [];
  const hotelActualObjeto = listaHoteles.find(
    (h) => Number(h.id) === Number(hotelActivo),
  ) || { alias: `Hotel ${hotelActivo}`, nombre: `Hotel ${hotelActivo}` };
  const aliasCasa = hotelActualObjeto.alias || hotelActualObjeto.nombre;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 h-screen flex flex-col font-sans overflow-hidden transition-colors duration-300">
      {/* CABECERA CON SELECTOR DINÁMICO Y DISEÑO ADAPTATIVO */}
      <div className="bg-white dark:bg-slate-800 shadow-sm p-4 md:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center shrink-0 z-10 border-b border-slate-200 dark:border-slate-700 gap-4 transition-colors">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
              {esRecepcion
                ? "Torre de Control - Recepción"
                : "Gestión Operativa y Asignaciones"}
            </h1>
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg text-white shadow-sm bg-indigo-600 shrink-0">
              🏨 {aliasCasa}
            </span>
            {/* LUZ VERDE DE MONITOREO EN VIVO */}
            <span
              className="flex h-3 w-3 relative ml-1"
              title="Sincronización en vivo cada 10 segundos"
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
            {esRecepcion
              ? "Monitoreo en vivo y despacho de fallas"
              : "Control de zonas y préstamo de personal de limpieza entre hoteles"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full lg:w-auto">
          {/* SELECTOR DE HOTELES DINÁMICO */}
          <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex flex-wrap gap-1 justify-center transition-colors">
            {listaHoteles.map((h) => (
              <button
                key={h.id}
                onClick={() => setHotelActivo(h.id)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${Number(hotelActivo) === Number(h.id) ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"}`}
              >
                🏨 {h.alias || h.nombre}
              </button>
            ))}
          </div>

          {/* TOGGLE VISTA ZONAS VS ESTATUS */}
          <div className="bg-slate-200 dark:bg-slate-900 p-1 rounded-lg flex space-x-1 justify-center transition-colors">
            {!esRecepcion && (
              <button
                className={`flex-1 sm:flex-none whitespace-nowrap px-3 md:px-4 py-1.5 md:py-2 rounded-md font-semibold text-xs md:text-sm transition-all duration-200 ${vista === "zonas" ? "bg-white dark:bg-slate-800 shadow text-indigo-600 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"}`}
                onClick={() => setVista("zonas")}
              >
                📋 Zonas
              </button>
            )}
            <button
              className={`flex-1 sm:flex-none whitespace-nowrap px-3 md:px-4 py-1.5 md:py-2 rounded-md font-semibold text-xs md:text-sm transition-all duration-200 ${vista === "estatus" ? "bg-white dark:bg-slate-800 shadow text-indigo-600 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"}`}
              onClick={() => setVista("estatus")}
            >
              ⚡ En Vivo
            </button>
          </div>
        </div>
      </div>

      {/* TABLERO KANBAN CON COLUMNAS ELÁSTICAS Y ADAPTATIVAS */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 md:gap-4 lg:gap-5 px-3 md:px-6 pb-6 overflow-x-auto flex-1 items-stretch pt-4 md:pt-6">
          {columnasRender.map((columna) => {
            const habitaciones = (columna.habitacionIds || [])
              .map((id) => data.habitaciones[id])
              .filter(Boolean);

            return (
              <div
                key={columna.id}
                className="bg-slate-100/70 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col w-[85vw] sm:min-w-[240px] sm:max-w-[360px] lg:min-w-[220px] lg:max-w-none flex-1 shrink-0 max-h-full transition-colors"
              >
                <div className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 rounded-t-2xl flex flex-col shrink-0 gap-2">
                  <div className="flex justify-between items-center gap-2">
                    <h2 className="font-bold text-slate-700 dark:text-white text-sm md:text-base truncate">
                      {columna.titulo}
                    </h2>
                    <span className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm shrink-0">
                      {habitaciones.length}
                    </span>
                  </div>

                  {/* SELECTOR DE ASIGNACIÓN CON ALIAS REALES */}
                  {vista === "zonas" && !esRecepcion && (
                    <div className="mt-1">
                      <select
                        value={columna.camarista_id || ""}
                        onChange={(e) =>
                          handleAsignarCamarista(columna.id, e.target.value)
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white text-[11px] md:text-xs font-bold rounded-lg p-1.5 md:p-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none shadow-sm cursor-pointer transition-colors truncate"
                      >
                        <option value="">-- Sin Camarista Asignada --</option>

                        {camaristasCasa.length > 0 && (
                          <optgroup
                            label={`--- PERSONAL DE CASA (${aliasCasa}) ---`}
                          >
                            {camaristasCasa.map((cam) => (
                              <option key={cam.id} value={cam.id}>
                                👤 {cam.nombre} {cam.primer_apellido || ""}
                              </option>
                            ))}
                          </optgroup>
                        )}

                        {camaristasApoyo.length > 0 && (
                          <optgroup label="--- PERSONAL DE APOYO (OTRO HOTEL) ---">
                            {camaristasApoyo.map((cam) => (
                              <option
                                key={cam.id}
                                value={cam.id}
                                className="text-purple-700 dark:text-purple-400 font-semibold"
                              >
                                🤝 {cam.nombre} {cam.primer_apellido || ""} (De{" "}
                                {getHotelAlias(cam.hotel_base_id)})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  )}
                </div>

                <Droppable droppableId={columna.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-grow p-3 md:p-4 overflow-y-auto min-h-[150px] transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50/50 dark:bg-indigo-900/20" : ""}`}
                    >
                      {habitaciones.map((habitacion, index) => {
                        const colorClase =
                          COLORES_ESTATUS[habitacion.estatus] ||
                          "bg-white text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700";

                        return (
                          <Draggable
                            key={habitacion.id}
                            draggableId={habitacion.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 md:p-4 mb-3 border rounded-xl shadow-sm transition-all cursor-grab active:cursor-grabbing
                                  ${colorClase} 
                                  ${snapshot.isDragging ? "shadow-lg ring-2 ring-indigo-400 scale-105" : "hover:shadow-md"}
                                `}
                              >
                                <div className="flex justify-between items-center mb-1 gap-2">
                                  <span className="font-black text-lg lg:text-xl truncate">
                                    Hab. {habitacion.numero}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setModalDano(
                                        habitacion.id_real || habitacion.id,
                                      );
                                    }}
                                    title="Despachar reporte de falla a Mantenimiento"
                                    className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg text-xs font-bold border border-red-200 transition-colors flex items-center gap-1 shadow-sm shrink-0"
                                  >
                                    ⚠️
                                  </button>
                                </div>
                                <div className="text-[11px] md:text-xs font-semibold uppercase tracking-wider opacity-80 mt-1 md:mt-2 truncate">
                                  {habitacion.estatus}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* MODAL DE REPORTES DE DAÑO ADAPTATIVO */}
      {modalDano && (
        <div
          onClick={() => {
            setModalDano(null);
            setFotoDano(null);
          }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span>⚠️</span> Despachar Falla ({aliasCasa})
            </h3>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Categoría del Problema
              </label>
              <select
                value={tipoDano}
                onChange={(e) => setTipoDano(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl p-2.5 focus:ring-2 focus:ring-red-400 focus:outline-none font-semibold transition-colors text-sm"
              >
                {TIPOS_DANO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Detalles del reporte del huésped
              </label>
              <textarea
                value={descDano}
                onChange={(e) => setDescDano(e.target.value)}
                placeholder="Ej. El huésped reporta que el aire acondicionado no enfría..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl p-2.5 focus:ring-2 focus:ring-red-400 focus:outline-none h-24 resize-none text-sm font-medium transition-colors"
              ></textarea>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Adjuntar Archivo o Foto (Opcional)
              </label>
              <input
                type="file"
                id="foto-rec-input"
                accept="image/*"
                onChange={(e) => setFotoDano(e.target.files[0])}
                className="hidden"
              />
              <button
                type="button"
                onClick={() =>
                  document.getElementById("foto-rec-input").click()
                }
                className={`w-full border border-dashed font-semibold p-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors ${fotoDano ? "bg-red-50 border-red-400 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"}`}
              >
                <span>📎</span>{" "}
                {fotoDano
                  ? `Archivo adjunto: ${fotoDano.name.substring(0, 22)}...`
                  : "Adjuntar foto o captura de pantalla"}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalDano(null);
                  setFotoDano(null);
                }}
                className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={enviarReporteDano}
                disabled={enviandoReporte}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors disabled:opacity-50 text-sm"
              >
                {enviandoReporte ? "Despachando..." : "Enviar Orden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
