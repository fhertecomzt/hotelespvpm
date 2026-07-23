import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const API_URL = "http://localhost/hotelespvpm/sistema/swaos-api";

const ESTATUS_LISTA = [
  "Ocupada",
  "Salida Confirmada",
  "Solicitud Aseo",
  "En Proceso",
  "Limpia",
  "DND",
];

const COLORES_ESTATUS = {
  Limpia: "bg-green-100 text-green-800 border-green-300",
  "En Proceso": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Salida Confirmada": "bg-blue-100 text-blue-800 border-blue-300",
  Ocupada: "bg-slate-100 text-slate-800 border-slate-300",
  "Solicitud Aseo": "bg-purple-100 text-purple-800 border-purple-300",
  DND: "bg-red-100 text-red-800 border-red-300",
};

export default function KanbanBoard() {
  const [data, setData] = useState(null);
  const [vista, setVista] = useState("zonas"); // 'zonas' o 'estatus'

  useEffect(() => {
    fetch(`${API_URL}/obtener_tablero.php`)
      .then((res) => res.json())
      .then((fetchedData) => setData(fetchedData))
      .catch((err) => console.error("Error cargando tablero:", err));
  }, []);

  // Función para reasignar camarista en el menú <select>
  const handleAsignarCamarista = (columnaId, nuevoUsuarioId) => {
    const dataActualizada = { ...data };
    dataActualizada.columnas[columnaId].camarista_id = nuevoUsuarioId
      ? parseInt(nuevoUsuarioId)
      : null;
    setData(dataActualizada);

    fetch(`${API_URL}/asignar_camarista.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zonaId: columnaId,
        usuarioId: nuevoUsuarioId,
      }),
    })
      .then((res) => res.json())
      .then((response) => {
        if (!response.success)
          console.error("Error en servidor:", response.message);
      })
      .catch((err) => console.error("Error de petición:", err));
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

        fetch(`${API_URL}/actualizar_zona.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            habitacionId: draggableId,
            nuevaZonaId: destination.droppableId,
          }),
        }).catch((err) => console.error("Error:", err));
      }
    } else {
      const nuevoEstatus = destination.droppableId.replace("estatus-", "");
      dataActualizada.habitaciones[draggableId].estatus = nuevoEstatus;

      fetch(`${API_URL}/actualizar_estatus.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habitacionId: draggableId,
          nuevoEstatus: nuevoEstatus,
        }),
      }).catch((err) => console.error("Error:", err));
    }

    setData(dataActualizada);
  };

  if (!data)
    return (
      <div className="p-10 text-center text-gray-500 font-bold">
        Cargando operaciones...
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
      <div className="p-10 text-center text-orange-500 font-bold">
        Respuesta inválida.
      </div>
    );

  let columnasRender = [];

  if (vista === "zonas") {
    columnasRender = data.ordenColumnas.map((id) => {
      const col = data.columnas[id];
      return { ...col, habitacionIds: col.habitacionIds };
    });
  } else {
    columnasRender = ESTATUS_LISTA.map((estatus) => {
      const habitacionesEnEstatus = Object.values(data.habitaciones)
        .filter((h) => h.estatus === estatus)
        .map((h) => h.id);

      return {
        id: `estatus-${estatus}`,
        titulo: estatus,
        habitacionIds: habitacionesEnEstatus,
      };
    });
  }

  return (
    <div className="bg-slate-50 h-screen flex flex-col font-sans overflow-hidden">
      {/* Header y Toggle Switch */}
      <div className="bg-white shadow-sm p-4 md:p-6 flex flex-col md:flex-row justify-between items-center shrink-0 z-10 border-b border-slate-200">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-0">
          Torre de Control - Recepción
        </h1>

        <div className="bg-slate-200 p-1 rounded-lg flex space-x-1 overflow-x-auto max-w-full">
          <button
            className={`whitespace-nowrap px-4 py-2 rounded-md font-semibold text-sm transition-all duration-200 ${vista === "zonas" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setVista("zonas")}
          >
            📋 Asignación de Zonas
          </button>
          <button
            className={`whitespace-nowrap px-4 py-2 rounded-md font-semibold text-sm transition-all duration-200 ${vista === "estatus" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setVista("estatus")}
          >
            ⚡ Operación en Vivo
          </button>
        </div>
      </div>

      {/* Tablero Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 md:gap-6 px-4 md:px-6 pb-6 overflow-x-auto flex-1 items-stretch pt-6">
          {columnasRender.map((columna) => {
            const habitaciones = columna.habitacionIds.map(
              (id) => data.habitaciones[id],
            );

            return (
              <div
                key={columna.id}
                className="bg-slate-100/70 rounded-xl border border-slate-200 shadow-sm flex flex-col w-[85vw] sm:w-[320px] xl:flex-1 xl:min-w-[240px] shrink-0 max-h-full"
              >
                {/* Cabecera de Columna (Con Menú Desplegable si estamos en la vista de Zonas) */}
                <div className="p-4 border-b border-slate-200 bg-slate-100/80 rounded-t-xl flex flex-col shrink-0 gap-2">
                  <div className="flex justify-between items-center">
                    <h2 className="font-bold text-slate-700 text-base">
                      {columna.titulo}
                    </h2>
                    <span className="bg-white text-slate-500 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                      {habitaciones.length}
                    </span>
                  </div>

                  {/* MENÚ <SELECT> PARA ASIGNAR CAMARISTA (Solo en Vista de Zonas) */}
                  {vista === "zonas" && data.camaristas && (
                    <div className="mt-1">
                      <select
                        value={columna.camarista_id || ""}
                        onChange={(e) =>
                          handleAsignarCamarista(columna.id, e.target.value)
                        }
                        className="w-full bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-md p-1.5 focus:ring-2 focus:ring-indigo-400 focus:outline-none shadow-sm cursor-pointer"
                      >
                        <option value="">-- Sin Camarista Asignada --</option>
                        {data.camaristas.map((cam) => (
                          <option key={cam.id} value={cam.id}>
                            👤 {cam.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <Droppable droppableId={columna.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-grow p-4 overflow-y-auto min-h-[150px] transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50/50" : ""}`}
                    >
                      {habitaciones.map((habitacion, index) => {
                        const colorClase =
                          COLORES_ESTATUS[habitacion.estatus] ||
                          "bg-white text-slate-800 border-slate-200";

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
                                className={`p-4 mb-3 border rounded-lg shadow-sm transition-all cursor-grab active:cursor-grabbing
                                  ${colorClase} 
                                  ${snapshot.isDragging ? "shadow-lg ring-2 ring-indigo-400 scale-105" : "hover:shadow-md"}
                                `}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-black text-xl">
                                    Hab. {habitacion.numero}
                                  </span>
                                </div>
                                <div className="text-xs font-semibold uppercase tracking-wider opacity-80 mt-2">
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
    </div>
  );
}
