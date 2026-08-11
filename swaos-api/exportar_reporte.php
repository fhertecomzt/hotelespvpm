<?php
// exportar_reporte.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

$hotel_id = isset($_GET['hotel_id']) ? intval($_GET['hotel_id']) : 1;
$fecha = date('Y-m-d_H-i');

// Configurar cabeceras para descarga de archivo CSV
header('Content-Type: text/csv; charset=utf-8');
header("Content-Disposition: attachment; filename=SWAOS_Reporte_Operativo_Hotel_{$hotel_id}_{$fecha}.csv");

// Crear el puntero de salida
$output = fopen('php://output', 'w');

// Añadir BOM para que Excel en Windows lea los acentos (UTF-8) correctamente
fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF));

// Encabezados de las columnas en el Excel
fputcsv($output, ['ID Hab.', 'Número', 'Tipo', 'Estatus Operativo', 'Zona Asignada', 'Fallas Reportadas']);

// Consulta de datos
$sql = "
    SELECT h.id, h.numero, h.tipo, h.estatus_operativo, 
           COALESCE(z.nombre, 'Sin Asignar') as zona,
           (SELECT COUNT(*) FROM reportes_danos r WHERE r.habitacion_id = h.id AND r.estatus != 'Resuelto') as fallas
    FROM habitaciones h
    LEFT JOIN zonas z ON h.zona_actual_id = z.id
    WHERE h.hotel_id = ?
    ORDER BY h.numero ASC
";

$stmt = $pdo->prepare($sql);
$stmt->execute([$hotel_id]);

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
  fputcsv($output, [
    $row['id'],
    $row['numero'],
    $row['tipo'],
    $row['estatus_operativo'],
    $row['zona'],
    $row['fallas'] > 0 ? "SI ({$row['fallas']} pendientes)" : "Ninguna"
  ]);
}

fclose($output);
exit;
