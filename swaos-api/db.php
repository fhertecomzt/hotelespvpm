<?php
// db.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Manejar preflight requests de React
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
  http_response_code(200);
  exit();
}

// 1. Mandamos llamar la bóveda de secretos
require_once 'config_keys.php';

$charset = 'utf8mb4';

// =========================================================================
// DETECCIÓN AUTOMÁTICA DE ENTORNO
// =========================================================================
if ($_SERVER['SERVER_NAME'] === 'localhost' || $_SERVER['SERVER_NAME'] === '127.0.0.1') {
  // ENTORNO LOCAL (XAMPP)
  $host = 'localhost';
  $db   = 'hotelespvpm_swaos_db';
  $user = 'root';
  $pass = '';
} else {
  // ENTORNO PRODUCCIÓN (Subdominio en tu Hosting)
  // Usamos las constantes que viven seguras en config_keys.php
  $host = DB_HOST;
  $db   = DB_NAME;
  $user = DB_USER;
  $pass = DB_PASS;
}
// =========================================================================

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
  PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
  $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
  echo json_encode(['error' => 'Error de conexión: ' . $e->getMessage()]);
  exit();
}
