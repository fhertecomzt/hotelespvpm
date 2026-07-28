<?php
// swaos-api/obtener_bitacora.php
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
require 'db.php';

try {
  // 1. Obtener lista de hoteles activos
  $hoteles_lista = $pdo->query("SELECT id, nombre, COALESCE(alias, nombre) as alias FROM hoteles WHERE COALESCE(estatus, 'Activo') != 'Inactivo' ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

  // 2. Consulta principal de auditoría usando los nombres reales de tu SQL
  $sql = "
        SELECT 
            b.id,
            b.habitacion_id,
            h.numero AS habitacion_numero,
            h.hotel_id,
            COALESCE(hot.alias, hot.nombre, CONCAT('Hotel ', h.hotel_id)) AS hotel_alias,
            COALESCE(u.nombre, 'Usuario No Registrado') AS camarista_nombre,
            COALESCE(u.primer_apellido, '') AS camarista_apellido,
            b.hora_inicio AS fecha_inicio,
            b.hora_fin AS fecha_fin,
            COALESCE(b.duracion_minutos, TIMESTAMPDIFF(MINUTE, b.hora_inicio, COALESCE(b.hora_fin, NOW()))) AS duracion_minutos,
            COALESCE(b.estatus_final, 'En Proceso') AS estatus
        FROM bitacora_limpieza b
        JOIN habitaciones h ON b.habitacion_id = h.id
        LEFT JOIN hoteles hot ON h.hotel_id = hot.id
        LEFT JOIN usuarios u ON u.id = b.usuario_id
        ORDER BY b.hora_inicio DESC
        LIMIT 300
    ";

  $stmt = $pdo->query($sql);
  $bitacora = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'hoteles_lista' => $hoteles_lista,
    'bitacora' => $bitacora
  ]);
} catch (Exception $e) {
  echo json_encode([
    'success' => false,
    'message' => 'Error al consultar la bitácora: ' . $e->getMessage()
  ]);
}
