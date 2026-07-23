<?php
// actualizar_estatus.php
require 'db.php';

// Leer el JSON entrante
$data = json_decode(file_get_contents("php://input"));

if (isset($data->habitacionId) && isset($data->nuevoEstatus)) {
  // Limpiar el prefijo 'h' que usamos en React
  $habitacion_id = str_replace('h', '', $data->habitacionId);
  $nuevo_estatus = $data->nuevoEstatus;

  // Actualizar el estatus operativo
  $stmt = $pdo->prepare("UPDATE habitaciones SET estatus_operativo = ? WHERE id = ?");

  if ($stmt->execute([$nuevo_estatus, $habitacion_id])) {
    echo json_encode(['success' => true, 'message' => 'Estatus actualizado']);
  } else {
    echo json_encode(['success' => false, 'message' => 'Error al actualizar el estatus']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
}
