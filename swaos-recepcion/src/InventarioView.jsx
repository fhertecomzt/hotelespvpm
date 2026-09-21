import React, { useState, useEffect } from "react";
import { alertaToast } from "./utils";
import ModalNuevoProducto from "./ModalNuevoProducto";
import ModalMovimiento from "./ModalMovimiento";
import ModalEditarProducto from "./ModalEditarProducto";
import { Link } from "react-router-dom";

// Detecta automáticamente si estás en local o en producción
const API_URL = import.meta.env.DEV
  ? "http://localhost/hotelespvpm/sistema/swaos-api"
  : "/sistema/swaos-api";

export default function InventarioView({ usuarioActual }) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Filtros de productos
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");

  // Estados para el filtro Multi-Tenant
  const [filtroHotel, setFiltroHotel] = useState("Todos");
  const [hoteles, setHoteles] = useState([]);

  // Estado inicial dinámico: detecta el ancho de la pantalla al cargar
  const [modoVista, setModoVista] = useState(() => {
    return window.innerWidth >= 1024 ? "tabla" : "tarjetas";
  });

  // Estados de Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 7;

  // Reiniciar a la página 1 cuando el usuario escriba en el buscador o cambie un filtro
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroCategoria, filtroHotel]);

  // Efecto "Responsive" para cuando el usuario gira la tablet o redimensiona la ventana
  useEffect(() => {
    const handleResize = () => {
      // 1024px es el punto de quiebre estándar para tablets horizontales / laptops
      if (window.innerWidth >= 1024) {
        setModoVista("tabla");
      } else {
        setModoVista("tarjetas");
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const token = localStorage.getItem("swaos_token");

  // 1. BARRERA DE SEGURIDAD (Permisos)
  // Ajusta los roles según como los tengas escritos en tu base de datos
  const esAdministrador =
    usuarioActual?.rol === "Administrador" ||
    usuarioActual?.rol === "Superusuario";
  //¿Quién puede gestionar el catálogo completo?
  const esGestorAlmacen =
    esAdministrador || usuarioActual?.rol === "Almacenista";

  const tienePermisoInventario =
    usuarioActual?.permisos?.includes("ver_inventario");
  const accesoPermitido = esAdministrador || tienePermisoInventario;
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [movimientoActivo, setMovimientoActivo] = useState(null);

  // Cargar lista de hoteles para el selector
  useEffect(() => {
    if (esGestorAlmacen) {
      fetch(`${API_URL}/gestion_inventario.php?accion=leer_todo&hotel_id=0`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setHoteles(data.hoteles || []);
        })
        .catch((err) => console.error("Error al cargar hoteles:", err));
    }
  }, [esAdministrador, token]);

  // Función de ayuda para obtener el nombre del hotel en la tarjeta
  const getNombreHotel = (id) => {
    const h = hoteles.find((item) => Number(item.id) === Number(id));
    return h ? h.alias || h.nombre : `Hotel ID ${id}`;
  };

  const cargarInventario = (silencioso = false) => {
    if (!accesoPermitido) return;
    if (!silencioso) setCargando(true);

    fetch(`${API_URL}/obtener_inventario.php`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProductos(data.productos || []);
        } else {
          alertaToast("error", "No se pudo cargar el catálogo.");
        }
        if (!silencioso) setCargando(false);
      })
      .catch((err) => {
        console.error("Error al cargar inventario:", err);
        if (!silencioso) setCargando(false);
      });
  };
  const [productoEditando, setProductoEditando] = useState(null);

  useEffect(() => {
    document.title = "SWAOS | Almacén e Inventario";
    cargarInventario(false);
  }, [accesoPermitido]);

  // Si no tiene permisos, mostramos la pantalla de bloqueo inmediatamente
  if (!accesoPermitido) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 text-center max-w-sm">
          <span className="text-6xl mb-4 block">🚫</span>
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
            Acceso Restringido
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
            Tu nivel de usuario ({usuarioActual?.rol}) no tiene autorización
            para visualizar el almacén.
          </p>
        </div>
      </div>
    );
  }

  // Filtrado inteligente en el cliente
  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_qr && p.codigo_qr.includes(busqueda));
    const coincideCategoria =
      filtroCategoria === "Todos" || p.categoria === filtroCategoria;
    // Filtro por Hotel (Si es 'Todos', pasa directo. Si no, compara IDs)
    const coincideHotel =
      filtroHotel === "Todos" || Number(p.hotel_id) === Number(filtroHotel);

    return coincideBusqueda && coincideCategoria && coincideHotel;
  });

  // Lógica de recortes para Paginación
  const indiceUltimoElemento = paginaActual * elementosPorPagina;
  const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;

  // Esta es la nueva lista que enviaremos a la pantalla (solo 12 elementos)
  const productosPaginados = productosFiltrados.slice(
    indicePrimerElemento,
    indiceUltimoElemento,
  );

  // Calcular el total de páginas necesarias
  const totalPaginas = Math.ceil(
    productosFiltrados.length / elementosPorPagina,
  );

  const categorias = [
    "Todos",
    "Limpieza",
    "Mantenimiento",
    "Amenidades",
    "Blancos",
    "Otro",
  ];

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABECERA Y CONTROLES */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white">
                📦 Control de Almacén
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Gestión de stock, entradas y salidas de material
              </p>
            </div>

            {/* CONTENEDOR DE BOTONES */}
            <div className="flex flex-wrap gap-2 justify-end">
              {/* Botón Nuevo Producto */}
              {esGestorAlmacen && (
                <button
                  onClick={() => setMostrarModalNuevo(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all"
                >
                  + Nuevo Producto
                </button>
              )}

              {/* Botón al Kardex */}
              <Link
                to="/kardex"
                className="bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center"
              >
                📋 Kardex
              </Link>

              {/* Botón de Vistas */}
              <button
                onClick={() =>
                  setModoVista(modoVista === "tabla" ? "tarjetas" : "tabla")
                }
                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                {modoVista === "tabla" ? "📱 Modo Tarjetas" : "📄 Modo Tabla"}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-2 border-t border-slate-100 dark:border-slate-700 pt-4">
            {/* 1. SELECTOR DE HOTELES (Alineado a la izquierda, tamaño fijo en desktop) */}
            {esGestorAlmacen && (
              <select
                value={filtroHotel}
                onChange={(e) => setFiltroHotel(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold cursor-pointer md:w-48"
              >
                <option value="Todos">🏢 Todos los Hoteles</option>
                {hoteles.map((h) => (
                  <option key={h.id} value={h.id}>
                    🏨 {h.alias || h.nombre}
                  </option>
                ))}
              </select>
            )}

            {/* 2. BARRA DE BÚSQUEDA (flex-1 para que tome todo el espacio restante) */}
            <input
              type="search"
              placeholder="🔍 Buscar producto o escanear QR..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            {/* 3. SELECTOR DE CATEGORÍAS (Alineado a la derecha, tamaño fijo en desktop) */}
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold cursor-pointer md:w-48"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* LISTADO DE PRODUCTOS EN GRID RESPONSIVO */}
        {cargando ? (
          <div className="text-center py-20 text-slate-400 font-bold animate-pulse">
            Cargando catálogo de almacén...
          </div>
        ) : (
          <>
            {modoVista === "tabla" ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <th className="p-4">SKU / QR</th>
                        <th className="p-4">Producto</th>
                        <th className="p-4">Categoría</th>
                        <th className="p-4">Hotel</th>
                        <th className="p-4">Stock Actual</th>
                        <th className="p-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {productosPaginados.map((prod) => {
                        const stock = parseFloat(prod.stock_actual);
                        const minimo = parseFloat(prod.stock_minimo);
                        const enPeligro = stock <= minimo;
                        const sinStock = stock <= 0;
                        const esInactivo = prod.estatus === "Inactivo";

                        return (
                          <tr
                            key={prod.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${esInactivo ? "opacity-60 grayscale-[50%]" : ""}`}
                          >
                            <td className="p-4 font-mono text-xs text-slate-400">
                              {prod.codigo_qr
                                ? `🔳 ${prod.codigo_qr}`
                                : `#${prod.id}`}
                            </td>
                            <td className="p-4 font-bold text-slate-800 dark:text-white">
                              <div className="flex items-center gap-2">
                                {prod.nombre}
                                {esInactivo && (
                                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase font-black">
                                    Inactivo
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg">
                                {prod.categoria}
                              </span>
                            </td>
                            {esGestorAlmacen && (
                              <td className="p-4">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50 px-2 py-1 rounded-lg">
                                  {getNombreHotel(prod.hotel_id)}
                                </span>
                              </td>
                            )}
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-lg font-black ${sinStock ? "text-red-500" : enPeligro ? "text-amber-500" : "text-emerald-500"}`}
                                >
                                  {stock}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {prod.unidad_medida}
                                </span>
                                {enPeligro && !sinStock && (
                                  <span
                                    className="text-amber-500 text-xs"
                                    title={`Alerta Mínima: ${minimo}`}
                                  >
                                    ⚠️
                                  </span>
                                )}
                                {sinStock && (
                                  <span
                                    className="text-red-500 text-xs"
                                    title="Agotado"
                                  >
                                    🚨
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() =>
                                  setMovimientoActivo({
                                    producto: prod,
                                    tipo: "Salida",
                                  })
                                }
                                className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                              >
                                ➖ Salida
                              </button>
                              <button
                                onClick={() =>
                                  setMovimientoActivo({
                                    producto: prod,
                                    tipo: "Entrada",
                                  })
                                }
                                className="bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-800/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                              >
                                ➕ Entrada
                              </button>
                              {esGestorAlmacen && (
                                <button
                                  onClick={() => setProductoEditando(prod)}
                                  className="text-slate-400 hover:text-indigo-500 transition-colors px-2 text-base"
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {productosPaginados.map((prod) => {
                  const stock = parseFloat(prod.stock_actual);
                  const minimo = parseFloat(prod.stock_minimo);
                  const enPeligro = stock <= minimo;
                  const sinStock = stock <= 0;
                  const esInactivo = prod.estatus === "Inactivo";

                  return (
                    <div
                      key={prod.id}
                      className={`bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-all ${esInactivo ? "opacity-60 grayscale-[50%]" : ""}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg">
                            {prod.categoria}
                          </span>
                          {esGestorAlmacen && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50 px-2 py-1 rounded-lg">
                              {getNombreHotel(prod.hotel_id)}
                            </span>
                          )}
                          {esInactivo && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-600 px-2 py-1 rounded-lg">
                              Inactivo
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {prod.codigo_qr && (
                            <span
                              className="text-lg"
                              title={`QR: ${prod.codigo_qr}`}
                            >
                              🔳
                            </span>
                          )}
                          {esGestorAlmacen && (
                            <button
                              onClick={() => setProductoEditando(prod)}
                              className="text-slate-400 hover:text-indigo-500 transition-colors"
                              title="Editar producto"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-lg font-black leading-tight mb-4">
                        {prod.nombre}
                      </h3>

                      <div className="mt-auto">
                        <div className="flex items-end justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                              En Stock
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span
                                className={`text-3xl font-black ${sinStock ? "text-red-500" : enPeligro ? "text-amber-500" : "text-emerald-500"}`}
                              >
                                {stock}
                              </span>
                              <span className="text-xs font-bold text-slate-500">
                                {prod.unidad_medida}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                setMovimientoActivo({
                                  producto: prod,
                                  tipo: "Salida",
                                })
                              }
                              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-2 rounded-xl text-sm transition-colors"
                              title="Registrar Salida"
                            >
                              ➖
                            </button>
                            <button
                              onClick={() =>
                                setMovimientoActivo({
                                  producto: prod,
                                  tipo: "Entrada",
                                })
                              }
                              className="bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-800/60 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl text-sm transition-colors border border-indigo-200 dark:border-indigo-700/50"
                              title="Registrar Entrada"
                            >
                              ➕
                            </button>
                          </div>
                        </div>

                        {enPeligro && !sinStock && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-2 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded-lg text-center border border-amber-200 dark:border-amber-800/50">
                            ⚠️ Stock mínimo alcanzado ({minimo})
                          </p>
                        )}
                        {sinStock && (
                          <p className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-2 bg-red-50 dark:bg-red-950/30 p-1.5 rounded-lg text-center border border-red-200 dark:border-red-800/50">
                            🚨 Producto Agotado
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        {/* CONTROLES DE PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6 mb-2">
            <button
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all font-bold text-sm"
            >
              ← Anterior
            </button>

            <span className="text-sm font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl">
              Página {paginaActual} de {totalPaginas}
            </span>

            <button
              onClick={() =>
                setPaginaActual((p) => Math.min(totalPaginas, p + 1))
              }
              disabled={paginaActual === totalPaginas}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all font-bold text-sm"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
      {/* <-- Fin del div max-w-7xl */}

      {/* MODAL NUEVO PRODUCTO */}
      {mostrarModalNuevo && (
        <ModalNuevoProducto
          usuarioActual={usuarioActual}
          onClose={() => setMostrarModalNuevo(false)}
          onSuccess={() => cargarInventario(true)}
        />
      )}
      {/* MODAL ENTRADA/SALIDA DE STOCK */}
      {movimientoActivo && (
        <ModalMovimiento
          producto={movimientoActivo.producto}
          tipo={movimientoActivo.tipo}
          usuarioActual={usuarioActual}
          onClose={() => setMovimientoActivo(null)}
          onSuccess={() => cargarInventario(true)}
        />
      )}
      {/* MODAL EDITAR PRODUCTO */}
      {productoEditando && (
        <ModalEditarProducto
          producto={productoEditando}
          onClose={() => setProductoEditando(null)}
          onSuccess={() => cargarInventario(true)}
        />
      )}
    </div>
  );
}
