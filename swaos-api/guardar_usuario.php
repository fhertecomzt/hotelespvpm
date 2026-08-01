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
      $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, primer_apellido=?, segundo_apellido=?, email=?, $col_pass=?, rol=?, hotel_base_id=?, estatus=? WHERE id=?");
      $stmt->execute([$nombre, $primer_apellido, $segundo_apellido, $email, $hash, $rol, $hotel_base_id, $estatus, $id]);
    } else {
      $stmt = $pdo->prepare("UPDATE usuarios SET nombre=?, primer_apellido=?, segundo_apellido=?, email=?, rol=?, hotel_base_id=?, estatus=? WHERE id=?");
      $stmt->execute([$nombre, $primer_apellido, $segundo_apellido, $email, $rol, $hotel_base_id, $estatus, $id]);
    }
    echo json_encode(['success' => true, 'message' => 'Empleado actualizado con éxito.']);
  } else {
    $hash = password_hash(empty($password) ? '123456' : $password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, primer_apellido, segundo_apellido, email, $col_pass, rol, hotel_base_id, estatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$nombre, $primer_apellido, $segundo_apellido, $email, $hash, $rol, $hotel_base_id, $estatus]);
    echo json_encode(['success' => true, 'message' => 'Nuevo empleado creado con éxito.']);
  }
} catch (Exception $e) {
  echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $e->getMessage()]);
}