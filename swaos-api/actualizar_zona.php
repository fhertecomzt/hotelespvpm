<?php
// actualizar_zona.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

// Leer el JSON entrante
$data = json_decode(file_get_contents("php://input"));

if (isset($data->habitacionId) && isset($data->nuevaZonaId)) {
  // Limpiar los prefijos 'h' y 'zona-' que usamos en React
  $habitacion_id = str_replace('h', '', $data->habitacionId);
  $zona_id = str_replace('zona-', '', $data->nuevaZonaId);

  $stmt = $pdo->prepare("UPDATE habitaciones SET zona_actual_id = ? WHERE id = ?");

  if ($stmt->execute([$zona_id, $habitacion_id])) {
    echo json_encode(['success' => true, 'message' => 'Zona actualizada']);
  } else {
    echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
}
