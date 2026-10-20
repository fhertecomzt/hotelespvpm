import React, { useState, useEffect } from "react";
import { alertaToast } from "./utils";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

const API_URL = "/sistema/swaos-api";

// NOTA: Agregamos "hoteles" como prop para poblar el selector del Superusuario
export default function TablaAsistencias({
  usuarioActual,
  token,
  hoteles = [],
  usuarios = [],
}) {
  // Validamos si es Superusuario o si tiene el permiso específico de editar asistencias
  const puedeEditar =
    usuarioActual?.rol === "Superusuario" ||
    (usuarioActual?.permisos &&
      usuarioActual.permisos.includes("editar_asistencias"));

  const [asistencias, setAsistencias] = useState([]);
  const [cargando, setCargando] = useState(true);

  //formato de fecha latino
  const formatearFecha = (fecha_sql) => {
    if (!fecha_sql) return "--/--/----";
    const [y, m, d] = fecha_sql.split("-");
    return `${d}/${m}/${y}`;
  };

  // Formato hora en contadores de retardos y horas de salida
  const formatoHorasMinutos = (totalMinutos) => {
    if (!totalMinutos || totalMinutos === 0) return "";
    if (totalMinutos < 60) return `${totalMinutos}m`;

    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`;
  };

  // ESTADOS DEL MODAL DE CORRECCIÓN MANUAL
  const [modalEdicion, setModalEdicion] = useState(false);
  const [edicionDatos, setEdicionDatos] = useState({
    id: "",
    empleado: "",
    fecha: "",
    hora_entrada: "",
    hora_salida: "",
    motivo: "",
  });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // ESTADOS DEL MODAL DE PERMISOS
  const [modalPermiso, setModalPermiso] = useState(false);
  const [permisoUsrId, setPermisoUsrId] = useState("");
  const [permisoInicio, setPermisoInicio] = useState("");
  const [permisoFin, setPermisoFin] = useState("");
  const [permisoTipo, setPermisoTipo] = useState("Vacaciones");
  const [permisoMotivo, setPermisoMotivo] = useState("");
  const [guardandoPermiso, setGuardandoPermiso] = useState(false);

  // ESTADOS DE LOS FILTROS
  const [busqueda, setBusqueda] = useState("");
  const [filtroHotel, setFiltroHotel] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // PAGINACIÓN LOCAL
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 5;

  // CARGA DE ASISTENCIA AUTOMATICO
  useEffect(() => {
    cargarAsistencias(true);
    const intervalo = setInterval(() => {
      cargarAsistencias(false);
    }, 60000); // <-- Cambiado de 10000 a 60000 (1 minuto)
    return () => clearInterval(intervalo);
  }, [usuarioActual]);

  // Si el usuario escribe o cambia un filtro, regresamos a la página 1 para evitar tablas en blanco
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroHotel, filtroEstatus, fechaDesde, fechaHasta]);

  const cargarAsistencias = (mostrarSpinner = true) => {
    if (mostrarSpinner) setCargando(true);

    const hotelId = usuarioActual?.hotel_id || 0;
    const rol = usuarioActual?.rol || "";

    fetch(
      `${API_URL}/obtener_asistencias.php?hotel_id=${hotelId}&rol_solicitante=${rol}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAsistencias(data.asistencias);
        } else if (mostrarSpinner) {
          alertaToast("error", data.message);
        }
        if (mostrarSpinner) setCargando(false);
      })
      .catch(() => {
        if (mostrarSpinner) {
          alertaToast("error", "Error al cargar el reporte de asistencias");
          setCargando(false);
        }
      });
  };

  const formatearHora = (hora) => {
    if (!hora) return "--:--";
    const [h, m] = hora.split(":");
    let horas = parseInt(h);
    const ampm = horas >= 12 ? "PM" : "AM";
    horas = horas % 12 || 12;
    return `${horas}:${m} ${ampm}`;
  };

  // ==========================================
  // AUDITORIA DE FALTAS
  // ==========================================

  const handleAuditoriaFaltas = async () => {
    const esOscuro = document.documentElement.classList.contains("dark");

    // Calculamos la fecha de ayer en formato YYYY-MM-DD
    const ayer = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const { value: fechaAuditoria } = await Swal.fire({
      title: "Auditoría de Faltas",
      text: "El sistema buscará empleados que no checaron en esta fecha y les asignará una falta. ¿Qué día deseas auditar?",
      input: "date",
      inputValue: ayer,
      showCancelButton: true,
      confirmButtonText: "Ejecutar Auditoría",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e11d48",
      background: esOscuro ? "#1e293b" : "#ffffff",
      color: esOscuro ? "#f8fafc" : "#0f172a",
    });

    if (fechaAuditoria) {
      // ✅ CORRECCIÓN: Usamos tu estado directamente
      setCargando(true);

      const hotelId = usuarioActual?.hotel_id || 0;
      const rol = usuarioActual?.rol || "";

      const token = import.meta.env.VITE_CRON_TOKEN;

      fetch(`/sistema/swaos-api/sincronizar_faltas.php?token=${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha: fechaAuditoria,
          hotel_id: hotelId,
          rol_solicitante: rol,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alertaToast("success", data.message);
            cargarAsistencias(true); // Recargamos la tabla para ver las nuevas faltas
          } else {
            alertaToast("error", data.message);
            setCargando(false);
          }
        })
        .catch(() => {
          alertaToast(
            "error",
            "Error al conectar con el servidor para la auditoría.",
          );
          setCargando(false);
        });
    }
  };

  // Enviar formulario de permiso
  const handleGuardarPermiso = (e) => {
    e.preventDefault();
    if (!permisoUsrId || !permisoInicio || !permisoFin) {
      alertaToast("error", "Llena todos los campos obligatorios.");
      return;
    }

    setGuardandoPermiso(true);
    fetch(`${API_URL}/registrar_permiso.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        usuario_id: permisoUsrId,
        fecha_inicio: permisoInicio,
        fecha_fin: permisoFin,
        tipo_permiso: permisoTipo,
        motivo: permisoMotivo,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setGuardandoPermiso(false);
        if (data.success) {
          alertaToast("success", data.message);
          setModalPermiso(false);
          cargarAsistencias(true);
        } else {
          alertaToast("error", data.message);
        }
      })
      .catch(() => {
        setGuardandoPermiso(false);
        alertaToast("error", "Error de red al registrar el permiso.");
      });
  };

  // Abrir modal edición
  const abrirModalEdicion = (a) => {
    setEdicionDatos({
      id: a.id,
      empleado: `${a.nombre} ${a.primer_apellido}`,
      fecha: formatearFecha(a.fecha),
      // Cortamos a 5 caracteres (HH:mm) para que el input type="time" lo lea correctamente
      hora_entrada: a.hora_entrada ? a.hora_entrada.substring(0, 5) : "",
      hora_salida: a.hora_salida ? a.hora_salida.substring(0, 5) : "",
      motivo: "",
    });
    setModalEdicion(true);
  };

  const handleGuardarEdicion = (e) => {
    e.preventDefault();
    if (!edicionDatos.motivo) {
      alertaToast("error", "Debes escribir un motivo de auditoría.");
      return;
    }
    setGuardandoEdicion(true);
    fetch(`${API_URL}/corregir_asistencia.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(edicionDatos),
    })
      .then((res) => res.json())
      .then((data) => {
        setGuardandoEdicion(false);
        if (data.success) {
          alertaToast("success", data.message);
          setModalEdicion(false);
          cargarAsistencias(true);
        } else {
          alertaToast("error", data.message);
        }
      })
      .catch(() => {
        setGuardandoEdicion(false);
        alertaToast("error", "Error al corregir asistencia.");
      });
  };

  // ==========================================
  // MOTOR DE FILTRADO LOCAL (OMNI-SEARCH)
  // ==========================================
  const asistenciasFiltradas = asistencias.filter((a) => {
    const nombreCompleto =
      `${a.nombre} ${a.primer_apellido} ${a.segundo_apellido || ""}`.toLowerCase();
    const rolEmpleado = (a.rol || "").toLowerCase();
    const terminoBusqueda = busqueda.toLowerCase();

    // 1. Coincidencia Inteligente (Buscador por Nombre O por Rol)
    const coincideBusqueda =
      nombreCompleto.includes(terminoBusqueda) ||
      rolEmpleado.includes(terminoBusqueda);

    // 2. Coincidencia de Estatus
    const coincideEstatus =
      filtroEstatus === "" || a.estatus_entrada === filtroEstatus;

    // 3. Coincidencia de Hotel (Modo SaaS)
    const coincideHotel =
      filtroHotel === "" || Number(a.hotel_id) === Number(filtroHotel);

    // 4. Coincidencia Rango de Fechas
    const coincideDesde = fechaDesde === "" || a.fecha >= fechaDesde;
    const coincideHasta = fechaHasta === "" || a.fecha <= fechaHasta;

    return (
      coincideBusqueda &&
      coincideEstatus &&
      coincideHotel &&
      coincideDesde &&
      coincideHasta
    );
  });

  // Calculamos la paginación SOBRE el arreglo ya filtrado
  const totalPaginas = Math.ceil(asistenciasFiltradas.length / itemsPorPagina);
  const indiceUltimoItem = paginaActual * itemsPorPagina;
  const indicePrimerItem = indiceUltimoItem - itemsPorPagina;
  const itemsPaginados = asistenciasFiltradas.slice(
    indicePrimerItem,
    indiceUltimoItem,
  );

  if (cargando) {
    return (
      <div className="text-center py-10 text-slate-400 font-bold animate-pulse">
        Cargando bitácora de asistencias...
      </div>
    );
  }

  // función Botón "Exportar a Excel"
  const handleExportarExcel = () => {
    if (asistenciasFiltradas.length === 0) {
      alertaToast("warning", "No hay datos en la tabla para exportar.");
      return;
    }

    // Usamos \uFEFF para que Excel reconozca los acentos (UTF-8)
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";

    // Cabeceras del Excel
    csvContent +=
      "FECHA,EMPLEADO,ROL,HORA ENTRADA,ESTATUS,MIN. RETARDO,HORA SALIDA,SALIDA ANTICIPADA,HORAS EXTRAS,TOTAL TRABAJADO,JUSTIFICACION\n";

    // Recorremos los datos filtrados (no los paginados, para descargar TODO el reporte)
    asistenciasFiltradas.forEach((a) => {
      const empleado =
        `${a.nombre} ${a.primer_apellido} ${a.segundo_apellido || ""}`.trim();
      const entrada = a.hora_entrada || "--:--";
      const salida = a.hora_salida || "--:--";
      const retardo = a.minutos_retardo > 0 ? `${a.minutos_retardo} min` : "0";
      const anticipada =
        a.minutos_salida_anticipada > 0
          ? `${a.minutos_salida_anticipada} min`
          : "0";
      const extras = a.horas_extras > 0 ? `${a.horas_extras} horas` : "0";
      const total =
        a.minutos_trabajados > 0
          ? formatoHorasMinutos(a.minutos_trabajados)
          : "0";
      const justificacion = a.justificacion || "";

      // Envolvemos en comillas para evitar que las comas del texto rompan el CSV
      csvContent += `${a.fecha},"${empleado}","${a.rol}",${entrada},"${a.estatus_entrada}",${retardo},${salida},${anticipada},${extras},"${total}","${justificacion}"\n`;
    });

    // Generamos el archivo descargable
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);

    // Nombre inteligente del archivo
    const nombreArchivo =
      fechaDesde && fechaHasta
        ? `Reporte_Asistencia_${fechaDesde}_al_${fechaHasta}.csv`
        : `Reporte_Asistencia_General.csv`;

    link.setAttribute("download", nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportarNomina = () => {
    if (asistenciasFiltradas.length === 0) {
      alertaToast("warning", "No hay datos para generar la nómina.");
      return;
    }

    // 1. Agrupar la información por Empleado y calcular totales
    const agrupado = {};

    asistenciasFiltradas.forEach((a) => {
      const nombreCompleto =
        `${a.nombre} ${a.primer_apellido} ${a.segundo_apellido || ""}`.trim();

      if (!agrupado[nombreCompleto]) {
        agrupado[nombreCompleto] = {
          rol: a.rol,
          registros: [],
          totalMinutosTrabajados: 0,
          totalHorasExtras: 0,
          conteoRetardos: 0,
          conteoFaltas: 0,
        };
      }

      agrupado[nombreCompleto].registros.push(a);

      // Sumatorias automáticas
      agrupado[nombreCompleto].totalMinutosTrabajados +=
        Number(a.minutos_trabajados) || 0;
      agrupado[nombreCompleto].totalHorasExtras += Number(a.horas_extras) || 0;
      if (a.estatus_entrada === "Retardo")
        agrupado[nombreCompleto].conteoRetardos++;
      if (a.estatus_entrada === "Falta")
        agrupado[nombreCompleto].conteoFaltas++;
    });

    // 2. Construir la estructura visual del Excel (Filas y Columnas)
    const datosExcel = [];

    // Título General
    datosExcel.push(["REPORTE DE ASISTENCIA Y NÓMINA"]);
    datosExcel.push([
      `Periodo: ${fechaDesde || "Histórico"} al ${fechaHasta || "Actual"}`,
    ]);
    datosExcel.push([]); // Fila en blanco

    // Recorrer cada empleado para armar su "Kardex"
    Object.keys(agrupado).forEach((nombre) => {
      const emp = agrupado[nombre];

      // Cabecera del Empleado
      datosExcel.push([`EMPLEADO: ${nombre}`, "", `PUESTO: ${emp.rol}`]);

      // Columnas de detalle
      datosExcel.push([
        "FECHA",
        "ENTRADA",
        "SALIDA",
        "ESTATUS",
        "MIN. RETARDO",
        "TIEMPO LABORADO",
        "HRS EXTRAS",
        "JUSTIFICACIÓN",
      ]);

      // Filas de días trabajados
      emp.registros.forEach((dia) => {
        datosExcel.push([
          dia.fecha,
          dia.hora_entrada || "--:--",
          dia.hora_salida || "--:--",
          dia.estatus_entrada,
          dia.minutos_retardo > 0 ? dia.minutos_retardo : "",
          dia.minutos_trabajados > 0
            ? formatoHorasMinutos(dia.minutos_trabajados)
            : "",
          dia.horas_extras > 0 ? dia.horas_extras : "",
          dia.justificacion || "",
        ]);
      });

      // Fila de Sumatoria Total del Empleado
      datosExcel.push([
        "",
        "",
        "",
        "TOTALES:",
        `Retardos: ${emp.conteoRetardos}`,
        `Trabajado: ${formatoHorasMinutos(emp.totalMinutosTrabajados)}`,
        `Extras: ${emp.totalHorasExtras}h`,
        `Faltas: ${emp.conteoFaltas}`,
      ]);

      // Espaciadores entre empleados
      datosExcel.push([]);
      datosExcel.push([]);
    });

    // 3. Generar el archivo usando la librería XLSX
    const worksheet = XLSX.utils.aoa_to_sheet(datosExcel); // aoa = Array of Arrays
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Nómina");

    // Auto-ajustar el ancho de las columnas
    const colWidths = [
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
      { wch: 35 },
    ];
    worksheet["!cols"] = colWidths;

    // Descargar
    const nombreArchivo =
      fechaDesde && fechaHasta
        ? `Nomina_Agrupada_${fechaDesde}_al_${fechaHasta}.xlsx`
        : `Nomina_General.xlsx`;

    XLSX.writeFile(workbook, nombreArchivo);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="w-full xl:w-auto">
          <h2 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-3">
            Bitácora de Asistencias (Biométrico)
            {/* Bolita verde */}
            <span className="flex h-3 w-3 relative" title="Tiempo real activo">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Historial de entradas y salidas registradas por GPS y Reconocimiento
            Facial
          </p>
        </div>

        {/* GRUPO DE BOTONES (Grid Adaptativo) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:flex gap-2 w-full xl:w-auto">
          <button
            onClick={() => {
              setPermisoUsrId("");
              setPermisoInicio("");
              setPermisoFin("");
              setPermisoMotivo("");
              setModalPermiso(true);
            }}
            className="flex justify-center items-center gap-2 w-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-100 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            <span>🎫</span> Justificar / Permiso
          </button>

          <button
            onClick={handleAuditoriaFaltas}
            className="flex justify-center items-center gap-2 w-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            <span>❌</span> Auditar Faltas
          </button>

          <button
            onClick={() => cargarAsistencias(true)}
            className="flex justify-center items-center gap-2 w-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            <span>🔄</span> Recargar
          </button>

          <button
            onClick={handleExportarExcel}
            className="flex justify-center items-center gap-2 w-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            <span>📊</span> Exportar Reporte
          </button>

          <button
            onClick={handleExportarNomina}
            className="flex justify-center items-center gap-2 w-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            <span>📑</span> Kardex Nómina
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* BARRA DE FILTROS ESTILO INCIDENCIAS */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
        {/* 1. Selector de Hotel (Visible para Superusuario y Administrador) */}
        {["Superusuario", "Administrador"].includes(usuarioActual?.rol) && (
          <select
            value={filtroHotel}
            onChange={(e) => setFiltroHotel(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">🏢 Todos (Hoteles)</option>
            {hoteles.map((h) => (
              <option key={h.id} value={h.id}>
                🏨{h.alias || h.nombre}
              </option>
            ))}
          </select>
        )}
        {/* 2. Buscador Inteligente Omni-Search */}
        <div className="flex-1 min-w-[200px] relative">
          <span className="absolute left-3 top-2 text-slate-400">🔍</span>
          <input
            type="search"
            placeholder="Buscar por empleado o rol (ej. Camarista)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        {/* 3. Selector de Estatus */}
        <select
          value={filtroEstatus}
          onChange={(e) => setFiltroEstatus(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">⏳ Todos (Estatus)</option>
          <option value="A Tiempo">✅ A Tiempo</option>
          <option value="Retardo">⚠️ Retardo</option>
          <option value="Falta">❌ Falta</option>
          <option value="Permiso">🎫 Permiso</option>
          <option value="Día de Descanso">🛌 Descanso</option>
        </select>
        {/* 4. Rangos de Fechas */}
        <div className="flex items-center gap-2 w-full">
          <input
            type="date"
            title="Fecha Desde"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-400"
          />
          <span className="text-slate-400 text-xs font-bold">-</span>
          <input
            type="date"
            title="Fecha Hasta"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto shadow-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <th className="p-4">Fecha</th>
              <th className="p-4">Empleado</th>
              <th className="p-4">Rol</th>
              <th className="p-4">Hora Entrada</th>
              <th className="p-4">Estatus</th>
              <th className="p-4">Hora Salida</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>

          {/* TABLA DE ASISTENCIAS */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {itemsPaginados.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  No se encontraron asistencias con los filtros aplicados.
                </td>
              </tr>
            ) : (
              itemsPaginados.map((a) => {
                const nombreComp = `${a.nombre} ${a.primer_apellido}`.trim();
                return (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {formatearFecha(a.fecha)}
                    </td>
                    <td className="p-4 font-bold text-slate-800 dark:text-white">
                      {nombreComp}
                    </td>
                    <td className="p-4 text-xs text-slate-500">{a.rol}</td>

                    {/* COLUMNA: HORA ENTRADA */}
                    <td className="p-4 font-bold flex flex-col">
                      <span>{formatearHora(a.hora_entrada)}</span>
                      {a.minutos_retardo > 0 && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-500 font-black mt-0.5">
                          ⏱️ TARDE (+{formatoHorasMinutos(a.minutos_retardo)})
                        </span>
                      )}
                    </td>

                    {/* COLUMNA: ESTATUS (Limpio, solo etiquetas) */}
                    <td className="p-4">
                      {a.estatus_entrada === "A Tiempo" && (
                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[11px] font-black uppercase border border-emerald-200 dark:border-emerald-800">
                          ✅ A Tiempo
                        </span>
                      )}
                      {a.estatus_entrada === "Retardo" && (
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-full text-[11px] font-black uppercase border border-amber-200 dark:border-amber-800">
                          ⚠️ Retardo
                        </span>
                      )}
                      {a.estatus_entrada === "Sin Horario" && (
                        <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded-full text-[11px] font-black uppercase border border-slate-200 dark:border-slate-700">
                          ⚪ Sin Horario
                        </span>
                      )}
                      {a.estatus_entrada === "Falta" && (
                        <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full text-[11px] font-black uppercase border border-red-200 dark:border-red-800">
                          ❌ Falta
                        </span>
                      )}
                      {a.estatus_entrada === "Permiso" && (
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-full text-[11px] font-black uppercase border border-blue-200 dark:border-blue-800">
                          🎫 Permiso
                        </span>
                      )}
                      {a.estatus_entrada === "Día de Descanso" && (
                        <span className="inline-flex items-center whitespace-nowrap bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-1 rounded-full text-[11px] font-black uppercase border border-purple-200 dark:border-purple-800">
                          🛌 Descanso
                        </span>
                      )}

                      {a.justificacion && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-bold italic">
                          📝 {a.justificacion}
                        </div>
                      )}
                    </td>

                    {/* COLUMNA: {/* COLUMNA: HORA SALIDA */}
                    <td className="p-4 font-bold flex flex-col">
                      <span>{formatearHora(a.hora_salida)}</span>

                      {/* Total Trabajado */}
                      {a.minutos_trabajados > 0 && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                          ⏱️ Total: {formatoHorasMinutos(a.minutos_trabajados)}
                        </span>
                      )}

                      {/* Etiqueta roja si se retiró antes de tiempo */}
                      {a.estatus_salida === "Salida Anticipada" && (
                        <span className="text-[10px] text-red-500 font-black mt-0.5">
                          🏃‍♂️ ANTICIPADA (-
                          {formatoHorasMinutos(a.minutos_salida_anticipada)})
                        </span>
                      )}

                      {/* Etiqueta azul/dorada si generó horas extras */}
                      {a.horas_extras > 0 && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black mt-0.5">
                          ⭐ +{a.horas_extras}H EXTRA
                        </span>
                      )}
                    </td>

                    {/* MODAL EDITAR ASISTENCIAS */}
                    <td className="p-4">
                      {puedeEditar && (
                        <button
                          onClick={() => abrirModalEdicion(a)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 p-2 rounded-lg transition-colors title='Corregir'"
                        >
                          ✏️
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex justify-between items-center p-4 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40">
          <span className="text-xs font-bold text-slate-500">
            Página {paginaActual} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              disabled={paginaActual === 1}
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Anterior
            </button>
            <button
              disabled={paginaActual === totalPaginas}
              onClick={() =>
                setPaginaActual((p) => Math.min(totalPaginas, p + 1))
              }
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CORRECCIÓN MANUAL */}
      {/* ========================================================= */}
      {modalEdicion && (
        <div
          onClick={() => setModalEdicion(false)}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700"
          >
            <h3 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span>✏️</span> Corrección Manual
            </h3>

            <div className="mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                Registro Seleccionado
              </p>
              <p className="font-black text-slate-800 dark:text-white text-sm">
                {edicionDatos.empleado}
              </p>
              <p className="text-xs text-indigo-500 font-bold">
                Fecha: {edicionDatos.fecha}
              </p>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Hora Entrada
                  </label>
                  <input
                    type="time"
                    value={edicionDatos.hora_entrada}
                    onChange={(e) =>
                      setEdicionDatos({
                        ...edicionDatos,
                        hora_entrada: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Hora Salida
                  </label>
                  <input
                    type="time"
                    value={edicionDatos.hora_salida}
                    onChange={(e) =>
                      setEdicionDatos({
                        ...edicionDatos,
                        hora_salida: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Motivo de Auditoría (Obligatorio)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Falla de CFE, Corrección manual..."
                  value={edicionDatos.motivo}
                  onChange={(e) =>
                    setEdicionDatos({ ...edicionDatos, motivo: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-red-400 focus:border-red-400"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalEdicion(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdicion}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 text-sm"
                >
                  Guardar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REGISTRO DE PERMISOS E INCAPACIDADES */}
      {/* ========================================================= */}
      {modalPermiso && (
        <div
          onClick={() => setModalPermiso(false)}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700"
          >
            <h3 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span>🎫</span> Registrar Permiso o Justificación
            </h3>
            <form onSubmit={handleGuardarPermiso} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Empleado
                </label>
                <select
                  required
                  value={permisoUsrId}
                  onChange={(e) => setPermisoUsrId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Selecciona un colaborador...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.primer_apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    required
                    value={permisoInicio}
                    onChange={(e) => setPermisoInicio(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    required
                    value={permisoFin}
                    onChange={(e) => setPermisoFin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Tipo de Justificación
                </label>
                <select
                  value={permisoTipo}
                  onChange={(e) => setPermisoTipo(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="Vacaciones">🌴 Vacaciones</option>
                  <option value="Incapacidad IMSS">🏥 Incapacidad IMSS</option>
                  <option value="Día Económico">💰 Día Económico</option>
                  <option value="Permiso con Goce">
                    ✅ Permiso con Goce de Sueldo
                  </option>
                  <option value="Permiso Sin Goce">
                    ❌ Permiso Sin Goce de Sueldo
                  </option>
                  {/* OPCIÓN PARA REVERSAR el permiso*/}
                  <option value="Eliminar" className="text-red-500 font-bold">
                    🗑️ Anular / Cancelar Permiso
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Detalles / Folio IMSS (Opcional)
                </label>
                <input
                  type="text"
                  value={permisoMotivo}
                  onChange={(e) => setPermisoMotivo(e.target.value)}
                  placeholder="Ej. Folio 102933..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalPermiso(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPermiso}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 text-sm"
                >
                  {guardandoPermiso ? "Guardando..." : "Aplicar Justificación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
