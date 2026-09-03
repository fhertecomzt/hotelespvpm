<?php
// swaos-api/obtener_inventario.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php'; // Tu candado de seguridad
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

// Permite filtrar por hotel si el administrador quiere ver solo uno
$hotel_id = isset($_GET['hotel_id']) ? intval($_GET['hotel_id']) : 0;

try {
  $sql = "SELECT id, hotel_id, codigo_qr, nombre, categoria, unidad_medida, stock_actual, stock_minimo, estatus FROM inventario_productos";
  $params = [];

  if ($hotel_id > 0) {
    $sql .= " WHERE hotel_id = ?";
    $params[] = $hotel_id;
  }

  // Ordenamos alfabéticamente para facilitar la vista en pantalla
  $sql .= " ORDER BY nombre ASC";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'productos' => $productos
  ]);
} catch (Exception $e) {
  echo json_encode([
    'success' => false,
    'message' => 'Error de base de datos: ' . $e->getMessage()
  ]);
}
