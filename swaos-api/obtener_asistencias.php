<?php
// obtener_asistencias.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

$hotel_id = intval($_GET['hotel_id'] ?? 0);
$rol_solicitante = $_GET['rol_solicitante'] ?? '';

try {
  // Cruzamos las asistencias con la tabla usuarios para obtener sus nombres
  $sql = "SELECT a.*, u.nombre, u.primer_apellido, u.segundo_apellido, u.rol 
            FROM asistencias a 
            JOIN usuarios u ON a.usuario_id = u.id ";

  $params = [];

  // Si no es Superusuario NI Administrador, forzamos a que solo vea las asistencias de su propio hotel
  if ($rol_solicitante !== 'Superusuario' && $rol_solicitante !== 'Administrador' && $hotel_id > 0) {
    $sql .= " WHERE a.hotel_id = ? ";
    $params[] = $hotel_id;
  }
  // Ordenamos para ver primero los registros más recientes (hoy, luego ayer...)
  $sql .= "ORDER BY a.fecha DESC, a.hora_entrada DESC";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $asistencias = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'asistencias' => $asistencias
  ]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $e->getMessage()]);
}
