<?php
// guardar_usuario.php
ini_set('display_errors', 0);
error_reporting(0);

require_once 'auth.php';
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

try {
  // Autocuración: Asegurar columnas necesarias
  try {
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN estatus VARCHAR(20) DEFAULT 'Activo'");
  } catch (Exception $e) {
  }
  try {
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN permisos JSON DEFAULT NULL");
  } catch (Exception $e) {
  }
  try {
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN minutos_tolerancia INT DEFAULT 15");
  } catch (Exception $e) {
  }
  try {
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN foto_perfil_url VARCHAR(255) DEFAULT NULL");
  } catch (Exception $e) {
  }

  $cols = $pdo->query("SHOW COLUMNS FROM usuarios")->fetchAll(PDO::FETCH_COLUMN);
  $col_pass = null;
  foreach (['password', 'password_hash', 'contrasena', 'clave', 'pass', 'hash'] as $posible) {
    if (in_array($posible, $cols)) {
      $col_pass = $posible;
      break;
    }
  }
  if (!$col_pass) {
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN password VARCHAR(255) DEFAULT NULL");
    $col_pass = 'password';
  }

  // SOPORTE HÍBRIDO: Detectar si viene como JSON o como FormData (Archivos)
  $is_json = strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false;
  if ($is_json) {
    $data = json_decode(file_get_contents('php://input'), true);
  } else {
    $data = $_POST;
    if (isset($data['permisos']) && is_string($data['permisos'])) {
      $data['permisos'] = json_decode($data['permisos'], true);
    }
  }

  $id = intval($data['id'] ?? 0);
  $nombre = trim($data['nombre'] ?? '');
  $primer_apellido = trim($data['primer_apellido'] ?? '');
  $segundo_apellido = trim($data['segundo_apellido'] ?? '');
  $email = trim($data['email'] ?? '');
  $password = trim($data['password'] ?? '');
  $rol = trim($data['rol'] ?? 'Camarista');
  $hotel_base_id = intval($data['hotel_base_id'] ?? 1);
  $estatus = trim($data['estatus'] ?? 'Activo');
  $minutos_tolerancia = intval($data['minutos_tolerancia'] ?? 15);
  $rol_solicitante = trim($data['rol_solicitante'] ?? '');

  $permisos_arreglo = isset($data['permisos']) && is_array($data['permisos']) ? $data['permisos'] : [];
  $permisos_json = json_encode($permisos_arreglo);

  // =========================================================================
  // PROCESAMIENTO DE LA FOTO MAESTRO (RECONOCIMIENTO FACIAL)
  // =========================================================================
  $foto_perfil_url = null;

  // Si estamos editando, conservamos la foto anterior por defecto
  if ($id > 0) {
    $stmtFoto = $pdo->prepare("SELECT foto_perfil_url FROM usuarios WHERE id = ?");
    $stmtFoto->execute([$id]);
    $foto_perfil_url = $stmtFoto->fetchColumn();
  }

  // Si se subió un archivo nuevo
  if (isset($_FILES['foto_rostro']) && $_FILES['foto_rostro']['error'] === UPLOAD_ERR_OK) {
    $ext = pathinfo($_FILES['foto_rostro']['name'], PATHINFO_EXTENSION);
    $filename = 'rostro_usr_' . time() . '_' . rand(1000, 9999) . '.' . $ext;

    // Usamos una carpeta específica para los rostros de IA
    $upload_dir = '../evidencias/rostros/';
    if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);

    if (move_uploaded_file($_FILES['foto_rostro']['tmp_name'], $upload_dir . $filename)) {
      $foto_perfil_url = 'evidencias/rostros/' . $filename;
    }
  }

  // 🛡️ CANDADOS DE SEGURIDAD (ANTI-ESCALADA DE PRIVILEGIOS)
  if ($rol === 'Superusuario' && $rol_solicitante !== 'Superusuario') {
    echo json_encode(['success' => false, 'message' => '🛑 Bloqueo: No tienes autorización para crear cuentas de Superusuario.']);
    exit;
  }
  if ($rol === 'Administrador' && !in_array($rol_solicitante, ['Superusuario', 'Administrador'])) {
    echo json_encode(['success' => false, 'message' => '🛑 Bloqueo: Nivel insuficiente para crear cuentas de Administrador.']);
    exit;
  }
  if (in_array('gestionar_hoteles', $permisos_arreglo) && $rol_solicitante !== 'Superusuario') {
    echo json_encode(['success' => false, 'message' => '🛑 Bloqueo: Solo un Superusuario puede otorgar acceso SaaS.']);
    exit;
  }

  if (empty($nombre) || empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Nombre y correo son obligatorios.']);
    exit;
  }

  // VALIDACIÓN ANTI-DUPLICADOS
  $stmtCheck = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? AND id != ?");
  $stmtCheck->execute([$email, $id]);
  if ($stmtCheck->rowCount() > 0) {
    echo json_encode(['success' => false, 'message' => 'Ese correo electrónico ya está registrado.']);
    exit;
  }

  if ($id > 0) {
    if (!empty($password)) {
      $hash = password_hash($password, PASSWORD_DEFAULT);
      $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, primer_apellido=?, segundo_apellido=?, email=?, $col_pass=?, rol=?, hotel_base_id=?, estatus=?, permisos=?, minutos_tolerancia=?, foto_perfil_url=? WHERE id=?");
      $stmt->execute([$nombre, $primer_apellido, $segundo_apellido, $email, $hash, $rol, $hotel_base_id, $estatus, $permisos_json, $minutos_tolerancia, $foto_perfil_url, $id]);
    } else {
      $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, primer_apellido=?, segundo_apellido=?, email=?, rol=?, hotel_base_id=?, estatus=?, permisos=?, minutos_tolerancia=?, foto_perfil_url=? WHERE id=?");
      $stmt->execute([$nombre, $primer_apellido, $segundo_apellido, $email, $rol, $hotel_base_id, $estatus, $permisos_json, $minutos_tolerancia, $foto_perfil_url, $id]);
    }
    echo json_encode(['success' => true, 'message' => 'Empleado actualizado con éxito.']);
  } else {
    $hash = password_hash(empty($password) ? '123456' : $password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, primer_apellido, segundo_apellido, email, $col_pass, rol, hotel_base_id, estatus, permisos, minutos_tolerancia, foto_perfil_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$nombre, $primer_apellido, $segundo_apellido, $email, $hash, $rol, $hotel_base_id, $estatus, $permisos_json, $minutos_tolerancia, $foto_perfil_url]);
    echo json_encode(['success' => true, 'message' => 'Nuevo empleado creado con éxito.']);
  }
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $e->getMessage()]);
}
