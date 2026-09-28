<?php
// swaos-api/obtener_preventivos.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');
// --- MATAR EL CACHÉ ---
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

try {
  $hotel_id = isset($_GET['hotel_id']) ? intval($_GET['hotel_id']) : 0;

  // Traemos solo las tareas activas, ordenadas por la fecha de próxima ejecución (lo más urgente primero)
  $query = "SELECT * FROM mantenimiento_preventivo WHERE estatus = 'Activo'";
  $params = [];

  if ($hotel_id > 0) {
    $query .= " AND hotel_id = ?";
    $params[] = $hotel_id;
  }

  $query .= " ORDER BY proxima_ejecucion ASC";

  $stmt = $pdo->prepare($query);
  $stmt->execute($params);
  $tareas = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // Obtener los hoteles disponibles (igual que en tu módulo de incidencias)
    $stmtHoteles = $pdo->query("SELECT id, nombre, alias FROM hoteles WHERE estatus = 'Activo'");
    $hoteles = $stmtHoteles->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'tareas' => $tareas,
    'hoteles_lista' => $hoteles
  ]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error de BD: ' . $e->getMessage()]);
}
