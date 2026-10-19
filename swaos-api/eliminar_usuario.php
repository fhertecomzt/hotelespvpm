<?php
// eliminar_usuario.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

$data = json_decode(file_get_contents("php://input"));

if (isset($data->id)) {
  $id = intval($data->id);

  // Evitamos que se borren a sí mismos o al superusuario 1 por error
  if ($id === 1) {
    echo json_encode(['success' => false, 'message' => '⛔ No se puede eliminar la cuenta principal de Superusuario.']);
    exit;
  }

  // -------------------------------------------------------------------
  // 1. BUSCAR Y ELIMINAR LA FOTO FÍSICA ANTES DE BORRAR EL REGISTRO
  // -------------------------------------------------------------------
  $stmtFoto = $pdo->prepare("SELECT foto_perfil_url FROM usuarios WHERE id = ?");
  $stmtFoto->execute([$id]);
  $rutaFoto = $stmtFoto->fetchColumn();

  if ($rutaFoto && file_exists(__DIR__ . '/' . $rutaFoto)) {
    unlink(__DIR__ . '/' . $rutaFoto);
  }
  // -------------------------------------------------------------------

  // 2. BORRAR EL REGISTRO DE LA BASE DE DATOS
  $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
  if ($stmt->execute([$id])) {
    echo json_encode(['success' => true, 'message' => 'Empleado y fotografía eliminados del sistema.']);
  } else {
    echo json_encode(['success' => false, 'message' => 'No se pudo eliminar el registro.']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'ID de usuario no especificado.']);
}
