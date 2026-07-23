<?php
// reportar_dano.php
require 'db.php';

// Verificamos por $_POST en lugar de json_decode ya que usaremos FormData desde React
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['habitacion_id']) && isset($_POST['usuario_id']) && isset($_POST['tipo_dano'])) {

  $habitacion_id = intval($_POST['habitacion_id']);
  $reportado_por = intval($_POST['usuario_id']);
  $categoria = $_POST['tipo_dano'];
  $descripcion = isset($_POST['descripcion']) ? $_POST['descripcion'] : '';
  $foto_url = '';

  // Si la camarista adjuntó una foto de evidencia del daño
  if (isset($_FILES['foto']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {
    $directorio = __DIR__ . '/evidencias_danos/';
    if (!file_exists($directorio)) {
      mkdir($directorio, 0777, true);
    }

    $nombre_archivo = 'dano_hab_' . $habitacion_id . '_cam_' . $reportado_por . '_' . time() . '.webp';
    $ruta_destino = $directorio . $nombre_archivo;

    if (move_uploaded_file($_FILES['foto']['tmp_name'], $ruta_destino)) {
      $foto_url = $nombre_archivo;
    }
  }

  $stmt = $pdo->prepare("INSERT INTO reportes_danos (habitacion_id, reportado_por, categoria, descripcion, foto_url) VALUES (?, ?, ?, ?, ?)");

  if ($stmt->execute([$habitacion_id, $reportado_por, $categoria, $descripcion, $foto_url])) {
    echo json_encode(['success' => true, 'message' => 'Reporte de daño registrado con éxito']);
  } else {
    echo json_encode(['success' => false, 'message' => 'Error al guardar el reporte']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'Datos incompletos para el reporte']);
}
