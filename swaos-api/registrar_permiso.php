<?php
// registrar_permiso.php
ini_set('display_errors', 0);
error_reporting(0);
date_default_timezone_set('America/Mazatlan');

require_once 'auth.php';
require_once 'db.php';

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

$data = json_decode(file_get_contents("php://input"), true) ?: $_POST;

$usuario_id = intval($data['usuario_id'] ?? 0);
$fecha_inicio = $data['fecha_inicio'] ?? '';
$fecha_fin = $data['fecha_fin'] ?? '';
$tipo_permiso = trim($data['tipo_permiso'] ?? '');
$motivo = trim($data['motivo'] ?? '');

if (!$usuario_id || empty($fecha_inicio) || empty($fecha_fin) || empty($tipo_permiso)) {
  echo json_encode(['success' => false, 'message' => 'Faltan datos obligatorios (Empleado, Fechas y Tipo).']);
  exit;
}

// ==========================================
// LÓGICA PARA CANCELAR PERMISOS
// ==========================================
if ($tipo_permiso === 'Eliminar') {
  try {
    // Borramos los registros en ese rango de fechas SOLO si son permisos o faltas
    $stmtDel = $pdo->prepare("DELETE FROM asistencias WHERE usuario_id = ? AND fecha >= ? AND fecha <= ? AND estatus_entrada = 'Permiso'");
    $stmtDel->execute([$usuario_id, $fecha_inicio, $fecha_fin]);
    $borrados = $stmtDel->rowCount();

    echo json_encode([
      'success' => true,
      'message' => "Se anularon $borrados días de permiso. El empleado deberá checar normalmente."
    ]);
  } catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $e->getMessage()]);
  }
  exit;
}
// ==========================================

try {
  // 1. Obtener el hotel base del empleado
  $stmtU = $pdo->prepare("SELECT hotel_base_id FROM usuarios WHERE id = ?");
  $stmtU->execute([$usuario_id]);
  $hotel_afectado = $stmtU->fetchColumn();

  if (!$hotel_afectado) {
    echo json_encode(['success' => false, 'message' => 'Empleado no encontrado.']);
    exit;
  }

  $justificacion_texto = $tipo_permiso . ($motivo ? " - " . $motivo : "");
  $dias_procesados = 0;

  // 2. Crear el rango de fechas para recorrerlas una por una
  $begin = new DateTime($fecha_inicio);
  $end = new DateTime($fecha_fin);
  $end->modify('+1 day'); // Sumamos un día para que el DatePeriod incluya el último día

  $interval = DateInterval::createFromDateString('1 day');
  $period = new DatePeriod($begin, $interval, $end);

  foreach ($period as $dt) {
    $fecha_str = $dt->format("Y-m-d");

    // Verificamos si ya existe algún registro en ese día
    $stmtCheck = $pdo->prepare("SELECT id FROM asistencias WHERE usuario_id = ? AND fecha = ?");
    $stmtCheck->execute([$usuario_id, $fecha_str]);
    $registro = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if ($registro) {
      // Si ya existe (ej. le habían puesto Falta), lo actualizamos a Permiso
      $stmtUpd = $pdo->prepare("UPDATE asistencias SET estatus_entrada = 'Permiso', justificacion = ? WHERE id = ?");
      $stmtUpd->execute([$justificacion_texto, $registro['id']]);
    } else {
      // Si no existe, lo creamos por adelantado
      $stmtIns = $pdo->prepare("INSERT INTO asistencias (usuario_id, hotel_id, fecha, estatus_entrada, justificacion) VALUES (?, ?, ?, 'Permiso', ?)");
      $stmtIns->execute([$usuario_id, $hotel_afectado, $fecha_str, $justificacion_texto]);
    }
    $dias_procesados++;
  }

  echo json_encode([
    'success' => true,
    'message' => "Se registraron $dias_procesados días de justificación correctamente."
  ]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $e->getMessage()]);
}
