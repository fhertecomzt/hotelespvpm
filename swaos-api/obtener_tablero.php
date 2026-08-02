<?php
// swaos-api/obtener_tablero.php
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');

// --- AGREGAR ESTAS 3 LÍNEAS PARA MATAR EL CACHÉ ---
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
// --------------------------------------------------
require 'db.php';

try {
  $hotel_id = isset($_GET['hotel_id']) ? intval($_GET['hotel_id']) : 1;

  // 1. Obtener lista de hoteles con alias para los botones y selectores
  $hoteles_lista = $pdo->query("SELECT id, nombre, COALESCE(alias, nombre) as alias FROM hoteles WHERE COALESCE(estatus, 'Activo') != 'Inactivo' ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

  // 2. Obtener Zonas del hotel actual
  $stmtZonas = $pdo->prepare("SELECT id, nombre, camarista_id FROM zonas WHERE hotel_id = ? AND COALESCE(estatus, 'Activo') != 'Inactivo' ORDER BY id ASC");
  $stmtZonas->execute([$hotel_id]);
  $zonas_db = $stmtZonas->fetchAll(PDO::FETCH_ASSOC);

  // 3. Obtener Habitaciones del hotel actual
  $stmtHabs = $pdo->prepare("SELECT id, numero, tipo, zona_actual_id, estatus_operativo FROM habitaciones WHERE hotel_id = ? ORDER BY numero ASC");
  $stmtHabs->execute([$hotel_id]);
  $habs_db = $stmtHabs->fetchAll(PDO::FETCH_ASSOC);

  // 4. Obtener Camaristas (de todos los hoteles para permitir préstamos entre sedes)
  $stmtCam = $pdo->query("SELECT id, nombre, primer_apellido, segundo_apellido, hotel_base_id FROM usuarios WHERE rol = 'Camarista' AND COALESCE(estatus, 'Activo') != 'Inactivo' ORDER BY nombre ASC");
  $camaristas = $stmtCam->fetchAll(PDO::FETCH_ASSOC);

  $columnas = [];
  $ordenColumnas = [];
  $habitaciones = [];

  // Mapear habitaciones
  foreach ($habs_db as $h) {
    $id_str = "hab-" . $h['id'];
    $habitaciones[$id_str] = [
      'id' => $id_str,
      'id_real' => $h['id'],
      'numero' => $h['numero'],
      'tipo' => $h['tipo'],
      'estatus' => $h['estatus_operativo'] ?: 'Limpia',
      'zona_id' => $h['zona_actual_id']
    ];
  }

  // Mapear zonas en columnas para el tablero
  foreach ($zonas_db as $z) {
    $col_id = "col-" . $z['id'];
    $ordenColumnas[] = $col_id;

    $habs_en_zona = [];
    foreach ($habitaciones as $hab_id => $hab_data) {
      if (intval($hab_data['zona_id']) === intval($z['id'])) {
        $habs_en_zona[] = $hab_id;
      }
    }

    $columnas[$col_id] = [
      'id' => $col_id,
      'id_real' => $z['id'],
      'titulo' => $z['nombre'],
      'camarista_id' => $z['camarista_id'],
      'habitacionIds' => $habs_en_zona
    ];
  }

  echo json_encode([
    'success' => true,
    'hoteles_lista' => $hoteles_lista,
    'columnas' => $columnas,
    'ordenColumnas' => $ordenColumnas,
    'habitaciones' => $habitaciones,
    'camaristas' => $camaristas
  ]);
} catch (Exception $e) {
  echo json_encode(['error' => $e->getMessage()]);
}
