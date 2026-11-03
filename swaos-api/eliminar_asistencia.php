<?php
// swaos-api/eliminar_asistencia.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

$data = json_decode(file_get_contents("php://input"), true);
$id = isset($data['id']) ? intval($data['id']) : 0;

if ($id <= 0) {
  echo json_encode(['success' => false, 'message' => 'ID de tarea inválido.']);
  exit;
}

try {
  $stmt = $pdo->prepare("DELETE FROM asistencias WHERE id = ?");
  $stmt->execute([$id]);

  echo json_encode(['success' => true, 'message' => 'Asistencia eliminada.']);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error de BD: ' . $e->getMessage()]);
}
