<?php
// corregir_asistencia.php
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

$asistencia_id = intval($data['id'] ?? 0);
$hora_entrada = empty($data['hora_entrada']) ? null : $data['hora_entrada'];
$hora_salida = empty($data['hora_salida']) ? null : $data['hora_salida'];
$motivo = trim($data['motivo'] ?? '');

if (!$asistencia_id || empty($motivo)) {
  echo json_encode(['success' => false, 'message' => 'El ID y el motivo de corrección son obligatorios.']);
  exit;
}

try {
  // 1. Obtener el registro actual y el horario oficial del empleado
  $stmt = $pdo->prepare("SELECT a.*, u.hora_entrada as oficial_entrada, u.hora_salida as oficial_salida, u.minutos_tolerancia 
                           FROM asistencias a JOIN usuarios u ON a.usuario_id = u.id WHERE a.id = ?");
  $stmt->execute([$asistencia_id]);
  $registro = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$registro) {
    echo json_encode(['success' => false, 'message' => 'Registro no encontrado.']);
    exit;
  }

  $estatus_entrada = $registro['estatus_entrada'];
  $minutos_retardo = $registro['minutos_retardo'];
  $estatus_salida = $registro['estatus_salida'];
  $minutos_anticipada = $registro['minutos_salida_anticipada'];
  $horas_extras = $registro['horas_extras'];
  $minutos_trabajados = $registro['minutos_trabajados'];

  // 2. RECALCULAR ENTRADA
  if ($hora_entrada && $registro['oficial_entrada']) {
    $estatus_entrada = "A Tiempo";
    $minutos_retardo = 0;
    $oficial_in = strtotime($registro['oficial_entrada']);
    $real_in = strtotime($hora_entrada);
    $dif_in = round(($real_in - $oficial_in) / 60);

    if ($dif_in > intval($registro['minutos_tolerancia'])) {
      $estatus_entrada = "Retardo";
      $minutos_retardo = $dif_in;
    }
  }

  // 3. RECALCULAR SALIDA Y TOTAL TRABAJADO
  if ($hora_salida) {
    $real_in_calc = $hora_entrada ? strtotime($hora_entrada) : strtotime($registro['hora_entrada']);
    $real_out = strtotime($hora_salida);

    // Calcular minutos totales trabajados
    if ($real_out > $real_in_calc) {
      $minutos_trabajados = round(($real_out - $real_in_calc) / 60);
    }

    if ($registro['oficial_salida']) {
      $estatus_salida = "A Tiempo";
      $minutos_anticipada = 0;
      $horas_extras = 0;
      $oficial_out = strtotime($registro['oficial_salida']);
      $dif_out = round(($real_out - $oficial_out) / 60);

      if ($dif_out < 0) {
        $estatus_salida = "Salida Anticipada";
        $minutos_anticipada = abs($dif_out);
      } elseif ($dif_out >= 60) {
        $horas_extras = floor($dif_out / 60);
      }
    }
  }

  // 4. Anexar justificación
  $justificacion_previa = $registro['justificacion'] ? $registro['justificacion'] . " | " : "";
  $nueva_justificacion = $justificacion_previa . "Ajuste HR: " . $motivo;
  $h_in = $hora_entrada ? date('H:i:s', strtotime($hora_entrada)) : null;
  $h_out = $hora_salida ? date('H:i:s', strtotime($hora_salida)) : null;

  // 5. Actualizar la base de datos
  $stmtUpd = $pdo->prepare("UPDATE asistencias SET hora_entrada=?, hora_salida=?, estatus_entrada=?, estatus_salida=?, minutos_retardo=?, minutos_salida_anticipada=?, horas_extras=?, minutos_trabajados=?, justificacion=? WHERE id=?");
  $stmtUpd->execute([$h_in, $h_out, $estatus_entrada, $estatus_salida, $minutos_retardo, $minutos_anticipada, $horas_extras, $minutos_trabajados, $nueva_justificacion, $asistencia_id]);

  echo json_encode(['success' => true, 'message' => 'Corrección aplicada. Cálculos de tiempo actualizados.']);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $e->getMessage()]);
}
