<?php
// swaos-api/registrar_movimiento.php
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

try {
  $inputJSON = file_get_contents('php://input');
  $data = json_decode($inputJSON, true) ?? $_POST;

  $producto_id = intval($data['producto_id'] ?? 0);
  $usuario_id = intval($data['usuario_id'] ?? 0);
  $tipo_movimiento = trim($data['tipo_movimiento'] ?? ''); // 'Entrada', 'Salida' o 'Ajuste'
  $cantidad = floatval($data['cantidad'] ?? 0);
  $motivo = trim($data['motivo'] ?? 'Otro');
  $referencia_id = isset($data['referencia_id']) ? intval($data['referencia_id']) : null;
  $notas = trim($data['notas'] ?? '');

  if ($producto_id <= 0 || $cantidad <= 0 || empty($tipo_movimiento)) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos o cantidad en cero.']);
    exit;
  }

  // Iniciamos la Transacción: O se ejecutan las dos consultas con éxito, o ninguna.
  $pdo->beginTransaction();

  // 1. Obtenemos el stock actual bloqueando la fila (FOR UPDATE) para evitar errores de concurrencia
  $stmt = $pdo->prepare("SELECT stock_actual FROM inventario_productos WHERE id = ? FOR UPDATE");
  $stmt->execute([$producto_id]);
  $producto = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$producto) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'El producto no existe.']);
    exit;
  }

  $stock_anterior = floatval($producto['stock_actual']);
  $stock_nuevo = $stock_anterior;

  // 2. Calculamos el nuevo inventario
  if ($tipo_movimiento === 'Entrada') {
    $stock_nuevo += $cantidad;
  } else if ($tipo_movimiento === 'Salida') {
    if ($stock_anterior < $cantidad) {
      $pdo->rollBack();
      echo json_encode(['success' => false, 'message' => 'Stock insuficiente. Solo hay ' . $stock_anterior . ' disponibles.']);
      exit;
    }
    $stock_nuevo -= $cantidad;
  } else if ($tipo_movimiento === 'Ajuste') {
    // El ajuste reemplaza el stock al valor dictado en una auditoría física
    $stock_nuevo = $cantidad;
  }

  // 3. Actualizamos el catálogo maestro
  $update_stmt = $pdo->prepare("UPDATE inventario_productos SET stock_actual = ? WHERE id = ?");
  $update_stmt->execute([$stock_nuevo, $producto_id]);

  // 4. Escribimos en el Kardex inmutable
  $insert_stmt = $pdo->prepare("
        INSERT INTO inventario_movimientos 
        (producto_id, usuario_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, notas) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
  $insert_stmt->execute([
    $producto_id,
    $usuario_id,
    $tipo_movimiento,
    $cantidad,
    $stock_anterior,
    $stock_nuevo,
    $motivo,
    $referencia_id,
    $notas
  ]);

  // Sellamos los cambios permanentemente
  $pdo->commit();

  echo json_encode([
    'success' => true,
    'message' => 'Movimiento registrado con éxito.',
    'nuevo_stock' => $stock_nuevo
  ]);
} catch (Exception $e) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack(); // Si algo falla, deshacemos todo para evitar bases de datos corruptas
  }
  echo json_encode([
    'success' => false,
    'message' => 'Error crítico al registrar: ' . $e->getMessage()
  ]);
}
