<?php
// swaos-api/eliminar_preventivo.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents("php://input"), true);
$id = isset($data['id']) ? intval($data['id']) : 0;

if ($id <= 0) {
  echo json_encode(['success' => false, 'message' => 'ID de tarea inválido.']);
  exit;
}

try {
  $stmt = $pdo->prepare("DELETE FROM mantenimiento_preventivo WHERE id = ?");
  $stmt->execute([$id]);

  echo json_encode(['success' => true]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error de BD: ' . $e->getMessage()]);
}
