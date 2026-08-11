<?php
// obtener_habitaciones_qr.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

// --- AGREGAR ESTAS 3 LÍNEAS PARA MATAR EL CACHÉ ---
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
// --------------------------------------------------
require 'db.php';

$hotel_id = isset($_GET['hotel_id']) ? intval($_GET['hotel_id']) : 1;

$stmt = $pdo->prepare("SELECT id, numero, tipo FROM habitaciones WHERE hotel_id = ? ORDER BY numero ASC");
$stmt->execute([$hotel_id]);
$habitaciones = $stmt->fetchAll();

$etiquetas = [];

foreach ($habitaciones as $hab) {
  // El contenido del QR puede ser un JSON ligero o una URL directa al sistema
  $contenido_qr = json_encode([
    'sys' => 'SWAOS',
    'hotel' => $hotel_id,
    'hab_id' => $hab['id'],
    'num' => $hab['numero']
  ]);

  $etiquetas[] = [
    'id' => $hab['id'],
    'numero' => $hab['numero'],
    'tipo' => $hab['tipo'],
    'qr_data' => $contenido_qr
  ];
}

echo json_encode([
  'success' => true,
  'hotel_id' => $hotel_id,
  'etiquetas' => $etiquetas
]);
