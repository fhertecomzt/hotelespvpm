<?php
// api_checador.php
ini_set('display_errors', 0);
error_reporting(0);

// Configuramos la zona horaria para que los registros sean exactos a la hora local
date_default_timezone_set('America/Mazatlan');

require_once 'db.php'; // Nota: No requerimos auth.php aquí porque el Kiosco es de acceso público sin token de sesión.

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// ============================================================================
// 2. FUNCIÓN MATEMÁTICA: FÓRMULA DE HAVERSINE PARA DISTANCIAS GPS
// ============================================================================
function calcularDistanciaMetros($lat1, $lon1, $lat2, $lon2)
{
    $radioTierra = 6371000; // Radio de la Tierra en metros
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);

    $a = sin($dLat / 2) * sin($dLat / 2) +
        cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
        sin($dLon / 2) * sin($dLon / 2);

    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return $radioTierra * $c;
}

// Capturamos la acción (GET o POST)
$accion = $_GET['accion'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);
if (empty($accion) && isset($data['accion'])) {
    $accion = $data['accion'];
}

try {
    // ============================================================================
    // ACCIÓN A: ENVIAR ROSTROS A LA IA EN REACT
    // ============================================================================
    if ($accion === 'obtener_rostros') {
        //  traemos usuarios que tengan una foto registrada
        $stmt = $pdo->query("SELECT id, nombre, primer_apellido, foto_perfil_url FROM usuarios WHERE foto_perfil_url IS NOT NULL AND foto_perfil_url != ''");
        $rostros = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'rostros' => $rostros
        ]);
        exit;
    }

    // ============================================================================
    // ACCIÓN B: REGISTRAR ASISTENCIA CON GEOCERCA
    // ============================================================================
    if ($accion === 'registrar_asistencia') {
        $usuario_id = intval($data['usuario_id'] ?? 0);
        $latitud_movil = floatval($data['latitud'] ?? 0);
        $longitud_movil = floatval($data['longitud'] ?? 0);

        if ($usuario_id === 0 || $latitud_movil === 0 || $longitud_movil === 0) {
            echo json_encode(['success' => false, 'message' => 'Faltan datos de ubicación o ID de usuario.']);
            exit;
        }

        // 1. Obtener datos del empleado
        $stmtUser = $pdo->prepare("SELECT u.id, u.nombre, u.estatus, u.minutos_tolerancia, u.hora_entrada, u.hora_salida, u.dias_descanso, u.hotel_base_id, u.fecha_nacimiento, u.fecha_ingreso, h.latitud, h.longitud, h.nombre as nombre_hotel 
                                   FROM usuarios u 
                                   LEFT JOIN hoteles h ON u.hotel_base_id = h.id 
                                   WHERE u.id = ?");
        $stmtUser->execute([$usuario_id]);
        $empleado = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if (!$empleado) {
            echo json_encode(['success' => false, 'message' => 'Empleado no encontrado.']);
            exit;
        }

        // --- NUEVA VALIDACIÓN: EMPLEADO INACTIVO ---
        if ($empleado['estatus'] !== 'Activo') {
            echo json_encode([
                'success' => false,
                'message' => "Hola {$empleado['nombre']}, tu cuenta está INACTIVA. Pasa a Recursos Humanos."
            ]);
            exit;
        }
        // -------------------------------------------

        // 2. Validar Geocerca (Anti-Fraudes)
        if (empty($empleado['latitud']) || empty($empleado['longitud'])) {
            echo json_encode(['success' => false, 'message' => "El hotel '{$empleado['nombre_hotel']}' no tiene coordenadas GPS configuradas. Comunícate con Administración."]);
            exit;
        }

        $distancia = calcularDistanciaMetros($latitud_movil, $longitud_movil, floatval($empleado['latitud']), floatval($empleado['longitud']));

        // REGLA DE NEGOCIO: 50 Metros de radio
        if ($distancia > 50) {
            $metrosRedondeados = round($distancia);
            echo json_encode([
                'success' => false,
                'message' => "Registro denegado. Te encuentras a {$metrosRedondeados} metros del hotel. Debes estar dentro de un radio de 50m."
            ]);
            exit;
        }

        $fecha_hoy = date('Y-m-d');
        $hora_actual = date('H:i:s');
        $coords_actuales = "{$latitud_movil}, {$longitud_movil}";

        // Verificar si ya tiene un registro hoy
        $stmtCheck = $pdo->prepare("SELECT id, hora_entrada, hora_salida FROM asistencias WHERE usuario_id = ? AND fecha = ?");
        $stmtCheck->execute([$usuario_id, $fecha_hoy]);
        $registro_hoy = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        // 2.5 Validar si hoy es su día de descanso
        $dias_espanol = [
            'Monday' => 'Lunes',
            'Tuesday' => 'Martes',
            'Wednesday' => 'Miércoles',
            'Thursday' => 'Jueves',
            'Friday' => 'Viernes',
            'Saturday' => 'Sábado',
            'Sunday' => 'Domingo'
        ];
        $dia_hoy_ingles = date('l');
        $dia_hoy_espanol = $dias_espanol[$dia_hoy_ingles];

        $dias_descanso = json_decode($empleado['dias_descanso'] ?? '[]', true);

        if (is_array($dias_descanso) && in_array($dia_hoy_espanol, $dias_descanso)) {
            echo json_encode([
                'success' => false,
                'message' => "Hoy es $dia_hoy_espanol, tu día de descanso. ¡Desconéctate y disfruta tu día!"
            ]);
            exit;
        }

        // ============================================================================
        // --- INICIO MÓDULO CUMPLEAÑOS Y ANIVERSARIOS ---
        // ============================================================================
        $hoy_md = date('m-d'); // Ej: "10-18"
        $hoy_Y = (int)date('Y'); // Ej: 2026

        $es_cumpleanos = false;
        $anios_aniversario = 0;

        if (!empty($empleado['fecha_nacimiento']) && date('m-d', strtotime($empleado['fecha_nacimiento'])) === $hoy_md) {
            $es_cumpleanos = true;
        }

        if (!empty($empleado['fecha_ingreso']) && date('m-d', strtotime($empleado['fecha_ingreso'])) === $hoy_md) {
            $ingreso_Y = (int)date('Y', strtotime($empleado['fecha_ingreso']));
            if ($hoy_Y > $ingreso_Y) {
                $anios_aniversario = $hoy_Y - $ingreso_Y;
            }
        }
        // ============================================================================

        // ============================================================================
        // --- INICIO MÓDULO COMUNICADOS RH ---
        // ============================================================================
        $hoy_rh = date('Y-m-d');
        // Quitamos el LIMIT 1 y ordenamos por prioridad: 1° Personal, 2° Hotel, 3° Global
        $stmtAnuncio = $pdo->prepare("
            SELECT mensaje 
            FROM anuncios_rh 
            WHERE estatus = 'Activo' 
            AND ? BETWEEN fecha_inicio AND fecha_fin 
            AND (
                tipo_alcance = 'Global' 
                OR (tipo_alcance = 'Hotel' AND hotel_id = ?) 
                OR (tipo_alcance = 'Personal' AND usuario_id = ?)
            )
            ORDER BY FIELD(tipo_alcance, 'Personal', 'Hotel', 'Global'), id DESC
        ");
        $stmtAnuncio->execute([$hoy_rh, $empleado['hotel_base_id'], $usuario_id]);

        // Extraemos TODOS los mensajes que apliquen
        $mensajes_rh = $stmtAnuncio->fetchAll(PDO::FETCH_COLUMN);

        $anuncio_rh = null;
        if (count($mensajes_rh) > 0) {
            // Si hay 1 solo, se manda normal. Si hay varios, los une con una bonita línea divisoria
            $anuncio_rh = implode('<div class="my-3 border-b-2 border-dashed border-indigo-200 dark:border-indigo-700/50 w-full"></div>', $mensajes_rh);
        }
        // ============================================================================
        // --- FIN MÓDULO COMUNICADOS RH ---
        // ============================================================================

        if (!$registro_hoy) {
            // ==========================================
            // 3. Lógica de Entrada / ES EL PRIMER CHEQUEO DEL DÍA (ENTRADA)
            // ==========================================
            $estatus_entrada = "A Tiempo";
            $minutos_retardo = 0;

            if (!empty($empleado['hora_entrada'])) {
                $hora_oficial_entrada = strtotime($empleado['hora_entrada']);
                $hora_real_entrada = strtotime($hora_actual);

                // Calculamos diferencia en minutos
                $minutos_diferencia = round(($hora_real_entrada - $hora_oficial_entrada) / 60);

                if ($minutos_diferencia > intval($empleado['minutos_tolerancia'])) {
                    $estatus_entrada = "Retardo";
                    $minutos_retardo = $minutos_diferencia; // Guardamos el valor exacto del retraso
                }
            } else {
                $estatus_entrada = "Sin Horario";
            }

            // Insertamos sumando el campo minutos_retardo
            $stmtInsert = $pdo->prepare("INSERT INTO asistencias (usuario_id, hotel_id, fecha, hora_entrada, coordenadas_entrada, estatus_entrada, minutos_retardo) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmtInsert->execute([$usuario_id, $empleado['hotel_base_id'], $fecha_hoy, $hora_actual, $coords_actuales, $estatus_entrada, $minutos_retardo]);

            echo json_encode([
                'success' => true,
                'tipo' => 'ENTRADA',
                'message' => "¡Bienvenido {$empleado['nombre']}! Entrada registrada a las {$hora_actual} ({$estatus_entrada}).",
                'anuncio' => $anuncio_rh,
                'nombre_empleado' => $empleado['nombre'],
                'es_cumpleanos' => $es_cumpleanos,
                'anios_aniversario' => $anios_aniversario
            ]);
        } else {
            // ==========================================
            // YA TIENE REGISTRO HOY (SALIDA)
            // ==========================================
            if (empty($registro_hoy['hora_salida'])) {

                // --- VALIDACIÓN: ANTIRREBOTE (COOLDOWN) ---
                $tiempo_entrada = strtotime($registro_hoy['hora_entrada']);
                $tiempo_ahora = strtotime($hora_actual);
                $minutos_transcurridos = round(($tiempo_ahora - $tiempo_entrada) / 60);

                // Bloqueamos si han pasado menos de 3 minutos
                if ($minutos_transcurridos < 3) {
                    echo json_encode([
                        'success' => false,
                        'message' => "Acabas de registrar tu entrada. Por seguridad, espera al menos 3 minutos antes de registrar tu salida."
                    ]);
                    exit;
                }
                // ------------------------------------------------

                // --- CÁLCULO DE TIEMPO TOTAL TRABAJADO ---
                $minutos_trabajados = round(($tiempo_ahora - $tiempo_entrada) / 60);

                $estatus_salida = "A Tiempo";
                $minutos_salida_anticipada = 0;
                $horas_extras = 0; // Inicializamos en 0

                // Verificamos si se fue antes, a tiempo, o si hizo horas extras
                if (!empty($empleado['hora_salida'])) {
                    $hora_oficial_salida = strtotime($empleado['hora_salida']);
                    $hora_real_salida = strtotime($hora_actual);

                    // Calculamos la diferencia exacta en minutos (Positivo = salió tarde, Negativo = salió temprano)
                    $diferencia_salida = round(($hora_real_salida - $hora_oficial_salida) / 60);

                    if ($diferencia_salida < 0) {
                        // Salió antes de tiempo (convertimos el negativo a positivo con abs)
                        $estatus_salida = "Salida Anticipada";
                        $minutos_salida_anticipada = abs($diferencia_salida);
                    } elseif ($diferencia_salida >= 60) {
                        // Salió tarde por 60 minutos o más. Usamos floor() para descartar fracciones (ej. 119 min = 1 hora)
                        $horas_extras = floor($diferencia_salida / 60);
                    }
                } else {
                    $estatus_salida = "Sin Horario";
                }

                // Actualizamos agregando la columna horas_extras
                $stmtUpdate = $pdo->prepare("UPDATE asistencias SET hora_salida = ?, coordenadas_salida = ?, estatus_salida = ?, minutos_salida_anticipada = ?, horas_extras = ?, minutos_trabajados = ? WHERE id = ?");
                $stmtUpdate->execute([$hora_actual, $coords_actuales, $estatus_salida, $minutos_salida_anticipada, $horas_extras, $minutos_trabajados, $registro_hoy['id']]);

                // Mensaje dinámico para el Kiosco
                $msg_extra = ".";
                if ($minutos_salida_anticipada > 0) $msg_extra = " (Te retiraste $minutos_salida_anticipada min. antes).";
                if ($horas_extras > 0) $msg_extra = " (+$horas_extras horas extras registradas).";

                echo json_encode([
                    'success' => true,
                    'tipo' => 'SALIDA',
                    'message' => "¡Hasta luego {$empleado['nombre']}! Salida registrada a las {$hora_actual}{$msg_extra}",
                    'anuncio' => $anuncio_rh,
                    'nombre_empleado' => $empleado['nombre'],
                    'es_cumpleanos' => $es_cumpleanos,
                    'anios_aniversario' => $anios_aniversario
                ]);
            }
        }
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Acción no válida.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}
