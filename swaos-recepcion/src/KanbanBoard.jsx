import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const initialData = {
  columnas: {
    "zona-1": {
      id: "zona-1",
      titulo: "Zona 1 (Paola)",
      habitacionIds: ["h1101", "h1102"],
    },
    "zona-2": {
      id: "zona-2",
      titulo: "Zona 2 (María)",
      habitacionIds: ["h1202", "h1203"],
    },
  },
  habitaciones: {
    h1101: { id: "h1101", numero: "1101", estatus: "Salida Confirmada" },
    h1102: { id: "h1102", numero: "1102", estatus: "Ocupada" },
    h1202: { id: "h1202", numero: "1202", estatus: "En Proceso" },
    h1203: { id: "h1203", numero: "1203", estatus: "Limpia" },
  },
  ordenColumnas: ["zona-1", "zona-2"],
};

export default function KanbanBoard() {
  const [data, setData] = useState(initialData);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const columnaOrigen = data.columnas[source.droppableId];
    const columnaDestino = data.columnas[destination.droppableId];

    if (columnaOrigen === columnaDestino) {
      const nuevasHabitaciones = Array.from(columnaOrigen.habitacionIds);
      nuevasHabitaciones.splice(source.index, 1);
      nuevasHabitaciones.splice(destination.index, 0, draggableId);

      const nuevaColumna = {
        ...columnaOrigen,
        habitacionIds: nuevasHabitaciones,
      };
      setData({
        ...data,
        columnas: { ...data.columnas, [nuevaColumna.id]: nuevaColumna },
      });
      return;
    }

    const habitacionesOrigen = Array.from(columnaOrigen.habitacionIds);
    habitacionesOrigen.splice(source.index, 1);
    const nuevaColumnaOrigen = {
      ...columnaOrigen,
      habitacionIds: habitacionesOrigen,
    };

    const habitacionesDestino = Array.from(columnaDestino.habitacionIds);
    habitacionesDestino.splice(destination.index, 0, draggableId);
    const nuevaColumnaDestino = {
      ...columnaDestino,
      habitacionIds: habitacionesDestino,
    };

    setData({
      ...data,
      columnas: {
        ...data.columnas,
        [nuevaColumnaOrigen.id]: nuevaColumnaOrigen,
        [nuevaColumnaDestino.id]: nuevaColumnaDestino,
      },
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 p-4 overflow-x-auto bg-slate-100 min-h-screen">
        {data.ordenColumnas.map((columnaId) => {
          const columna = data.columnas[columnaId];
          const habitaciones = columna.habitacionIds.map(
            (id) => data.habitaciones[id],
          );

          return (
            <div
              key={columna.id}
              className="bg-white rounded-lg shadow w-80 flex flex-col"
            >
              <h2 className="p-4 font-bold border-b bg-slate-800 text-white rounded-t-lg">
                {columna.titulo}
              </h2>
              <Droppable droppableId={columna.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-grow p-4 min-h-[200px]"
                  >
                    {habitaciones.map((habitacion, index) => (
                      <Draggable
                        key={habitacion.id}
                        draggableId={habitacion.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="p-3 mb-2 bg-slate-50 border rounded shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing"
                          >
                            <div className="font-bold text-lg">
                              Hab. {habitacion.numero}
                            </div>
                            <div className="text-sm text-gray-500">
                              {habitacion.estatus}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
