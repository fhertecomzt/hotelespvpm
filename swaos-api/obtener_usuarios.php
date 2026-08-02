<?php
// obtener_usuarios.php
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');

// --- AGREGAR ESTAS 3 LÍNEAS PARA MATAR EL CACHÉ ---
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
// --------------------------------------------------
require 'db.php';

try {
  try {
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN estatus VARCHAR(20) DEFAULT 'Activo'");
  } catch (Exception $e) {
  }

  $hotel_id = isset($_GET['hotel_id']) ? intval($_GET['hotel_id']) : 0;
  $rol_solicitante = $_GET['rol_solicitante'] ?? '';

  // Si el hotel_id es 0 o quien consulta es Superusuario/Administrador en el Panel, enviamos todo el catálogo
  $filtro = ($hotel_id <= 0 || $rol_solicitante === 'Superusuario' || $rol_solicitante === 'Administrador') ? "" : "WHERE hotel_base_id = $hotel_id";

  $stmt = $pdo->query("SELECT id, nombre, primer_apellido, segundo_apellido, email, rol, hotel_base_id, COALESCE(estatus, 'Activo') as estatus FROM usuarios $filtro ORDER BY id ASC");
  $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

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
