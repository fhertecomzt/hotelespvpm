<?php
// guardar_usuario.php
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');
require 'db.php';

try {
  // Autocuración 1: Asegurar que exista la columna estatus
  try {
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN estatus VARCHAR(20) DEFAULT 'Activo'");
  } catch (Exception $e) {
  }

  // Asegurar que exista la columna de permisos JSON
  try {
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN permisos JSON DEFAULT NULL");
  } catch (Exception $e) {
  }

  // Autocuración 2: Detectar el nombre real de la columna de contraseña en tu base de datos
  $cols = $pdo->query("SHOW COLUMNS FROM usuarios")->fetchAll(PDO::FETCH_COLUMN);
  $col_pass = null;

  // Buscamos cuál de los nombres más comunes es el que usa tu tabla
  foreach (['password', 'password_hash', 'contrasena', 'clave', 'pass', 'hash'] as $posible) {
    if (in_array($posible, $cols)) {
      $col_pass = $posible;
      break;
    }
  }

  // Si por alguna razón no existe ninguna de las anteriores, creamos 'password' por seguridad
  if (!$col_pass) {
    $pdo->exec("ALTER TABLE usuarios ADD COLUMN password VARCHAR(255) DEFAULT NULL");
    $col_pass = 'password';
  }

  $data = json_decode(file_get_contents('php://input'), true);
  $id = intval($data['id'] ?? 0);
  $nombre = trim($data['nombre'] ?? '');
  $primer_apellido = trim($data['primer_apellido'] ?? '');
  $segundo_apellido = trim($data['segundo_apellido'] ?? '');
  $email = trim($data['email'] ?? '');
  $password = trim($data['password'] ?? '');
  $rol = trim($data['rol'] ?? 'Camarista');
  $hotel_base_id = intval($data['hotel_base_id'] ?? 1);
  $estatus = trim($data['estatus'] ?? 'Activo');

  // Capturar el arreglo de permisos y empaquetarlo como texto JSON
  $permisos_arreglo = isset($data['permisos']) && is_array($data['permisos']) ? $data['permisos'] : [];
  $permisos_json = json_encode($permisos_arreglo);
  $permisos_arreglo = isset($data['permisos']) && is_array($data['permisos']) ? $data['permisos'] : [];
  $permisos_json = json_encode($permisos_arreglo);

  // 🔴 1. RECIBIMOS EL ROL DEL USUARIO QUE ESTÁ INTENTANDO HACER EL CAMBIO
  $rol_solicitante = trim($data['rol_solicitante'] ?? '');

  // =========================================================================
  // 🛡️ CANDADOS DE SEGURIDAD (ANTI-ESCALADA DE PRIVILEGIOS)
  // =========================================================================

  // CANDADO A: Evitar que asignen un rol superior a su propia jerarquía
  if ($rol === 'Superusuario' && $rol_solicitante !== 'Superusuario') {
    echo json_encode(['success' => false, 'message' => '🛑 Bloqueo de Seguridad: No tienes autorización para crear cuentas de Superusuario.']);
    exit;
  }
  if ($rol === 'Administrador' && !in_array($rol_solicitante, ['Superusuario', 'Administrador'])) {
    echo json_encode(['success' => false, 'message' => '🛑 Bloqueo de Seguridad: Nivel insuficiente para crear cuentas de Administrador.']);
    exit;
  }

  // CANDADO B: Evitar que otorguen permisos críticos si no tienen la autoridad
  if (in_array('gestionar_hoteles', $permisos_arreglo) && $rol_solicitante !== 'Superusuario') {
    echo json_encode(['success' => false, 'message' => '🛑 Bloqueo de Seguridad: Solo un Superusuario puede otorgar acceso al control de Hoteles (SaaS).']);
    exit;
  }

  // CANDADO C: Evitar que modifiquen o degraden a sus superiores (Si es una edición)
  if ($id > 0) {
    $stmtCheckRango = $pdo->prepare("SELECT rol FROM usuarios WHERE id = ?");
    $stmtCheckRango->execute([$id]);
    $usuarioDestino = $stmtCheckRango->fetch(PDO::FETCH_ASSOC);

    if ($usuarioDestino) {
      if ($usuarioDestino['rol'] === 'Superusuario' && $rol_solicitante !== 'Superusuario') {
        echo json_encode(['success' => false, 'message' => '🛑 Bloqueo de Seguridad: Prohibido modificar o degradar la cuenta de un Superusuario.']);
        exit;
      }
      if ($usuarioDestino['rol'] === 'Administrador' && !in_array($rol_solicitante, ['Superusuario', 'Administrador'])) {
        echo json_encode(['success' => false, 'message' => '🛑 Bloqueo de Seguridad: Prohibido modificar o degradar a un Administrador.']);
        exit;
      }
    }
  }

  // ... código con la validación de nombre/email vacíos...
  if (empty($nombre) || empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Nombre y correo son obligatorios.']);
    exit;
  }

  // VALIDACIÓN ANTI-DUPLICADOS (Universal para Crear y Editar)
  $stmtCheck = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? AND id != ?");
  $stmtCheck->execute([$email, $id]);
  if ($stmtCheck->rowCount() > 0) {
    echo json_encode(['success' => false, 'message' => 'Ese correo electrónico ya está registrado en otra cuenta.']);
    exit;
  }

  if ($id > 0) {
    if (!empty($password)) {
      $hash = password_hash($password, PASSWORD_DEFAULT);
      // Añadimos permisos=? en el UPDATE
      $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, primer_apellido=?, segundo_apellido=?, email=?, $col_pass=?, rol=?, hotel_base_id=?, estatus=?, permisos=? WHERE id=?");
      $stmt->execute([$nombre, $primer_apellido, $segundo_apellido, $email, $hash, $rol, $hotel_base_id, $estatus, $permisos_json, $id]);
    } else {
      // Añadimos permisos=? en el UPDATE
      $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, primer_apellido=?, segundo_apellido=?, email=?, rol=?, hotel_base_id=?, estatus=?, permisos=? WHERE id=?");
      $stmt->execute([$nombre, $primer_apellido, $segundo_apellido, $email, $rol, $hotel_base_id, $estatus, $permisos_json, $id]);
    }
    echo json_encode(['success' => true, 'message' => 'Empleado actualizado con éxito.']);
  } else {
    $hash = password_hash(empty($password) ? '123456' : $password, PASSWORD_DEFAULT);
    // Añadimos permisos en el INSERT
    $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, primer_apellido, segundo_apellido, email, $col_pass, rol, hotel_base_id, estatus, permisos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$nombre, $primer_apellido, $segundo_apellido, $email, $hash, $rol, $hotel_base_id, $estatus, $permisos_json]);
    echo json_encode(['success' => true, 'message' => 'Nuevo empleado creado con éxito.']);
  }
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $e->getMessage()]);
}
