<?php
// swaos-api/obtener_kardex.php
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
  // Recibimos filtros opcionales por GET
  $hotel_id = isset($_GET['hotel_id']) ? intval($_GET['hotel_id']) : 0;
  $producto_id = isset($_GET['producto_id']) ? intval($_GET['producto_id']) : 0;

  // Consulta SQL cruzando 3 tablas: Movimientos + Productos + Usuarios
  $query = "
        SELECT 
            m.id,
            m.tipo_movimiento,
            m.cantidad,
            m.stock_anterior,
            m.stock_nuevo,
            m.motivo,
            m.notas,
            m.fecha_movimiento,
            p.nombre AS producto_nombre,
            p.codigo_qr,
            p.hotel_id,
            u.nombre AS usuario_nombre
        FROM inventario_movimientos m
        INNER JOIN inventario_productos p ON m.producto_id = p.id
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        WHERE 1=1
    ";

  $params = [];

  // Si el usuario filtra por un hotel en específico
  if ($hotel_id > 0) {
    $query .= " AND p.hotel_id = ?";
    $params[] = $hotel_id;
  }

  // Si queremos ver el historial de un solo producto
  if ($producto_id > 0) {
    $query .= " AND m.producto_id = ?";
    $params[] = $producto_id;
  }

  // Ordenamos del más reciente al más antiguo, con un límite de los últimos 500 para no saturar
  $query .= " ORDER BY m.fecha_movimiento DESC LIMIT 500";

  $stmt = $pdo->prepare($query);
  $stmt->execute($params);
  $movimientos = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'movimientos' => $movimientos
  ]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error de BD: ' . $e->getMessage()]);
}
