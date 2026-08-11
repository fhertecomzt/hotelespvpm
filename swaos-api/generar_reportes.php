<?php
// generar_reportes.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php'; 
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

$tipo = $_GET['tipo'] ?? 'productividad';
$rango = $_GET['rango'] ?? 'hoy';
$hotel_id = intval($_GET['hotel_id'] ?? 1);

// 1. Filtro de Fechas adaptado a tu columna 'fecha'
$condicionFecha = "";
switch ($rango) {
  case 'hoy':
    $condicionFecha = "h.fecha = CURDATE()";
    break;
  case 'ayer':
    $condicionFecha = "h.fecha = CURDATE() - INTERVAL 1 DAY";
    break;
  case 'semana':
    $condicionFecha = "YEARWEEK(h.fecha, 1) = YEARWEEK(CURDATE(), 1)";
    break;
  case 'mes':
    $condicionFecha = "MONTH(h.fecha) = MONTH(CURDATE()) AND YEAR(h.fecha) = YEAR(CURDATE())";
    break;
  default:
    $condicionFecha = "h.fecha = CURDATE()";
}

try {
  $datos = [];

  if ($tipo === 'productividad') {
    // 2. Consulta SQL usando tu tabla bitacora_limpieza y duracion_minutos 
    $sql = "
            SELECT 
                DATE_FORMAT(h.fecha, '%d/%m/%Y') AS 'Fecha',
                CONCAT(u.nombre, ' ', IFNULL(u.primer_apellido, '')) AS 'Camarista',
                z.nombre AS 'Zona',
                hab.numero AS 'Habitación',
                TIME_FORMAT(h.hora_inicio, '%H:%i') AS 'Hora Inicio',
                TIME_FORMAT(h.hora_fin, '%H:%i') AS 'Hora Fin',
                h.duracion_minutos AS 'Minutos Totales',
                30 AS 'SLA (Minutos Esperados)',
                (h.duracion_minutos - 30) AS 'Desviación (+/-)'
            FROM bitacora_limpieza h
            LEFT JOIN habitaciones hab ON h.habitacion_id = hab.id
            LEFT JOIN zonas z ON h.zona_id_historico = z.id
            LEFT JOIN usuarios u ON h.usuario_id = u.id
            WHERE hab.hotel_id = ? AND h.hora_fin IS NOT NULL AND $condicionFecha
            ORDER BY h.fecha DESC, h.hora_inicio DESC
        ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$hotel_id]);
    $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);
  } elseif ($tipo === 'mantenimiento') {
    // Adaptamos la variable de fecha para que coincida con la columna fecha_reporte de esta tabla
    $condicionMto = str_replace("h.fecha", "DATE(r.fecha_reporte)", $condicionFecha);

    $sql = "
            SELECT 
                DATE_FORMAT(r.fecha_reporte, '%d/%m/%Y %H:%i') AS 'Fecha Reporte',
                hab.numero AS 'Habitación',
                r.categoria AS 'Categoría de Daño',
                r.descripcion AS 'Descripción del Problema',
                CONCAT(u_rep.nombre, ' ', IFNULL(u_rep.primer_apellido, '')) AS 'Reportado Por',
                r.estatus AS 'Estatus',
                DATE_FORMAT(r.fecha_resolucion, '%d/%m/%Y %H:%i') AS 'Fecha Resolución',
                CONCAT(u_res.nombre, ' ', IFNULL(u_res.primer_apellido, '')) AS 'Resuelto Por',
                r.notas_resolucion AS 'Notas de Resolución',
                TIMESTAMPDIFF(MINUTE, r.fecha_reporte, r.fecha_resolucion) AS 'Tiempo Respuesta (Min)'
            FROM reportes_danos r
            LEFT JOIN habitaciones hab ON r.habitacion_id = hab.id
            LEFT JOIN usuarios u_rep ON r.reportado_por = u_rep.id
            LEFT JOIN usuarios u_res ON r.resuelto_por = u_res.id
            WHERE hab.hotel_id = ? AND $condicionMto
            ORDER BY r.fecha_reporte DESC
        ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$hotel_id]);
    $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);
  } elseif ($tipo === 'cierre') {
    // El Cierre de Turno es una fotografía en tiempo real del inventario
    $sql = "
            SELECT 
                hab.numero AS 'Habitación',
                hab.tipo AS 'Categoría',
                IFNULL(z.nombre, 'Sin Asignar') AS 'Zona Operativa',
                hab.estatus_operativo AS 'Estatus Actual'
            FROM habitaciones hab
            LEFT JOIN zonas z ON hab.zona_actual_id = z.id
            WHERE hab.hotel_id = ?
            ORDER BY z.nombre ASC, hab.numero ASC
        ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$hotel_id]);
    $datos = $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  echo json_encode(['success' => true, 'data' => $datos]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $e->getMessage()]);
}
