<?php
// obtener_habitaciones_qr.php
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
