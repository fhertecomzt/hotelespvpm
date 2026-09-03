<?php
// swaos-api/crear_producto.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

try {
  $inputJSON = file_get_contents('php://input');
  $data = json_decode($inputJSON, true) ?? $_POST;

  $nombre = trim($data['nombre'] ?? '');
  $categoria = trim($data['categoria'] ?? 'Otro');
  $unidad_medida = trim($data['unidad_medida'] ?? 'Pza');
  $stock_inicial = floatval($data['stock_inicial'] ?? 0);
  $stock_minimo = floatval($data['stock_minimo'] ?? 5);
  $codigo_qr = trim($data['codigo_qr'] ?? '');
  $hotel_id = intval($data['hotel_id'] ?? 1);
  $usuario_id = intval($data['usuario_id'] ?? 1);

  if (empty($nombre)) {
    echo json_encode(['success' => false, 'message' => 'El nombre del producto es obligatorio.']);
    exit;
  }

  $pdo->beginTransaction();

  // 1. Guardar en el catálogo
  $stmt = $pdo->prepare("
        INSERT INTO inventario_productos (hotel_id, codigo_qr, nombre, categoria, unidad_medida, stock_actual, stock_minimo) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
  $stmt->execute([$hotel_id, $codigo_qr ?: null, $nombre, $categoria, $unidad_medida, $stock_inicial, $stock_minimo]);

  $producto_id = $pdo->lastInsertId();

  // 2. Si nace con stock, registrar el movimiento inicial en el Kardex
  if ($stock_inicial > 0) {
    $mov_stmt = $pdo->prepare("
            INSERT INTO inventario_movimientos (producto_id, usuario_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, notas) 
            VALUES (?, ?, 'Ajuste', ?, 0, ?, 'Ajuste Inicial', 'Registro inicial en sistema')
        ");
    $mov_stmt->execute([$producto_id, $usuario_id, $stock_inicial, $stock_inicial]);
  }

  $pdo->commit();

  echo json_encode([
    'success' => true,
    'message' => 'Producto registrado correctamente.'
  ]);
} catch (Exception $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }
  // Si el error es por un QR duplicado
  if ($e->getCode() == 23000) {
    echo json_encode(['success' => false, 'message' => 'Este código QR ya está asignado a otro producto en este hotel.']);
  } else {
    echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()]);
  }
}
