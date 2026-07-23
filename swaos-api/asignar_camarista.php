<?php
// asignar_camarista.php
require 'db.php';

$data = json_decode(file_get_contents("php://input"));

if (isset($data->zonaId) && isset($data->usuarioId)) {
  $zona_id = str_replace('zona-', '', $data->zonaId);
  $usuario_id = $data->usuarioId;
  $admin_id = 4; // Harcodeamos temporalmente el ID de Sofia (Recepción) que hace el cambio

  // Usamos INSERT ... ON DUPLICATE KEY UPDATE para que si ya había alguien asignada hoy a esa zona, la reemplace fácilmente
  $sql = "INSERT INTO asignaciones_diarias (fecha, zona_id, usuario_id, asignado_por) 
            VALUES (CURDATE(), ?, ?, ?) 
            ON DUPLICATE KEY UPDATE usuario_id = VALUES(usuario_id), asignado_por = VALUES(asignado_por)";

  $stmt = $pdo->prepare($sql);

  if ($stmt->execute([$zona_id, $usuario_id, $admin_id])) {
    echo json_encode(['success' => true, 'message' => 'Camarista asignada a la zona']);
  } else {
    echo json_encode(['success' => false, 'message' => 'Error en base de datos']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
}
