<?php
// gestion_inventario.php
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
require 'db.php';

try {
  // Autocuración: Asegurar columnas en tablas existentes
  try {
    $pdo->exec("ALTER TABLE hoteles ADD COLUMN estatus VARCHAR(20) DEFAULT 'Activo'");
  } catch (Exception $e) {
  }
  try {
    $pdo->exec("ALTER TABLE zonas ADD COLUMN estatus VARCHAR(20) DEFAULT 'Activo'");
  } catch (Exception $e) {
  }
  try {
    $pdo->exec("ALTER TABLE hoteles ADD COLUMN alias VARCHAR(20) DEFAULT NULL AFTER nombre");
  } catch (Exception $e) {
  }
  try {
    $pdo->exec("UPDATE hoteles SET alias = 'Hotel PV' WHERE id = 1 AND (alias IS NULL OR alias = '')");
  } catch (Exception $e) {
  }
  try {
    $pdo->exec("UPDATE hoteles SET alias = 'Hotel PM' WHERE id = 2 AND (alias IS NULL OR alias = '')");
  } catch (Exception $e) {
  }

  // Autocuración: Crear tabla de Tipos de Habitación si no existe
  try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS tipos_habitacion (
            id INT AUTO_INCREMENT PRIMARY KEY,
            hotel_id INT NOT NULL DEFAULT 1,
            nombre VARCHAR(50) NOT NULL,
            estatus VARCHAR(20) DEFAULT 'Activo'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $checkTipos = $pdo->query("SELECT COUNT(*) FROM tipos_habitacion")->fetchColumn();
    if ($checkTipos == 0) {
      $pdo->exec("INSERT INTO tipos_habitacion (hotel_id, nombre, estatus) VALUES 
                (1, 'Estándar', 'Activo'), (1, 'Suite', 'Activo'), (1, 'Master Suite', 'Activo'),
                (2, 'Estándar', 'Activo'), (2, 'Suite', 'Activo')");
    }
  } catch (Exception $e) {
  }

  $accion = $_GET['accion'] ?? ($_POST['accion'] ?? '');
  $hotel_id = isset($_GET['hotel_id']) ? intval($_GET['hotel_id']) : 0;

  // --- ACCIÓN: LEER TODO EL CATÁLOGO ---
  if ($accion === 'leer_todo') {
    $hoteles = $pdo->query("SELECT * FROM hoteles ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

    // Filtros específicos con alias de tabla para evitar el Error 1052 de MySQL
    $filtroZonas = $hotel_id > 0 ? "WHERE hotel_id = $hotel_id" : "";
    $filtroTipos = $hotel_id > 0 ? "WHERE hotel_id = $hotel_id" : "";
    $filtroHab   = $hotel_id > 0 ? "WHERE h.hotel_id = $hotel_id" : "";

    $zonas = $pdo->query("SELECT * FROM zonas $filtroZonas ORDER BY hotel_id ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC);
    $tipos = $pdo->query("SELECT * FROM tipos_habitacion $filtroTipos ORDER BY hotel_id ASC, nombre ASC")->fetchAll(PDO::FETCH_ASSOC);
    $habitaciones = $pdo->query("SELECT h.*, z.nombre as zona_nombre FROM habitaciones h LEFT JOIN zonas z ON h.zona_actual_id = z.id $filtroHab ORDER BY h.hotel_id ASC, h.numero ASC")->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      'success' => true,
      'hoteles' => $hoteles,
      'zonas' => $zonas,
      'tipos_habitacion' => $tipos,
      'habitaciones' => $habitaciones
    ]);
    exit;
  }

  // --- ACCIÓN: GUARDAR O CREAR HOTEL ---
  if ($accion === 'guardar_hotel') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    $nombre = trim($data['nombre'] ?? '');
    $alias = trim($data['alias'] ?? '');
    $direccion = trim($data['direccion'] ?? '');
    $estatus = trim($data['estatus'] ?? 'Activo');

    if (empty($nombre)) {
      echo json_encode(['success' => false, 'message' => 'El nombre del hotel es obligatorio.']);
      exit;
    }
    if (empty($alias)) {
      $alias = substr($nombre, 0, 10);
    }

    if ($id > 0) {
      $stmt = $pdo->prepare("UPDATE hoteles SET nombre = ?, alias = ?, direccion = ?, estatus = ? WHERE id = ?");
      $stmt->execute([$nombre, $alias, $direccion, $estatus, $id]);
      echo json_encode(['success' => true, 'message' => 'Hotel actualizado correctamente.']);
    } else {
      $stmt = $pdo->prepare("INSERT INTO hoteles (nombre, alias, direccion, estatus) VALUES (?, ?, ?, ?)");
      $stmt->execute([$nombre, $alias, $direccion, $estatus]);

      $nuevoHotelId = $pdo->lastInsertId();
      $pdo->exec("INSERT INTO zonas (hotel_id, nombre, estatus) VALUES ($nuevoHotelId, 'Zona General', 'Activo')");
      $pdo->exec("INSERT INTO tipos_habitacion (hotel_id, nombre, estatus) VALUES ($nuevoHotelId, 'Estándar', 'Activo'), ($nuevoHotelId, 'Suite', 'Activo')");

      echo json_encode(['success' => true, 'message' => '🎉 Nuevo hotel y alias aprovisionados con éxito.']);
    }
    exit;
  }

  // --- ACCIÓN: GUARDAR O CREAR ZONA ---
  if ($accion === 'guardar_zona') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    $hotel_id_zona = intval($data['hotel_id'] ?? 1);
    $nombre = trim($data['nombre'] ?? '');
    $estatus = trim($data['estatus'] ?? 'Activo');

    if (empty($nombre)) {
      echo json_encode(['success' => false, 'message' => 'El nombre de la zona es obligatorio.']);
      exit;
    }

    if ($id > 0) {
      $stmt = $pdo->prepare("UPDATE zonas SET nombre = ?, hotel_id = ?, estatus = ? WHERE id = ?");
      $stmt->execute([$nombre, $hotel_id_zona, $estatus, $id]);
      echo json_encode(['success' => true, 'message' => 'Zona actualizada con éxito.']);
    } else {
      $stmt = $pdo->prepare("INSERT INTO zonas (hotel_id, nombre, estatus) VALUES (?, ?, ?)");
      $stmt->execute([$hotel_id_zona, $nombre, $estatus]);
      echo json_encode(['success' => true, 'message' => 'Nueva zona creada con éxito.']);
    }
    exit;
  }

  // --- ACCIÓN: GUARDAR O CREAR TIPO DE HABITACIÓN ---
  if ($accion === 'guardar_tipo') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    $hotel_id_tipo = intval($data['hotel_id'] ?? 1);
    $nombre = trim($data['nombre'] ?? '');
    $estatus = trim($data['estatus'] ?? 'Activo');

    if (empty($nombre)) {
      echo json_encode(['success' => false, 'message' => 'El nombre del tipo es obligatorio.']);
      exit;
    }

    if ($id > 0) {
      $stmt = $pdo->prepare("UPDATE tipos_habitacion SET nombre = ?, hotel_id = ?, estatus = ? WHERE id = ?");
      $stmt->execute([$nombre, $hotel_id_tipo, $estatus, $id]);
      echo json_encode(['success' => true, 'message' => 'Tipo de habitación actualizado.']);
    } else {
      $stmt = $pdo->prepare("INSERT INTO tipos_habitacion (hotel_id, nombre, estatus) VALUES (?, ?, ?)");
      $stmt->execute([$hotel_id_tipo, $nombre, $estatus]);
      echo json_encode(['success' => true, 'message' => 'Nuevo tipo de habitación creado.']);
    }
    exit;
  }

  // --- ACCIÓN: GUARDAR O CREAR HABITACIÓN ---
  if ($accion === 'guardar_habitacion') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    $hotel_id_hab = intval($data['hotel_id'] ?? 1);
    $zona_id = intval($data['zona_id'] ?? 0);
    $numero = trim($data['numero'] ?? '');
    $tipo = trim($data['tipo'] ?? 'Estándar');

    if (empty($numero)) {
      echo json_encode(['success' => false, 'message' => 'El número de habitación es obligatorio.']);
      exit;
    }

    $zona_val = $zona_id > 0 ? $zona_id : null;

    if ($id > 0) {
      $stmt = $pdo->prepare("UPDATE habitaciones SET hotel_id = ?, zona_actual_id = ?, numero = ?, tipo = ? WHERE id = ?");
      $stmt->execute([$hotel_id_hab, $zona_val, $numero, $tipo, $id]);
      echo json_encode(['success' => true, 'message' => 'Habitación actualizada.']);
    } else {
      $stmtCheck = $pdo->prepare("SELECT id FROM habitaciones WHERE hotel_id = ? AND numero = ?");
      $stmtCheck->execute([$hotel_id_hab, $numero]);
      if ($stmtCheck->rowCount() > 0) {
        echo json_encode(['success' => false, 'message' => "⚠️ La habitación '$numero' ya existe en este hotel."]);
        exit;
      }

      $stmt = $pdo->prepare("INSERT INTO habitaciones (hotel_id, zona_actual_id, numero, tipo, estatus_operativo) VALUES (?, ?, ?, ?, 'Limpia')");
      $stmt->execute([$hotel_id_hab, $zona_val, $numero, $tipo]);
      echo json_encode(['success' => true, 'message' => 'Habitación creada con éxito.']);
    }
    exit;
  }

  // --- ACCIÓN: ELIMINAR CUALQUIER ITEM ---
  if ($accion === 'eliminar_item') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = intval($data['id'] ?? 0);
    $tabla = trim($data['tabla'] ?? '');

    if ($id <= 0 || !in_array($tabla, ['hoteles', 'zonas', 'tipos_habitacion', 'habitaciones'])) {
      echo json_encode(['success' => false, 'message' => 'Datos de eliminación inválidos.']);
      exit;
    }

    $stmt = $pdo->prepare("DELETE FROM $tabla WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true, 'message' => 'Registro eliminado permanentemente.']);
    exit;
  }

  echo json_encode(['success' => false, 'message' => 'Acción no reconocida.']);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}
