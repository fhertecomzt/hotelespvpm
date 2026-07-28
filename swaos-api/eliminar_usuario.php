<?php
// eliminar_usuario.php
require 'db.php';

$data = json_decode(file_get_contents("php://input"));

if (isset($data->id)) {
  $id = intval($data->id);

  // Evitamos que se borren a sí mismos o al superusuario 1 por error
  if ($id === 1) {
    echo json_encode(['success' => false, 'message' => '⛔ No se puede eliminar la cuenta principal de Superusuario.']);
    exit;
  }

  $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
  if ($stmt->execute([$id])) {
    echo json_encode(['success' => true, 'message' => 'Empleado eliminado del sistema.']);
  } else {
    echo json_encode(['success' => false, 'message' => 'No se pudo eliminar el registro.']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'ID de usuario no especificado.']);
}
