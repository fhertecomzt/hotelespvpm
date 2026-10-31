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

        // --- VALIDACIÓN: EMPLEADO INACTIVO ---
        if ($empleado['estatus'] !== 'Activo') {
            echo json_encode([
                'success' => false,
                'message' => "Hola {$empleado['nombre']}, tu cuenta está INACTIVA. Pasa a Recursos Humanos."
            ]);
            exit;
        }

        // 2. VALIDACIÓN MULTI-HOTEL (Permite coberturas automáticas en cualquier sucursal de la cadena)
        $stmtHoteles = $pdo->query("SELECT id, nombre, latitud, longitud FROM hoteles WHERE latitud IS NOT NULL AND longitud IS NOT NULL");
        $todos_los_hoteles = $stmtHoteles->fetchAll(PDO::FETCH_ASSOC);

        $hotel_asistencia_id = null;
        $nombre_hotel_fisico = "";

        // Recorremos todos los hoteles para ver si está a menos de 50 metros de alguno
        foreach ($todos_los_hoteles as $hotel) {
            if (empty($hotel['latitud']) || empty($hotel['longitud'])) continue;

            $distancia = calcularDistanciaMetros($latitud_movil, $longitud_movil, floatval($hotel['latitud']), floatval($hotel['longitud']));

            if ($distancia <= 50) {
                $hotel_asistencia_id = $hotel['id'];
                $nombre_hotel_fisico = $hotel['nombre'];
                break; // Encontró la sucursal válida, rompemos el ciclo
            }
        }

        // Si no está en el radio de 50 metros de ninguna sucursal
        if (!$hotel_asistencia_id) {
            echo json_encode([
                'success' => false,
                'message' => "Registro denegado. No te encuentras dentro del radio permitido (50m) de ninguna de las sucursales del hotel."
            ]);
            exit;
        }

        $fecha_hoy = date('Y-m-d');
        $hora_actual = date('H:i:s');
        $coords_actuales = "{$latitud_movil}, {$longitud_movil}";

        // ============================================================================
        // CANDADO INTELIGENTE: Bloquea si ya completó un turno que inició hoy,
        // permitiendo que los de turno nocturno inicien su jornada a las 10 PM.
        // ============================================================================
        $stmtCandadoHoy = $pdo->prepare("
            SELECT id FROM asistencias 
            WHERE usuario_id = ? 
              AND fecha = ? 
              AND hora_salida IS NOT NULL
            LIMIT 1
        ");
        $stmtCandadoHoy->execute([$usuario_id, $fecha_hoy]);

        if ($stmtCandadoHoy->fetch()) {
            echo json_encode([
                'success' => false,
                'message' => "Ya registraste asistencia y concluiste tu turno el día de hoy. ¡Buen descanso!"
            ]);
            exit;
        }
        // ============================================================================

        // Verificar si ya tiene un registro hoy (ABIERTO)
        // AHORA: Buscamos si tiene un registro ABIERTO (sin hora de salida) 
        // ya sea hoy o que venga arrastrando desde anoche (turno nocturno)
        // 💡 CORRECCIÓN: Ignoramos filas que sean Falta, Descanso, Permisos o Incapacidad
        $stmtCheck = $pdo->prepare("
            SELECT id, fecha, hora_entrada, hora_salida 
            FROM asistencias 
            WHERE usuario_id = ? 
              AND hora_salida IS NULL 
              AND estatus_entrada NOT IN ('Falta', 'Día de Descanso', 'Incapacidad', 'Permiso')
              AND (fecha = ? OR fecha = DATE_SUB(?, INTERVAL 1 DAY)) 
            ORDER BY fecha DESC, hora_entrada DESC 
            LIMIT 1
        ");
        $stmtCheck->execute([$usuario_id, $fecha_hoy, $fecha_hoy]);
        $registro_abierto = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        // 2.5 Validar si hoy es su día de descanso
        // 💡 CAMBIO: Solo validamos el día de descanso si NO tiene un registro abierto 
        // (es decir, si está intentando iniciar turno. Si tiene registro abierto, está cerrando su salida y debe permitírsele).
        if (!$registro_abierto) {
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


        // ============================================================================
        // CANDADO PREVENTIVO: Cierre automático de turnos huérfanos de días anteriores
        // ============================================================================
        $stmtCierreHuérfano = $pdo->prepare("
            UPDATE asistencias 
            SET hora_salida = hora_entrada, 
                estatus_salida = 'Sin Registro', 
                minutos_trabajados = 0 
            WHERE usuario_id = ? 
              AND hora_salida IS NULL 
              AND fecha < ? 
              AND estatus_entrada NOT IN ('Falta', 'Día de Descanso', 'Incapacidad', 'Permiso')
        ");
        $stmtCierreHuérfano->execute([$usuario_id, $fecha_hoy]);
        // ============================================================================

        if (!$registro_abierto) {
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
            $stmtInsert->execute([$usuario_id, $hotel_asistencia_id, $fecha_hoy, $hora_actual, $coords_actuales, $estatus_entrada, $minutos_retardo]);

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
            if (empty($registro_abierto['hora_salida'])) {

                // --- VALIDACIÓN: ANTIRREBOTE (COOLDOWN) CORREGIDO ---
                // Unimos la fecha y la hora exacta para que soporte turnos nocturnos correctamente
                $tiempo_entrada = strtotime($registro_abierto['fecha'] . ' ' . $registro_abierto['hora_entrada']);
                $tiempo_ahora = strtotime($fecha_hoy . ' ' . $hora_actual);

                $minutos_transcurridos = round(($tiempo_ahora - $tiempo_entrada) / 60);

                // Bloqueamos si han pasado menos de 50 minutos
                if ($minutos_transcurridos < 50) {
                    echo json_encode([
                        'success' => false,
                        'message' => "Acabas de registrar tu entrada. Por seguridad, espera al menos 50 minutos antes de registrar tu salida."
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
                $stmtUpdate->execute([$hora_actual, $coords_actuales, $estatus_salida, $minutos_salida_anticipada, $horas_extras, $minutos_trabajados, $registro_abierto['id']]);

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
