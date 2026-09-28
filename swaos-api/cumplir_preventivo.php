<?php
// swaos-api/cumplir_preventivo.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');

$tarea_id = isset($_POST['tarea_id']) ? intval($_POST['tarea_id']) : 0;
$usuario_id = isset($_POST['usuario_id']) ? intval($_POST['usuario_id']) : 0;
$notas_trabajo = isset($_POST['notas_trabajo']) ? trim($_POST['notas_trabajo']) : '';

if ($tarea_id <= 0 || $usuario_id <= 0) {
  echo json_encode(['success' => false, 'message' => 'Faltan datos de la tarea o usuario.']);
  exit;
}

try {
  // Iniciamos una transacción: o se guarda todo (historial + reprogramación), o no se guarda nada
  $pdo->beginTransaction();

  // 1. Obtener la frecuencia de la tarea y el hotel
  $stmtTarea = $pdo->prepare("SELECT hotel_id, frecuencia_dias FROM mantenimiento_preventivo WHERE id = ?");
  $stmtTarea->execute([$tarea_id]);
  $tarea = $stmtTarea->fetch(PDO::FETCH_ASSOC);

  if (!$tarea) {
    throw new Exception("La tarea no existe.");
  }

  $hotel_id = $tarea['hotel_id'];
  $frecuencia = intval($tarea['frecuencia_dias']);

  // 2. Manejar la foto de evidencia si se envió
  $nombre_foto = null;
  if (isset($_FILES['foto']) && $_FILES['foto']['error'] === UPLOAD_ERR_OK) {
    $ext = pathinfo($_FILES['foto']['name'], PATHINFO_EXTENSION);
    // Generamos un nombre único: prev_ID_TIMESTAMP.webp
    $nombre_foto = 'prev_' . $tarea_id . '_' . time() . '.' . $ext;
    $ruta_destino = __DIR__ . '/evidencias/' . $nombre_foto;

    // Crear carpeta si no existe
    if (!is_dir(__DIR__ . '/evidencias')) {
      mkdir(__DIR__ . '/evidencias', 0755, true);
    }

    move_uploaded_file($_FILES['foto']['tmp_name'], $ruta_destino);
  }

  // 3. Insertar en el historial (Auditoría inmutable)
  $stmtHistorial = $pdo->prepare("
        INSERT INTO mantenimiento_preventivo_historial 
        (tarea_id, hotel_id, usuario_id, notas_trabajo, foto_evidencia_url) 
        VALUES (?, ?, ?, ?, ?)
    ");
  $stmtHistorial->execute([$tarea_id, $hotel_id, $usuario_id, $notas_trabajo, $nombre_foto]);

  // 4. Reprogramación Automática: Actualizar la tarea base
  $stmtUpdate = $pdo->prepare("
        UPDATE mantenimiento_preventivo 
        SET ultima_ejecucion = CURDATE(),
            proxima_ejecucion = DATE_ADD(CURDATE(), INTERVAL ? DAY)
        WHERE id = ?
    ");
  $stmtUpdate->execute([$frecuencia, $tarea_id]);

  $pdo->commit();
  echo json_encode(['success' => true]);
} catch (Exception $e) {
  $pdo->rollBack();
  echo json_encode(['success' => false, 'message' => 'Error de BD: ' . $e->getMessage()]);
}
