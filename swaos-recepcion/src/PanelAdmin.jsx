import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import GeneradorQR from "./GeneradorQR";

const API_URL = "/sistema/swaos-api";

const ROLES_COLORES = {
  Superusuario:
    "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-500/40",
  Administrador:
    "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-500/40",
  "Ama de Llaves":
    "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-500/40",
  Recepcion:
    "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-500/40",
  Mantenimiento:
    "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-500/40",
  Camarista:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-500/40",
};

// ==========================================
// MOTOR DE ALERTAS FLOTANTES SAAS (TOASTS)
// ==========================================
const alertaToast = (icon, title) => {
  const esOscuro = document.documentElement.classList.contains("dark");
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: icon,
    title: title,
    showConfirmButton: false,
    timer: 2800,
    timerProgressBar: true,
    background: esOscuro ? "#1e293b" : "#ffffff",
    color: esOscuro ? "#f8fafc" : "#0f172a",
    customClass: {
      popup:
        "border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl",
    },
  });
};

export default function PanelAdmin({ usuarioActual }) {
  const [pestaña, setPestaña] = useState("personal");

  // ESTADOS DE LISTADOS DATOS
  const [usuarios, setUsuarios] = useState([]);
  const [hoteles, setHoteles] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [habitaciones, setHabitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  // ESTADOS DE PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 8;

  const getItemsPaginados = (lista) => {
    const indiceUltimoItem = paginaActual * itemsPorPagina;
    const indicePrimerItem = indiceUltimoItem - itemsPorPagina;
    return lista.slice(indicePrimerItem, indiceUltimoItem);
  };
  const totalPaginas = (lista) => Math.ceil(lista.length / itemsPorPagina);

  // ESTADOS PARA MODALES FORMULARIOS
  const [modalFormulario, setModalFormulario] = useState(false);
  const [modalHotel, setModalHotel] = useState(false);
  const [modalTipo, setModalTipo] = useState(false);
  const [modalZona, setModalZona] = useState(false);
  const [modalHab, setModalHab] = useState(false);

  // CAMPOS FORMULARIO EMPLEADO
  // 1. Creamos la referencia para el primer input (autofocus)
  const primerInputRef = useRef(null);

  const [edicionId, setEdicionId] = useState(0);
  const [nombre, setNombre] = useState("");
  const [primerApellido, setPrimerApellido] = useState("");
  const [segundoApellido, setSegundoApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("Camarista");
  const [hotelIdEmp, setHotelIdEmp] = useState(usuarioActual?.hotel_id || 1);
  const [estatusEmp, setEstatusEmp] = useState("Activo");

  // CAMPOS FORMULARIO HOTEL CON ALIAS
  const [hotelEditId, setHotelEditId] = useState(0);
  const [nombreHotel, setNombreHotel] = useState("");
  const [aliasHotel, setAliasHotel] = useState("");
  const [direccionHotel, setDireccionHotel] = useState("");
  const [estatusHotel, setEstatusHotel] = useState("Activo");

  // CAMPOS FORMULARIO TIPO DE HABITACIÓN
  const [tipoEditId, setTipoEditId] = useState(0);
  const [nombreTipo, setNombreTipo] = useState("");
  const [hotelIdTipo, setHotelIdTipo] = useState(usuarioActual?.hotel_id || 1);
  const [estatusTipo, setEstatusTipo] = useState("Activo");

  // CAMPOS FORMULARIO ZONA
  const [zonaEditId, setZonaEditId] = useState(0);
  const [nombreZona, setNombreZona] = useState("");
  const [hotelIdZona, setHotelIdZona] = useState(usuarioActual?.hotel_id || 1);
  const [estatusZona, setEstatusZona] = useState("Activo");

  // CAMPOS FORMULARIO HABITACIÓN
  const [habEditId, setHabEditId] = useState(0);
  const [numHab, setNumHab] = useState("");
  const [tipoHab, setTipoHab] = useState("Estándar");
  const [hotelIdHab, setHotelIdHab] = useState(usuarioActual?.hotel_id || 1);
  const [zonaIdHab, setZonaIdHab] = useState(0);

  const [guardando, setGuardando] = useState(false);
  const esSuperusuario = usuarioActual?.rol === "Superusuario";

  // TRADUCTOR DINÁMICO DE ID A ALIAS DEL HOTEL
  const getHotelLabel = (id) => {
    const h = hoteles.find((item) => Number(item.id) === Number(id));
    if (!h) return `🏨 Hotel ID ${id}`;
    return `🏨 ${h.alias || h.nombre}`;
  };

  // ==========================================
  // 2. AQUÍ DEBE ESTAR LA FUNCIÓN RENDERPAGINACION
  // ==========================================
  const RenderPaginacion = ({ lista }) => {
    const paginas = totalPaginas(lista);
    if (paginas <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 gap-4">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          Mostrando del {paginaActual * itemsPorPagina - itemsPorPagina + 1} al{" "}
          {Math.min(paginaActual * itemsPorPagina, lista.length)} de{" "}
          {lista.length} registros
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Anterior
          </button>

          <div className="flex items-center gap-1 hidden sm:flex">
            {[...Array(paginas)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPaginaActual(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                  paginaActual === i + 1
                    ? "bg-indigo-600 text-white shadow-md border-indigo-600"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPaginaActual((p) => Math.min(paginas, p + 1))}
            disabled={paginaActual === paginas}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  };

  const cargarTodo = () => {
    setCargando(true);
    // Pasamos hotel_id = 0 para que tanto Superusuario como Administrador carguen todo el ecosistema y no queden tablas vacías
    const urlUser = `${API_URL}/obtener_usuarios.php?hotel_id=0&rol_solicitante=${usuarioActual?.rol || ""}`;
    const urlInv = `${API_URL}/gestion_inventario.php?accion=leer_todo&hotel_id=0`;

    Promise.all([
      fetch(urlUser).then((r) => r.json()),
      fetch(urlInv).then((r) => r.json()),
    ])
      .then(([dataUser, dataInv]) => {
        if (dataUser.success) setUsuarios(dataUser.usuarios || []);
        if (dataInv.success) {
          setHoteles(dataInv.hoteles || []);
          setTipos(dataInv.tipos_habitacion || []);
          setZonas(dataInv.zonas || []);
          setHabitaciones(dataInv.habitaciones || []);
        }
        setCargando(false);
      })
      .catch((err) => {
        console.error("Error al cargar plataforma:", err);
        setCargando(false);
      });
  };

  // 1. EFECTO PARA CARGAR DATOS
  useEffect(() => {
    cargarTodo();
  }, [usuarioActual]);

  // 2. EFECTO EXCLUSIVO PARA EL AUTOFOCUS DE CUALQUIER MODAL
  useEffect(() => {
    // Usamos el operador || (OR) para verificar si AL MENOS UNO está abierto
    if (modalFormulario || modalTipo || modalZona || modalHab || modalHotel) {
      setTimeout(() => {
        primerInputRef.current?.focus();
      }, 100);
    }
  }, [modalFormulario, modalTipo, modalZona, modalHab, modalHotel]);

  // ==========================================
  // FUNCIONES PARA PERSONAL
  // ==========================================
  const abrirModalNuevoEmp = () => {
    setEdicionId(0);
    setNombre("");
    setPrimerApellido("");
    setSegundoApellido("");
    setEmail("");
    setPassword("");
    setRol("Camarista");
    setHotelIdEmp(usuarioActual?.hotel_id || 1);
    setEstatusEmp("Activo");
    setModalFormulario(true);
  };

  const abrirModalEditarEmp = (u) => {
    setEdicionId(u.id);
    setNombre(u.nombre);
    setPrimerApellido(u.primer_apellido);
    setSegundoApellido(u.segundo_apellido || "");
    setEmail(u.email);
    setPassword("");
    setRol(u.rol);
    setHotelIdEmp(u.hotel_base_id);
    setEstatusEmp(u.estatus || "Activo");
    setModalFormulario(true);
  };

  const handleGuardarUsuario = (e) => {
    e.preventDefault();
    setGuardando(true);
    fetch(`${API_URL}/guardar_usuario.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: edicionId,
        nombre,
        primer_apellido: primerApellido,
        segundo_apellido: segundoApellido,
        email,
        password,
        rol,
        hotel_base_id: hotelIdEmp,
        estatus: estatusEmp,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        setGuardando(false);
        if (res.success) {
          alertaToast("success", res.message);
          setModalFormulario(false);
          cargarTodo();
        } else {
          alertaToast("error", res.message);
        }
      })
      .catch(() => {
        setGuardando(false);
        alertaToast("error", "Error de red al conectar con el servidor");
      });
  };

  // ==========================================
  // FUNCIONES PARA HOTELES (MODO SAAS CON ALIAS)
  // ==========================================
  const handleGuardarHotel = (e) => {
    e.preventDefault();
    setGuardando(true);
    fetch(`${API_URL}/gestion_inventario.php?accion=guardar_hotel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: hotelEditId,
        nombre: nombreHotel,
        alias: aliasHotel,
        direccion: direccionHotel,
        estatus: estatusHotel,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        setGuardando(false);
        if (res.success) {
          alertaToast("success", res.message);
          setModalHotel(false);
          cargarTodo();
        } else {
          alertaToast("error", res.message);
        }
      });
  };

  // ==========================================
  // FUNCIONES PARA TIPOS DE HABITACIÓN
  // ==========================================
  const handleGuardarTipo = (e) => {
    e.preventDefault();
    setGuardando(true);
    fetch(`${API_URL}/gestion_inventario.php?accion=guardar_tipo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: tipoEditId,
        hotel_id: hotelIdTipo,
        nombre: nombreTipo,
        estatus: estatusTipo,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        setGuardando(false);
        if (res.success) {
          alertaToast("success", res.message);
          setModalTipo(false);
          cargarTodo();
        } else {
          alertaToast("error", res.message);
        }
      });
  };

  // ==========================================
  // FUNCIONES PARA ZONAS
  // ==========================================
  const handleGuardarZona = (e) => {
    e.preventDefault();
    setGuardando(true);
    fetch(`${API_URL}/gestion_inventario.php?accion=guardar_zona`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: zonaEditId,
        hotel_id: hotelIdZona,
        nombre: nombreZona,
        estatus: estatusZona,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        setGuardando(false);
        if (res.success) {
          alertaToast("success", res.message);
          setModalZona(false);
          cargarTodo();
        } else {
          alertaToast("error", res.message);
        }
      });
  };

  // ==========================================
  // FUNCIONES PARA HABITACIONES
  // ==========================================
  const abrirModalNuevaHab = () => {
    setHabEditId(0);
    setNumHab("");
    const tiposDisponibles = tipos.filter(
      (t) =>
        t.estatus !== "Inactivo" &&
        Number(t.hotel_id) === Number(usuarioActual?.hotel_id || 1),
    );
    setTipoHab(tiposDisponibles[0]?.nombre || "Estándar");
    setHotelIdHab(usuarioActual?.hotel_id || 1);
    setZonaIdHab(zonas[0]?.id || 0);
    setModalHab(true);
  };

  const abrirModalEditarHab = (h) => {
    setHabEditId(h.id);
    setNumHab(h.numero);
    setTipoHab(h.tipo || "Estándar");
    setHotelIdHab(h.hotel_id);
    setZonaIdHab(h.zona_actual_id || 0);
    setModalHab(true);
  };

  const handleGuardarHabitacion = (e) => {
    e.preventDefault();
    setGuardando(true);
    fetch(`${API_URL}/gestion_inventario.php?accion=guardar_habitacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: habEditId,
        hotel_id: hotelIdHab,
        zona_id: zonaIdHab,
        numero: numHab,
        tipo: tipoHab,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        setGuardando(false);
        if (res.success) {
          alertaToast("success", res.message);
          setModalHab(false);
          cargarTodo();
        } else {
          alertaToast("error", res.message);
        }
      });
  };

  // ==========================================
  // ELIMINADOR GENÉRICO CON MODAL SWEETALERT2
  // ==========================================
  const handleEliminarItem = async (id, tabla, nombreItem) => {
    const esOscuro = document.documentElement.classList.contains("dark");

    const confirmacion = await Swal.fire({
      title: "¿Eliminar permanentemente?",
      text: `Estás a punto de borrar "${nombreItem}" Una vez eliminado, no podrás recuperar su información.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sí, eliminar ahora",
      cancelButtonText: "Cancelar",
      background: esOscuro ? "#1e293b" : "#ffffff",
      color: esOscuro ? "#f8fafc" : "#0f172a",
      customClass: {
        popup:
          "border border-slate-200 dark:border-slate-700 shadow-2xl rounded-3xl",
        confirmButton: "rounded-xl font-bold px-5 py-2.5 text-sm",
        cancelButton: "rounded-xl font-bold px-5 py-2.5 text-sm",
      },
    });

    if (!confirmacion.isConfirmed) return;

    const url =
      tabla === "usuarios"
        ? `${API_URL}/eliminar_usuario.php`
        : `${API_URL}/gestion_inventario.php?accion=eliminar_item`;
    const body = tabla === "usuarios" ? { id } : { id, tabla };

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          alertaToast("success", res.message);
          cargarTodo();
        } else {
          alertaToast("error", res.message);
        }
      })
      .catch(() => alertaToast("error", "Fallo de conexión al eliminar"));
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen font-sans p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* CABECERA Y SELECTOR DE PESTAÑAS */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <span>⚙️</span> Administración de Plataforma{" "}
              {esSuperusuario && (
                <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Modo SaaS
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
              Control total de personal, creación de hoteles, zonas operativas y
              cuartos
            </p>
          </div>

          <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex flex-wrap gap-1 w-full md:w-auto transition-colors">
            <button
              onClick={() => {
                setPestaña("personal");
                setPaginaActual(1);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${pestaña === "personal" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"}`}
            >
              <span>👥</span> Personal y Roles
            </button>
            {esSuperusuario && (
              <button
                onClick={() => {
                  setPestaña("hoteles");
                  setPaginaActual(1);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${pestaña === "hoteles" ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"}`}
              >
                <span>🏢</span> Hoteles (SaaS)
              </button>
            )}
            <button
              onClick={() => {
                setPestaña("tipos");
                setPaginaActual(1);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${pestaña === "tipos" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"}`}
            >
              <span>🛏️</span> Tipos de Hab.
            </button>
            <button
              onClick={() => {
                setPestaña("zonas");
                setPaginaActual(1);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${pestaña === "zonas" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"}`}
            >
              <span>🗺️</span> Zonas
            </button>
            <button
              onClick={() => {
                setPestaña("habitaciones");
                setPaginaActual(1);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${pestaña === "habitaciones" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"}`}
            >
              <span>🚪</span> Habitaciones
            </button>
            <button
              onClick={() => {
                setPestaña("qr");
                setPaginaActual(1);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${pestaña === "qr" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"}`}
            >
              <span>🖨️</span> Códigos QR
            </button>
          </div>
        </div>

        {cargando && (
          <div className="text-center py-20 text-slate-400 font-bold animate-pulse">
            Sincronizando inventarios de base de datos...
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 1: PERSONAL Y ROLES */}
        {/* ========================================================= */}
        {!cargando && pestaña === "personal" && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-white text-lg">
                  Directorio de Empleados
                </h2>
                <p className="text-xs text-slate-400">
                  Total registrados: {usuarios.length} cuentas
                </p>
              </div>
              <button
                onClick={abrirModalNuevoEmp}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-sm transition-colors flex items-center gap-2"
              >
                <span>➕</span> Nuevo Empleado
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4">ID</th>
                    <th className="p-4">Nombre Completo</th>
                    <th className="p-4">Correo</th>
                    <th className="p-4">Rol / Depto</th>
                    <th className="p-4">Estatus</th>
                    <th className="p-4">Hotel</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {getItemsPaginados(usuarios).map((u) => {
                    const colorBadge =
                      ROLES_COLORES[u.rol] ||
                      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
                    const nombreComp =
                      `${u.nombre} ${u.primer_apellido} ${u.segundo_apellido || ""}`.trim();
                    const esTu = u.id === usuarioActual?.id;
                    const esActivo = u.estatus !== "Inactivo";
                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${!esActivo ? "opacity-50 grayscale-[50%]" : ""}`}
                      >
                        <td className="p-4 font-mono text-xs text-slate-400">
                          #{u.id}
                        </td>
                        <td className="p-4 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <span>{nombreComp}</span>{" "}
                          {esTu && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                              Tú
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-normal">
                          {u.email}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border ${colorBadge}`}
                          >
                            {u.rol}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase border ${esActivo ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"}`}
                          >
                            ● {u.estatus || "Activo"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/40 text-xs">
                            {getHotelLabel(u.hotel_base_id)}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => abrirModalEditarEmp(u)}
                            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            ✏️ Editar
                          </button>
                          {!esTu && u.id !== 1 && (
                            <button
                              onClick={() =>
                                handleEliminarItem(u.id, "usuarios", nombreComp)
                              }
                              className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 px-3 py-1.5 rounded-lg text-xs font-bold"
                            >
                              🗑️ Borrar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <RenderPaginacion lista={usuarios} />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 2: HOTELES (MODO SAAS CON ALIAS) */}
        {/* ========================================================= */}
        {!cargando && pestaña === "hoteles" && esSuperusuario && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex justify-between items-center bg-purple-50/50 dark:bg-purple-900/20">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-white text-lg">
                  Catálogo de Hoteles y Tenants
                </h2>
                <p className="text-xs text-slate-400">
                  Total conectados: {hoteles.length} propiedades
                </p>
              </div>
              <button
                onClick={() => {
                  setHotelEditId(0);
                  setNombreHotel("");
                  setAliasHotel("");
                  setDireccionHotel("");
                  setEstatusHotel("Activo");
                  setModalHotel(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-sm transition-colors flex items-center gap-2"
              >
                <span>🏢</span> Registrar Nuevo Hotel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4">ID</th>
                    <th className="p-4">Nombre de la Propiedad</th>
                    <th className="p-4">Alias / Siglas</th>
                    <th className="p-4">Ubicación / Dirección</th>
                    <th className="p-4">Estatus</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {getItemsPaginados(hoteles).map((h) => {
                    const esActivo = h.estatus !== "Inactivo";
                    return (
                      <tr
                        key={h.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${!esActivo ? "opacity-50 grayscale-[50%]" : ""}`}
                      >
                        <td className="p-4 font-mono text-xs text-purple-600 dark:text-purple-400 font-bold">
                          #TENANT-{h.id}
                        </td>
                        <td className="p-4 font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                          <span>🏨</span> {h.nombre}
                        </td>
                        <td className="p-4">
                          <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-black px-2.5 py-1 rounded-md text-xs border border-purple-300 dark:border-purple-800">
                            {h.alias || "N/A"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 font-normal">
                          {h.direccion || "Sin dirección"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${esActivo ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"}`}
                          >
                            ● {h.estatus || "Activo"}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setHotelEditId(h.id);
                              setNombreHotel(h.nombre);
                              setAliasHotel(h.alias || "");
                              setDireccionHotel(h.direccion);
                              setEstatusHotel(h.estatus || "Activo");
                              setModalHotel(true);
                            }}
                            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            ✏️ Editar
                          </button>
                          {h.id > 2 && (
                            <button
                              onClick={() =>
                                handleEliminarItem(h.id, "hoteles", h.nombre)
                              }
                              className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 px-3 py-1.5 rounded-lg text-xs font-bold"
                            >
                              🗑️ Borrar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <RenderPaginacion lista={hoteles} />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 3: TIPOS DE HABITACIÓN */}
        {/* ========================================================= */}
        {!cargando && pestaña === "tipos" && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-white text-lg">
                  Catálogo de Tipos y Categorías de Habitación
                </h2>
                <p className="text-xs text-slate-400">
                  Las categorías disponibles al dar de alta nuevos cuartos
                </p>
              </div>
              <button
                onClick={() => {
                  setTipoEditId(0);
                  setNombreTipo("");
                  setHotelIdTipo(usuarioActual?.hotel_id || 1);
                  setEstatusTipo("Activo");
                  setModalTipo(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-sm transition-colors flex items-center gap-2"
              >
                <span>➕</span> Crear categoría
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4">ID</th>
                    <th className="p-4">Hotel Perteneciente</th>
                    <th className="p-4">Nombre de la Categoría</th>
                    <th className="p-4">Estatus</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {getItemsPaginados(tipos).map((t) => {
                    const esActivo = t.estatus !== "Inactivo";
                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${!esActivo ? "opacity-50 grayscale-[50%]" : ""}`}
                      >
                        <td className="p-4 font-mono text-xs text-slate-400">
                          #{t.id}
                        </td>
                        <td className="p-4">
                          <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/40 text-xs">
                            {getHotelLabel(t.hotel_id)}
                          </span>
                        </td>
                        <td className="p-4 font-black text-slate-800 dark:text-white text-base">
                          🛏️ {t.nombre}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase border ${esActivo ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"}`}
                          >
                            ● {t.estatus || "Activo"}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setTipoEditId(t.id);
                              setNombreTipo(t.nombre);
                              setHotelIdTipo(t.hotel_id);
                              setEstatusTipo(t.estatus || "Activo");
                              setModalTipo(true);
                            }}
                            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() =>
                              handleEliminarItem(
                                t.id,
                                "tipos_habitacion",
                                t.nombre,
                              )
                            }
                            className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            🗑️ Borrar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <RenderPaginacion lista={tipos} />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 4: ZONAS OPERATIVAS */}
        {/* ========================================================= */}
        {!cargando && pestaña === "zonas" && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-white text-lg">
                  Zonas de Asignación en Tablero
                </h2>
                <p className="text-xs text-slate-400">
                  Las columnas donde el Ama de Llaves distribuye el aseo
                </p>
              </div>
              <button
                onClick={() => {
                  setZonaEditId(0);
                  setNombreZona("");
                  setHotelIdZona(usuarioActual?.hotel_id || 1);
                  setEstatusZona("Activo");
                  setModalZona(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-sm transition-colors flex items-center gap-2"
              >
                <span>➕</span> Crear Nueva Zona
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4">ID</th>
                    <th className="p-4">Hotel Perteneciente</th>
                    <th className="p-4">Nombre de Zona (Columna)</th>
                    <th className="p-4">Estatus</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {getItemsPaginados(zonas).map((z) => {
                    const esActivo = z.estatus !== "Inactivo";
                    return (
                      <tr
                        key={z.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${!esActivo ? "opacity-50 grayscale-[50%]" : ""}`}
                      >
                        <td className="p-4 font-mono text-xs text-slate-400">
                          #{z.id}
                        </td>
                        <td className="p-4">
                          <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/40 text-xs">
                            {getHotelLabel(z.hotel_id)}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800 dark:text-white text-base">
                          🗺️ {z.nombre}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase border ${esActivo ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"}`}
                          >
                            ● {z.estatus || "Activo"}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setZonaEditId(z.id);
                              setNombreZona(z.nombre);
                              setHotelIdZona(z.hotel_id);
                              setEstatusZona(z.estatus || "Activo");
                              setModalZona(true);
                            }}
                            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() =>
                              handleEliminarItem(z.id, "zonas", z.nombre)
                            }
                            className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 px-3 py-1.5 rounded-lg text-xs font-bold"
                          >
                            🗑️ Borrar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <RenderPaginacion lista={zonas} />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 5: HABITACIONES */}
        {/* ========================================================= */}
        {!cargando && pestaña === "habitaciones" && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-white text-lg">
                  Catálogo de Habitaciones
                </h2>
                <p className="text-xs text-slate-400">
                  Inventario físico: {habitaciones.length} cuartos configurados
                </p>
              </div>
              <button
                onClick={abrirModalNuevaHab}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-sm transition-colors flex items-center gap-2"
              >
                <span>➕</span> Registrar Habitación
              </button>
            </div>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10">
                  <tr className="text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4">ID</th>
                    <th className="p-4">Hotel</th>
                    <th className="p-4">Número</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Zona Asignada</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {getItemsPaginados(habitaciones).map((h) => (
                    <tr
                      key={h.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="p-4 font-mono text-xs text-slate-400">
                        #{h.id}
                      </td>
                      <td className="p-4">
                        <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/40 text-xs">
                          {getHotelLabel(h.hotel_id)}
                        </span>
                      </td>
                      <td className="p-4 font-black text-slate-800 dark:text-white text-lg">
                        🚪 Hab. {h.numero}
                      </td>
                      <td className="p-4">
                        <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-md text-xs font-bold border border-indigo-200 dark:border-indigo-800/40">
                          {h.tipo}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">
                        {h.zona_nombre || (
                          <span className="text-amber-500 italic">
                            Sin Zona
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => abrirModalEditarHab(h)}
                          className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() =>
                            handleEliminarItem(
                              h.id,
                              "habitaciones",
                              `Hab. ${h.numero}`,
                            )
                          }
                          className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          🗑️ Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <RenderPaginacion lista={habitaciones} />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* PESTAÑA 6: GENERADOR DE ETIQUETAS QR */}
      {/* ========================================================= */}
      {!cargando && pestaña === "qr" && (
        <div className="animate-fadeIn">
          <GeneradorQR />
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: FORMULARIO EMPLEADO */}
      {/* ========================================================= */}
      {modalFormulario && (
        <div
          onClick={() => setModalFormulario(false)}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span>👤</span>{" "}
              {edicionId > 0
                ? `Editar Empleado #${edicionId}`
                : "Registrar Nuevo Empleado"}
            </h3>
            <form onSubmit={handleGuardarUsuario} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Nombre(s)
                  </label>
                  <input
                    type="text"
                    required
                    ref={primerInputRef}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. María"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Primer Apellido
                  </label>
                  <input
                    type="text"
                    required
                    value={primerApellido}
                    onChange={(e) => setPrimerApellido(e.target.value)}
                    placeholder="Ej. Hernández"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Segundo Apellido
                  </label>
                  <input
                    type="text"
                    value={segundoApellido}
                    onChange={(e) => setSegundoApellido(e.target.value)}
                    placeholder="Ej. Díaz"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="empleado@hotel.com"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    autoComplete="nope"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    {edicionId > 0
                      ? "Nueva Contraseña (Opcional)"
                      : "Contraseña"}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      edicionId > 0 ? "Vacío = no cambia" : "••••••••"
                    }
                    required={edicionId === 0}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Rol Operativo
                  </label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                  >
                    <option value="Camarista">🧹 Camarista</option>
                    <option value="Recepcion">🖥️ Recepcion</option>
                    <option value="Mantenimiento">🛠️ Mantenimiento</option>
                    <option value="Ama de Llaves">🔑 Ama de Llaves</option>
                    <option value="Administrador">👔 Administrador</option>
                    {esSuperusuario && (
                      <option value="Superusuario">🚀 Superusuario</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Estatus Cuenta
                  </label>
                  <select
                    value={estatusEmp}
                    onChange={(e) => setEstatusEmp(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                  >
                    <option value="Activo">● Activo (Tiene Acceso)</option>
                    <option value="Inactivo">🚫 Inactivo (Suspendido)</option>
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Hotel Asignado
                </label>
                <select
                  value={hotelIdEmp}
                  onChange={(e) => setHotelIdEmp(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                >
                  {hoteles.map((h) => (
                    <option key={h.id} value={h.id}>
                      🏨 {h.alias || h.nombre} (ID {h.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
                <button
                  type="button"
                  onClick={() => setModalFormulario(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors disabled:opacity-50 text-sm"
                >
                  {guardando
                    ? "Guardando..."
                    : edicionId > 0
                      ? "Actualizar"
                      : "Crear Empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: FORMULARIO HOTEL CON ALIAS */}
      {/* ========================================================= */}
      {modalHotel && (
        <div
          onClick={() => setModalHotel(false)}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span>🏢</span>{" "}
              {hotelEditId > 0
                ? `Editar Hotel #${hotelEditId}`
                : "Aprovisionar Nuevo Hotel"}
            </h3>
            <form onSubmit={handleGuardarHotel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nombre Completo de la Propiedad
                </label>
                <input
                  type="text"
                  required
                  ref={primerInputRef}
                  value={nombreHotel}
                  onChange={(e) => setNombreHotel(e.target.value)}
                  placeholder="Ej. Hotel Playa Victoria"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Alias / Siglas Cortas (Ej. Hotel PV)
                </label>
                <input
                  type="text"
                  required
                  value={aliasHotel}
                  onChange={(e) => setAliasHotel(e.target.value)}
                  placeholder="Ej. Hotel PV, Hotel PM..."
                  className="w-full bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 rounded-lg p-2.5 text-sm font-black focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block mt-1 font-semibold">
                  Esta sigla se mostrará en todas las tablas del sistema para
                  ahorrar espacio.
                </span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Dirección / Ciudad
                </label>
                <input
                  type="text"
                  value={direccionHotel}
                  onChange={(e) => setDireccionHotel(e.target.value)}
                  placeholder="Ej. Av. Marítima 400, Mazatlán"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Estatus del Tenant
                </label>
                <select
                  value={estatusHotel}
                  onChange={(e) => setEstatusHotel(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-purple-400 focus:outline-none cursor-pointer"
                >
                  <option value="Activo">● Activo (Operando)</option>
                  <option value="Inactivo">🚫 Inactivo (Suspendido)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
                <button
                  type="button"
                  onClick={() => setModalHotel(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 text-sm"
                >
                  {guardando ? "Aprovisionando..." : "Guardar Hotel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: FORMULARIO TIPOS DE HABITACIÓN */}
      {/* ========================================================= */}
      {modalTipo && (
        <div
          onClick={() => setModalTipo(false)}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span>🛏️</span>{" "}
              {tipoEditId > 0
                ? `Editar Categoría #${tipoEditId}`
                : "Crear Categoría"}
            </h3>
            <form onSubmit={handleGuardarTipo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nombre del Tipo / Categoría
                </label>
                <input
                  type="text"
                  required
                  ref={primerInputRef}
                  value={nombreTipo}
                  onChange={(e) => setNombreTipo(e.target.value)}
                  placeholder="Ej. Villa Frente al Mar, Penthouse..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Hotel Perteneciente
                  </label>
                  <select
                    value={hotelIdTipo}
                    onChange={(e) => setHotelIdTipo(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                  >
                    {hoteles.map((h) => (
                      <option key={h.id} value={h.id}>
                        🏨 {h.alias || h.nombre} (ID {h.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Estatus
                  </label>
                  <select
                    value={estatusTipo}
                    onChange={(e) => setEstatusTipo(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                  >
                    <option value="Activo">● Activo</option>
                    <option value="Inactivo">🚫 Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
                <button
                  type="button"
                  onClick={() => setModalTipo(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 text-sm"
                >
                  {guardando ? "Guardando..." : "Guardar Categoría"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: FORMULARIO ZONAS */}
      {/* ========================================================= */}
      {modalZona && (
        <div
          onClick={() => setModalZona(false)}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span>🗺️</span>{" "}
              {zonaEditId > 0
                ? `Editar Zona #${zonaEditId}`
                : "Crear Zona Operativa"}
            </h3>
            <form onSubmit={handleGuardarZona} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nombre de la Zona (Columna en Tablero)
                </label>
                <input
                  type="text"
                  required
                  ref={primerInputRef}
                  value={nombreZona}
                  onChange={(e) => setNombreZona(e.target.value)}
                  placeholder="Ej. Zona 6 (Piso 14)"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Hotel Perteneciente
                  </label>
                  <select
                    value={hotelIdZona}
                    onChange={(e) => setHotelIdZona(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                  >
                    {hoteles.map((h) => (
                      <option key={h.id} value={h.id}>
                        🏨 {h.alias || h.nombre} (ID {h.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Estatus Zona
                  </label>
                  <select
                    value={estatusZona}
                    onChange={(e) => setEstatusZona(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                  >
                    <option value="Activo">● Activo</option>
                    <option value="Inactivo">🚫 Inactiva</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
                <button
                  type="button"
                  onClick={() => setModalZona(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 text-sm"
                >
                  {guardando ? "Guardando..." : "Guardar Zona"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: FORMULARIO HABITACIÓN */}
      {/* ========================================================= */}
      {modalHab && (
        <div
          onClick={() => setModalHab(false)}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center gap-2">
              <span>🚪</span>{" "}
              {habEditId > 0
                ? `Editar Habitación #${habEditId}`
                : "Registrar Habitación"}
            </h3>
            <form onSubmit={handleGuardarHabitacion} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Número de Cuarto
                  </label>
                  <input
                    type="text"
                    required
                    ref={primerInputRef}
                    value={numHab}
                    onChange={(e) => setNumHab(e.target.value)}
                    placeholder="Ej. 1401"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Tipo / Categoría
                  </label>
                  <select
                    value={tipoHab}
                    onChange={(e) => setTipoHab(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                  >
                    {tipos
                      .filter(
                        (t) =>
                          t.estatus !== "Inactivo" &&
                          Number(t.hotel_id) === Number(hotelIdHab),
                      )
                      .map((t, idx) => (
                        <option key={idx} value={t.nombre}>
                          {t.nombre}
                        </option>
                      ))}
                    {tipos.length === 0 && (
                      <option value="Estándar">Estándar (Defecto)</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Hotel Perteneciente
                </label>
                <select
                  value={hotelIdHab}
                  onChange={(e) => {
                    setHotelIdHab(Number(e.target.value));
                    setZonaIdHab(0);
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                >
                  {hoteles.map((h) => (
                    <option key={h.id} value={h.id}>
                      🏨 {h.alias || h.nombre} (ID {h.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Zona Asignada por Defecto
                </label>
                <select
                  value={zonaIdHab}
                  onChange={(e) => setZonaIdHab(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
                >
                  <option value={0}>-- Sin Asignar (General) --</option>
                  {zonas
                    .filter((z) => Number(z.hotel_id) === Number(hotelIdHab))
                    .map((z) => (
                      <option key={z.id} value={z.id}>
                        🗺️ {z.nombre}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-6">
                <button
                  type="button"
                  onClick={() => setModalHab(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 text-sm"
                >
                  {guardando ? "Guardando..." : "Guardar Habitación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
