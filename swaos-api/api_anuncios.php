<?php
// api_anuncios.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

$accion = $_GET['accion'] ?? 'leer';

try {
  if ($accion === 'leer') {
    // Leer todos los anuncios
    $stmt = $pdo->query("SELECT * FROM anuncios_rh ORDER BY id DESC");
    $anuncios = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'anuncios' => $anuncios]);
  } elseif ($accion === 'guardar') {
    // Recibir datos en JSON
    $data = json_decode(file_get_contents('php://input'), true);

    $id = intval($data['id'] ?? 0);
    $tipo_alcance = $data['tipo_alcance'] ?? 'Hotel';
    $hotel_id = intval($data['hotel_id'] ?? 0);
    $usuario_id = intval($data['usuario_id'] ?? 0);
    $mensaje = trim($data['mensaje'] ?? '');
    $fecha_inicio = $data['fecha_inicio'] ?? date('Y-m-d');
    $fecha_fin = $data['fecha_fin'] ?? date('Y-m-d');
    $estatus = $data['estatus'] ?? 'Activo';

    if (empty($mensaje)) {
      echo json_encode(['success' => false, 'message' => 'El mensaje no puede estar vacío.']);
      exit;
    }

    if ($id > 0) {
      // Actualizar
      $stmt = $pdo->prepare("UPDATE anuncios_rh SET tipo_alcance=?, hotel_id=?, usuario_id=?, mensaje=?, fecha_inicio=?, fecha_fin=?, estatus=? WHERE id=?");
      $stmt->execute([$tipo_alcance, $hotel_id, $usuario_id, $mensaje, $fecha_inicio, $fecha_fin, $estatus, $id]);
      echo json_encode(['success' => true, 'message' => 'Aviso actualizado correctamente.']);
    } else {
      // Insertar nuevo
      $stmt = $pdo->prepare("INSERT INTO anuncios_rh (tipo_alcance, hotel_id, usuario_id, mensaje, fecha_inicio, fecha_fin, estatus) VALUES (?, ?, ?, ?, ?, ?, ?)");
      $stmt->execute([$tipo_alcance, $hotel_id, $usuario_id, $mensaje, $fecha_inicio, $fecha_fin, $estatus]);
      echo json_encode(['success' => true, 'message' => 'Aviso creado y publicado con éxito.']);
    }
  } elseif ($accion === 'eliminar') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);

    $stmt = $pdo->prepare("DELETE FROM anuncios_rh WHERE id=?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true, 'message' => 'Aviso eliminado permanentemente.']);
  } else {
    echo json_encode(['success' => false, 'message' => 'Acción no válida.']);
  }
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $e->getMessage()]);
}
