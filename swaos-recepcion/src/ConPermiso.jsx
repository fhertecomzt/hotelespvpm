import React from "react";

export default function ConPermiso({ usuario, requerido, children }) {
  // 1. Si no hay usuario logueado, protegemos la vista y no renderizamos nada
  if (!usuario) return null;

  // 2. Regla de Oro (Opcional pero recomendada): Los altos mandos siempre tienen acceso total
  if (usuario.rol === "Superusuario" || usuario.rol === "Administrador") {
    return <>{children}</>;
  }

  // 3. Verificamos si el arreglo de permisos existe y si incluye el permiso solicitado
  // (Asumimos que el backend envía los permisos así: usuario.permisos = ["crear_empleado", "asignar_zonas"])
  const tienePermiso = usuario.permisos && usuario.permisos.includes(requerido);

  // 4. Concedemos o denegamos el acceso visual
  return tienePermiso ? <>{children}</> : null;
}
