<?php
// swaos-api/asignar_camarista.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

try {
  $inputJSON = file_get_contents('php://input');
  $data = json_decode($inputJSON, true) ?? $_POST;

  // Obtener ID de Zona
  $raw_zona = $data['zona_id'] ?? ($data['zonaId'] ?? ($data['id_zona'] ?? ($data['id'] ?? 0)));
  $zona_id = intval(preg_replace('/[^0-9]/', '', (string)$raw_zona));

  // Obtener ID de Camarista
  $raw_cam = $data['camarista_id'] ?? ($data['camaristaId'] ?? ($data['usuario_id'] ?? ($data['usuarioId'] ?? '')));
  $camarista_id = (!empty($raw_cam) && intval($raw_cam) > 0) ? intval($raw_cam) : null;

  if ($zona_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID de zona inválido']);
    exit;
  }

  // 1. Guardar permanentemente en la tabla principal 'zonas'
  $stmt = $pdo->prepare("UPDATE zonas SET camarista_id = ? WHERE id = ?");
  $stmt->execute([$camarista_id, $zona_id]);

  // 2. Sincronizar las habitaciones que tengan este 'zona_actual_id' para que todo coincida
  try {
    $stmtHab = $pdo->prepare("UPDATE habitaciones SET camarista_id = ? WHERE zona_actual_id = ?");
    $stmtHab->execute([$camarista_id, $zona_id]);
  } catch (Exception $eHab) {
  }

  echo json_encode([
    'success' => true,
    'message' => 'Camarista asignada y sincronizada con el tablero.',
    'zona_actualizada' => $zona_id,
    'camarista_asignada' => $camarista_id
  ]);
} catch (Exception $e) {
  echo json_encode([
    'success' => false,
    'message' => 'Error SQL: ' . $e->getMessage()
  ]);
}
