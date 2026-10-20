<?php
// sincronizar_faltas.php
ini_set('display_errors', 0);
error_reporting(0);
date_default_timezone_set('America/Mazatlan');


require_once 'db.php';

// CANDADO DE SEGURIDAD PARA CRON JOB
require_once 'config_keys.php';
$token_secreto = CRON_SECRET_TOKEN;
$token_ingresado = $_GET['token'] ?? '';

if ($token_ingresado !== $token_secreto) {
  echo json_encode(['success' => false, 'message' => 'Acceso no autorizado.']);
  exit;
}

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Leer datos enviados (soporta JSON)
$data = json_decode(file_get_contents("php://input"), true) ?: $_POST;

$hotel_id = intval($data['hotel_id'] ?? 0);
$rol_solicitante = $data['rol_solicitante'] ?? '';

// Por defecto, si no mandan fecha, auditamos "ayer"
$ayer = date('Y-m-d', strtotime('-1 day'));
$fecha_evaluar = $data['fecha'] ?? $ayer;

try {
  // 1. Obtener empleados ACTIVOS con horario (¡AGREGAMOS dias_descanso y la exclusión de asistencia!)
  $sqlUsuarios = "SELECT id, hotel_base_id, dias_descanso FROM usuarios WHERE estatus = 'Activo' AND hora_entrada IS NOT NULL AND hora_entrada != '' AND exento_asistencia = 0";
  $params = [];

  if ($rol_solicitante !== 'Superusuario' && $hotel_id > 0) {
    $sqlUsuarios .= " AND hotel_base_id = ?";
    $params[] = $hotel_id;
  }

  $stmtU = $pdo->prepare($sqlUsuarios);
  $stmtU->execute($params);
  $usuarios = $stmtU->fetchAll(PDO::FETCH_ASSOC);

  $faltas_registradas = 0;
  $descansos_ignorados = 0;

  // 2. Determinar qué día de la semana es la fecha evaluada (en español)
  $dias_espanol = [
    'Monday' => 'Lunes',
    'Tuesday' => 'Martes',
    'Wednesday' => 'Miércoles',
    'Thursday' => 'Jueves',
    'Friday' => 'Viernes',
    'Saturday' => 'Sábado',
    'Sunday' => 'Domingo'
  ];
  $dia_semana_ingles = date('l', strtotime($fecha_evaluar));
  $dia_evaluar_espanol = $dias_espanol[$dia_semana_ingles];

  foreach ($usuarios as $u) {
    // 3. Verificamos si hoy le tocaba descansar
    $dias_descanso = json_decode($u['dias_descanso'] ?? '[]', true);
    $es_descanso = is_array($dias_descanso) && in_array($dia_evaluar_espanol, $dias_descanso);

    // 4. Verificar si ya tiene registro ese día
    $stmtCheck = $pdo->prepare("SELECT id FROM asistencias WHERE usuario_id = ? AND fecha = ?");
    $stmtCheck->execute([$u['id'], $fecha_evaluar]);

    if ($stmtCheck->rowCount() === 0) {
      if ($es_descanso) {
        // Es su día libre y no vino (lo normal). Registramos el descanso.
        $stmtInsert = $pdo->prepare("INSERT INTO asistencias (usuario_id, hotel_id, fecha, estatus_entrada) VALUES (?, ?, ?, 'Día de Descanso')");
        $stmtInsert->execute([$u['id'], $u['hotel_base_id'], $fecha_evaluar]);
        $descansos_ignorados++; // Contabilizamos los descansos aplicados
      } else {
        // No es su día libre y no vino. ¡FALTA!
        $stmtInsert = $pdo->prepare("INSERT INTO asistencias (usuario_id, hotel_id, fecha, estatus_entrada) VALUES (?, ?, ?, 'Falta')");
        $stmtInsert->execute([$u['id'], $u['hotel_base_id'], $fecha_evaluar]);
        $faltas_registradas++;
      }
    }
  }

  echo json_encode([
    'success' => true,
    'message' => "Auditoría del $fecha_evaluar: $faltas_registradas faltas aplicadas y $descansos_ignorados días de descanso registrados."
  ]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $e->getMessage()]);
}

