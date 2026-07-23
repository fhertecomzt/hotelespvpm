<?php
// obtener_tareas_camarista.php
require 'db.php';

$usuario_id = isset($_GET['usuario_id']) ? intval($_GET['usuario_id']) : 0;

if ($usuario_id <= 0) {
  echo json_encode(['error' => 'ID de usuario inválido']);
  exit();
}

// 1. Buscar qué zona tiene asignada esta camarista HOY
$stmtZona = $pdo->prepare("
    SELECT z.id, z.nombre 
    FROM asignaciones_diarias ad
    JOIN zonas z ON ad.zona_id = z.id
    WHERE ad.usuario_id = ? AND ad.fecha = CURDATE()
");
$stmtZona->execute([$usuario_id]);
$zonaAsignada = $stmtZona->fetch();

if (!$zonaAsignada) {
  echo json_encode([
    'sin_asignacion' => true,
    'mensaje' => 'No tienes ninguna zona asignada para el día de hoy. Consulta a Recepción.'
  ]);
  exit();
}

// 2. Obtener las habitaciones de esa zona, ordenadas por prioridad operativa
// Prioridad: Salidas Confirmadas (1), Solicitud Aseo (2), En Proceso (3), Ocupadas (4), Limpias al final (5)
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
$habitaciones = $stmtHab->fetchAll();

echo json_encode([
  'sin_asignacion' => false,
  'zona' => $zonaAsignada,
  'habitaciones' => $habitaciones
]);
