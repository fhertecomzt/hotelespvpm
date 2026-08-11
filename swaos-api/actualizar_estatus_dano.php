<?php
// swaos-api/actualizar_estatus_dano.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php'; // <-- ESTO REEMPLAZA TODO EL BLOQUE GIGANTE
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');


try {
  $inputJSON = file_get_contents('php://input');
  $dataJSON = json_decode($inputJSON, true);
  $data = $dataJSON ?? $_POST;

  $reporte_id = intval($data['reporte_id'] ?? ($data['id'] ?? 0));
  $estatus = trim($data['estatus'] ?? ($data['nuevo_estatus'] ?? ''));
  $notas = trim($data['notas_resolucion'] ?? ($data['notas'] ?? ''));
  $resuelto_por = intval($data['resuelto_por'] ?? ($data['usuario_id'] ?? 1));

  if ($reporte_id <= 0 || empty($estatus)) {
    echo json_encode([
      'success' => false,
      'message' => 'Datos incompletos: Se requiere el ID del reporte y el nuevo estatus.'
    ]);
    exit;
  }

  try {
    $pdo->exec("ALTER TABLE reportes_danos ADD COLUMN notas_resolucion TEXT DEFAULT NULL");
  } catch (Exception $e) {
  }
  try {
    $pdo->exec("ALTER TABLE reportes_danos ADD COLUMN resuelto_por INT DEFAULT NULL");
  } catch (Exception $e) {
  }
  try {
    $pdo->exec("ALTER TABLE reportes_danos ADD COLUMN fecha_resolucion DATETIME DEFAULT NULL");
  } catch (Exception $e) {
  }
  try {
    $pdo->exec("ALTER TABLE reportes_danos ADD COLUMN foto_resolucion_url VARCHAR(255) DEFAULT NULL");
  } catch (Exception $e) {
  }

  // 3. Guardar en tu carpeta real: evidencias_danos/
  $foto_resolucion_sql = "";
  $params_foto = [];
  if (isset($_FILES['foto_resolucion']) && $_FILES['foto_resolucion']['error'] === UPLOAD_ERR_OK) {
    $directorio = 'evidencias_danos/';
    if (!is_dir($directorio)) {
      mkdir($directorio, 0777, true);
    }
    $nombre_archivo = 'res_' . $reporte_id . '_' . time() . '.webp';
    $ruta_destino = $directorio . $nombre_archivo;

    if (move_uploaded_file($_FILES['foto_resolucion']['tmp_name'], $ruta_destino)) {
      // Guardamos la ruta con la carpeta incluida
      $foto_resolucion_sql = ", foto_resolucion_url = ?";
      $params_foto[] = $ruta_destino;
    }
  }

  if ($estatus === 'Resuelto') {
    $sql = "UPDATE reportes_danos SET estatus = ?, notas_resolucion = ?, resuelto_por = ?, fecha_resolucion = NOW()" . $foto_resolucion_sql . " WHERE id = ?";
    $params = array_merge([$estatus, $notas, $resuelto_por], $params_foto, [$reporte_id]);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
  } else {
    $stmt = $pdo->prepare("UPDATE reportes_danos SET estatus = ?, resuelto_por = ? WHERE id = ?");
    $stmt->execute([$estatus, $resuelto_por, $reporte_id]);
  }

  echo json_encode([
    'success' => true,
    'message' => "Incidencia #$reporte_id actualizada correctamente a: $estatus"
  ]);
} catch (Exception $e) {
  echo json_encode([
    'success' => false,
    'message' => 'Error de base de datos: ' . $e->getMessage()
  ]);
}
