<?php
// obtener_dashboard.php
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
require 'db.php';

try {
  $hotel_id = isset($_GET['hotel_id']) ? intval($_GET['hotel_id']) : 0; // 0 = Todos (SaaS)
  $rol = isset($_GET['rol']) ? $_GET['rol'] : '';

  // 1. Obtener lista de hoteles para los selectores dinámicos del frontend
  $hoteles_lista = $pdo->query("SELECT id, nombre, COALESCE(alias, nombre) as alias FROM hoteles WHERE COALESCE(estatus, 'Activo') != 'Inactivo' ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

  // 2. Filtro de Hotel según selección
  $filtroHotelHab = $hotel_id > 0 ? "WHERE hotel_id = $hotel_id" : "";
  $filtroHotelDano = $hotel_id > 0 ? "WHERE h.hotel_id = $hotel_id" : "";

  // 3. Conteo general de habitaciones por estatus
  $sqlEstatus = "SELECT estatus_operativo, COUNT(*) as total FROM habitaciones $filtroHotelHab GROUP BY estatus_operativo";
  $stmtEst = $pdo->query($sqlEstatus);
  $estatus_raw = $stmtEst->fetchAll(PDO::FETCH_KEY_PAIR);

  $total_habitaciones = array_sum($estatus_raw);
  $limpias = $estatus_raw['Limpia'] ?? 0;
  $en_proceso = $estatus_raw['En Proceso'] ?? 0;
  $ocupadas = $estatus_raw['Ocupada'] ?? 0;
  $solicitud_aseo = $estatus_raw['Solicitud Aseo'] ?? 0;
  $salida_confirmada = $estatus_raw['Salida Confirmada'] ?? 0;
  $dnd = $estatus_raw['DND'] ?? 0;

  $porcentaje_limpieza = $total_habitaciones > 0 ? round(($limpias / $total_habitaciones) * 100) : 0;

  // 4. Conteo de daños por estatus
  $sqlDanos = "SELECT r.estatus, COUNT(*) as total FROM reportes_danos r JOIN habitaciones h ON r.habitacion_id = h.id $filtroHotelDano GROUP BY r.estatus";
  $stmtDan = $pdo->query($sqlDanos);
  $danos_raw = $stmtDan->fetchAll(PDO::FETCH_KEY_PAIR);

  $danos_pendientes = $danos_raw['Pendiente'] ?? 0;
  $danos_reparacion = $danos_raw['En Reparación'] ?? 0;

  // 5. Avance por Zona
  $sqlZonas = "
        SELECT z.nombre as zona, 
               COUNT(h.id) as total,
               SUM(CASE WHEN h.estatus_operativo = 'Limpia' THEN 1 ELSE 0 END) as limpias
        FROM zonas z
        LEFT JOIN habitaciones h ON z.id = h.zona_actual_id
        " . ($hotel_id > 0 ? "WHERE z.hotel_id = $hotel_id" : "") . "
        GROUP BY z.id
    ";
  $stmtZon = $pdo->query($sqlZonas);
  $zonas_progreso = $stmtZon->fetchAll(PDO::FETCH_ASSOC);

  // 6. EXCLUSIVO SUPERUSUARIO: Comparativa Multi-Tenant SaaS
  $saas_comparativa = [];
  if ($rol === 'Superusuario') {
    $sqlSaaS = "
            SELECT hot.id, hot.nombre, COALESCE(hot.alias, hot.nombre) as alias,
                   COUNT(h.id) as total_habs,
                   SUM(CASE WHEN h.estatus_operativo = 'Limpia' THEN 1 ELSE 0 END) as habs_limpias,
                   (SELECT COUNT(*) FROM usuarios u WHERE u.hotel_base_id = hot.id AND COALESCE(u.estatus, 'Activo') != 'Inactivo') as total_personal
            FROM hoteles hot
            LEFT JOIN habitaciones h ON hot.id = h.hotel_id
            WHERE COALESCE(hot.estatus, 'Activo') != 'Inactivo'
            GROUP BY hot.id
        ";
    $stmtSaaS = $pdo->query($sqlSaaS);
    $saas_comparativa = $stmtSaaS->fetchAll(PDO::FETCH_ASSOC);
  }

  echo json_encode([
    'success' => true,
    'hoteles_lista' => $hoteles_lista,
    'kpis' => [
      'total_habitaciones' => $total_habitaciones,
      'limpias' => $limpias,
      'en_proceso' => $en_proceso,
      'pendientes_atencion' => $ocupadas + $solicitud_aseo + $salida_confirmada,
      'dnd' => $dnd,
      'porcentaje_limpieza' => $porcentaje_limpieza,
      'danos_activos' => $danos_pendientes + $danos_reparacion
    ],
    'distribucion' => $estatus_raw,
    'zonas_progreso' => $zonas_progreso,
    'saas_comparativa' => $saas_comparativa
  ]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
