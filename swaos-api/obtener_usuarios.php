<?php
// obtener_usuarios.php
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
  try {
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN estatus VARCHAR(20) DEFAULT 'Activo'");
  } catch (Exception $e) {
  }

  $hotel_id = isset($_GET['hotel_id']) ? intval($_GET['hotel_id']) : 0;
  $rol_solicitante = $_GET['rol_solicitante'] ?? '';

  $filtro = ($hotel_id <= 0 || $rol_solicitante === 'Superusuario' || $rol_solicitante === 'Administrador') ? "" : "WHERE hotel_base_id = $hotel_id";

  // Select para obtener
  $stmt = $pdo->query("SELECT id, nombre, primer_apellido, segundo_apellido, email, rol, hotel_base_id, hora_entrada, hora_salida, COALESCE(estatus, 'Activo') as estatus, permisos, dias_descanso, exento_asistencia, fecha_nacimiento, fecha_ingreso FROM usuarios $filtro ORDER BY id ASC");
  $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

  foreach ($usuarios as &$user) {
    if (!empty($user['permisos'])) {
      $user['permisos'] = json_decode($user['permisos'], true);
      if (!is_array($user['permisos'])) $user['permisos'] = [];
    } else {
      $user['permisos'] = [];
    }
  }

  echo json_encode([
    'success' => true,
    'usuarios' => $usuarios
  ]);
} catch (Exception $e) {
  echo json_encode([
    'success' => false,
    'message' => $e->getMessage(),
    'usuarios' => []
  ]);
}
