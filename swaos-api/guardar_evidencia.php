<?php
// guardar_evidencia.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['foto'])) {
  $habitacion_id = isset($_POST['habitacion_id']) ? intval($_POST['habitacion_id']) : 0;
  $usuario_id = isset($_POST['usuario_id']) ? intval($_POST['usuario_id']) : 0;

  // Crear la carpeta 'evidencias' automáticamente si no existe en el servidor
  $directorio = __DIR__ . '/evidencias/';
  if (!file_exists($directorio)) {
    mkdir($directorio, 0777, true);
  }

  // Generar un nombre único y limpio para el archivo WebP
  $nombre_archivo = 'hab_' . $habitacion_id . '_cam_' . $usuario_id . '_' . time() . '.webp';
  $ruta_destino = $directorio . $nombre_archivo;

  // Mover el archivo subido al directorio final
  if (move_uploaded_file($_FILES['foto']['tmp_name'], $ruta_destino)) {
    $peso_kb = round(filesize($ruta_destino) / 1024, 2);

    // Guardar el registro en la base de datos
    $stmt = $pdo->prepare("INSERT INTO evidencias_limpieza (habitacion_id, usuario_id, nombre_archivo, peso_kb) VALUES (?, ?, ?, ?)");
    $stmt->execute([$habitacion_id, $usuario_id, $nombre_archivo, $peso_kb]);

    echo json_encode([
      'success' => true,
      'message' => 'Evidencia guardada correctamente',
      'archivo' => $nombre_archivo,
      'peso_kb' => $peso_kb
    ]);
  } else {
    echo json_encode(['success' => false, 'message' => 'Error al mover el archivo al disco duro']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'No se recibió ninguna imagen o método inválido']);
}
