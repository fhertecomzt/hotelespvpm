<?php
// swaos-api/editar_producto.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

try {
  $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

  $id = intval($data['id'] ?? 0);
  $nombre = trim($data['nombre'] ?? '');
  $categoria = trim($data['categoria'] ?? 'Otro');
  $unidad_medida = trim($data['unidad_medida'] ?? 'Pza');
  $stock_minimo = floatval($data['stock_minimo'] ?? 5);
  $codigo_qr = trim($data['codigo_qr'] ?? '');
  $estatus = trim($data['estatus'] ?? 'Activo');

  if ($id <= 0 || empty($nombre)) {
    echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios.']);
    exit;
  }

  $stmt = $pdo->prepare("
        UPDATE inventario_productos 
        SET nombre = ?, categoria = ?, unidad_medida = ?, stock_minimo = ?, codigo_qr = ?, estatus = ?
        WHERE id = ?
    ");

  $exito = $stmt->execute([$nombre, $categoria, $unidad_medida, $stock_minimo, $codigo_qr ?: null, $estatus, $id]);

  if ($exito) {
    echo json_encode(['success' => true, 'message' => 'Producto actualizado correctamente.']);
  } else {
    echo json_encode(['success' => false, 'message' => 'No se pudo actualizar el producto.']);
  }
} catch (Exception $e) {
  if ($e->getCode() == 23000) {
    echo json_encode(['success' => false, 'message' => 'El código QR ya está siendo usado por otro producto.']);
  } else {
    echo json_encode(['success' => false, 'message' => 'Error de BD: ' . $e->getMessage()]);
  }
}
