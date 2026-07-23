<?php
// obtener_tablero.php
require 'db.php';

// 1. Obtener todas las zonas activas del hotel
$stmtZonas = $pdo->query("SELECT id, nombre FROM zonas WHERE hotel_id = 1 AND estatus = 'Activo'");
$zonas = $stmtZonas->fetchAll();

// 2. Obtener todas las habitaciones del hotel
$stmtHabitaciones = $pdo->query("SELECT id, numero, estatus_operativo, zona_actual_id FROM habitaciones WHERE hotel_id = 1");
$habitaciones = $stmtHabitaciones->fetchAll();

// 3. Obtener todas las camaristas activas del hotel (Para llenar el menú <select>)
$stmtCamaristas = $pdo->query("SELECT id, nombre FROM usuarios WHERE rol = 'Camarista' AND estatus = 'Activo'");
$camaristas = $stmtCamaristas->fetchAll();

// 4. Obtener las asignaciones del DÍA DE HOY
$stmtAsignaciones = $pdo->query("SELECT zona_id, usuario_id FROM asignaciones_diarias WHERE fecha = CURDATE()");
$asignacionesHoy = $stmtAsignaciones->fetchAll(PDO::FETCH_KEY_PAIR); // Devuelve array: [zona_id => usuario_id]

$response = [
  'columnas' => [],
  'habitaciones' => [],
  'ordenColumnas' => [],
  'camaristas' => $camaristas // Enviamos el catálogo al frontend
];

// Estructurar Zonas (Columnas) con su camarista asignada
foreach ($zonas as $zona) {
  $zonaStrId = 'zona-' . $zona['id'];
  $camaristaAsignadaId = isset($asignacionesHoy[$zona['id']]) ? $asignacionesHoy[$zona['id']] : null;

  $response['columnas'][$zonaStrId] = [
    'id' => $zonaStrId,
    'zona_db_id' => $zona['id'],
    'titulo' => $zona['nombre'],
    'camarista_id' => $camaristaAsignadaId,
    'habitacionIds' => []
  ];
  $response['ordenColumnas'][] = $zonaStrId;
}

// Estructurar Habitaciones
foreach ($habitaciones as $hab) {
  $habStrId = 'h' . $hab['id'];
  $response['habitaciones'][$habStrId] = [
    'id' => $habStrId,
    'numero' => $hab['numero'],
    'estatus' => $hab['estatus_operativo']
  ];

  if ($hab['zona_actual_id']) {
    $zonaAsignada = 'zona-' . $hab['zona_actual_id'];
    if (isset($response['columnas'][$zonaAsignada])) {
      $response['columnas'][$zonaAsignada]['habitacionIds'][] = $habStrId;
    }
  }
}

header('Content-Type: application/json');
echo json_encode($response);
