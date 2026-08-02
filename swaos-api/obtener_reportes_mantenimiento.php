<?php
// obtener_reportes_mantenimiento.php
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');

// --- AGREGAR ESTAS 3 LÍNEAS PARA MATAR EL CACHÉ ---
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
// --------------------------------------------------
require 'db.php';

$sql = "
    SELECT 
        r.id,
        r.habitacion_id,
        h.numero AS habitacion_numero,
        h.tipo AS habitacion_tipo,
        h.hotel_id,
        COALESCE(hot.alias, hot.nombre) AS hotel_alias,
        r.categoria,
        r.descripcion,
        r.notas_resolucion,
        r.foto_url,
        r.foto_resolucion_url,
        r.estatus,
        r.fecha_reporte,
        r.fecha_resolucion,
        u_rep.nombre AS rep_nombre,
        u_rep.primer_apellido AS rep_apellido,
        u_res.nombre AS res_nombre,
        u_res.primer_apellido AS res_apellido
    FROM reportes_danos r
    JOIN habitaciones h ON r.habitacion_id = h.id
    JOIN usuarios u_rep ON r.reportado_por = u_rep.id
    LEFT JOIN usuarios u_res ON r.resuelto_por = u_res.id
    LEFT JOIN hoteles hot ON h.hotel_id = hot.id
    ORDER BY 
        CASE r.estatus
            WHEN 'Pendiente' THEN 1
            WHEN 'En Reparación' THEN 2
            WHEN 'Resuelto' THEN 3
            ELSE 4
        END,
        r.fecha_reporte DESC
";

$stmt = $pdo->query($sql);
$reportes = $stmt->fetchAll();
$hoteles_lista = $pdo->query("SELECT id, nombre, COALESCE(alias, nombre) as alias FROM hoteles WHERE COALESCE(estatus, 'Activo') != 'Inactivo' ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'hoteles_lista' => $hoteles_lista,
    'reportes' => $reportes
]);