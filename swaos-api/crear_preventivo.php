<?php
// swaos-api/crear_preventivo.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents("php://input"), true);

// Limpiar y validar datos
$hotel_id = intval($data['hotel_id'] ?? 0);
$titulo = trim($data['titulo'] ?? '');
$ubicacion = trim($data['ubicacion'] ?? 'General');
$categoria = trim($data['categoria'] ?? 'General');
$frecuencia = intval($data['frecuencia_dias'] ?? 0);
$fecha_inicio = trim($data['fecha_inicio'] ?? date('Y-m-d'));
$instrucciones = trim($data['instrucciones'] ?? '');

if ($hotel_id <= 0 || $titulo === '' || $frecuencia <= 0) {
  echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios (Hotel, Título o Frecuencia).']);
  exit;
}

try {
  $stmt = $pdo->prepare("
        INSERT INTO mantenimiento_preventivo 
        (hotel_id, titulo, ubicacion, categoria, frecuencia_dias, proxima_ejecucion, instrucciones) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");

  $stmt->execute([$hotel_id, $titulo, $ubicacion, $categoria, $frecuencia, $fecha_inicio, $instrucciones]);

  echo json_encode(['success' => true]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error de BD: ' . $e->getMessage()]);
}
