<?php
// swaos-api/editar_preventivo.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents("php://input"), true);

// Limpiar y validar datos
$id = intval($data['id'] ?? 0);
$hotel_id = intval($data['hotel_id'] ?? 0);
$titulo = trim($data['titulo'] ?? '');
$categoria = trim($data['categoria'] ?? 'General');
$ubicacion = trim($data['ubicacion'] ?? 'General');
$frecuencia = intval($data['frecuencia_dias'] ?? 0);
$proxima_ejecucion = trim($data['proxima_ejecucion'] ?? date('Y-m-d'));
$instrucciones = trim($data['instrucciones'] ?? '');

if ($id <= 0 || $hotel_id <= 0 || $titulo === '' || $frecuencia <= 0) {
  echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios.']);
  exit;
}

try {
  $stmt = $pdo->prepare("
        UPDATE mantenimiento_preventivo 
        SET hotel_id = ?, titulo = ?, categoria = ?, ubicacion = ?, frecuencia_dias = ?, proxima_ejecucion = ?, instrucciones = ?
        WHERE id = ?
    ");

  $stmt->execute([$hotel_id, $titulo, $categoria, $ubicacion, $frecuencia, $proxima_ejecucion, $instrucciones, $id]);

  echo json_encode(['success' => true]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error de BD: ' . $e->getMessage()]);
}
