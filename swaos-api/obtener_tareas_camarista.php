<?php
// swaos-api/obtener_tareas_camarista.php
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
require 'db.php';

$usuario_id = isset($_GET['usuario_id']) ? intval($_GET['usuario_id']) : 0;

if ($usuario_id <= 0) {
  echo json_encode(['error' => 'ID de usuario inválido']);
  exit();
}

// =========================================================================
// 1. BUSCAR LA ZONA DIRECTO EN LA TABLA 'zonas' (DONDE ASIGNA EL AMA DE LLAVES)
// =========================================================================
$stmtZona = $pdo->prepare("
    SELECT id, nombre 
    FROM zonas 
    WHERE camarista_id = ? AND COALESCE(estatus, 'Activo') != 'Inactivo'
    ORDER BY id ASC
    LIMIT 1
");
$stmtZona->execute([$usuario_id]);
$zonaAsignada = $stmtZona->fetch(PDO::FETCH_ASSOC);

// Respaldo por si tu sistema sigue utilizando 'asignaciones_diarias' en algunos casos
if (!$zonaAsignada) {
  try {
    $stmtRespaldo = $pdo->prepare("
            SELECT z.id, z.nombre 
            FROM asignaciones_diarias ad
            JOIN zonas z ON ad.zona_id = z.id
            WHERE ad.usuario_id = ? AND ad.fecha = CURDATE()
            LIMIT 1
        ");
    $stmtRespaldo->execute([$usuario_id]);
    $zonaAsignada = $stmtRespaldo->fetch(PDO::FETCH_ASSOC);
  } catch (Exception $e) {
  }
}

if (!$zonaAsignada) {
  echo json_encode([
    'sin_asignacion' => true,
    'mensaje' => 'No tienes ninguna zona asignada para el día de hoy. Consulta a Recepción o Ama de Llaves.'
  ]);
  exit();
}

// =========================================================================
// 2. OBTENER HABITACIONES USANDO EL ID REAL DE LA ZONA (zona_actual_id)
// =========================================================================
$sqlHabitaciones = "
    SELECT id, numero, tipo, estatus_operativo 
    FROM habitaciones 
    WHERE zona_actual_id = ?
    ORDER BY 
        CASE estatus_operativo
            WHEN 'Salida Confirmada' THEN 1
            WHEN 'Solicitud Aseo' THEN 2
            WHEN 'En Proceso' THEN 3
            WHEN 'Ocupada' THEN 4
            WHEN 'DND' THEN 5
            WHEN 'Limpia' THEN 6
            ELSE 7
        END,
        numero ASC
";

$stmtHab = $pdo->prepare($sqlHabitaciones);
$stmtHab->execute([$zonaAsignada['id']]);
$habitaciones = $stmtHab->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
  'sin_asignacion' => false,
  'zona' => $zonaAsignada,
  'habitaciones' => $habitaciones
]);
