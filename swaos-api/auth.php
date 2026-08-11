<?php
// auth.php
// Este archivo actúa como middleware (guardia) para proteger cualquier endpoint.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
  http_response_code(200);
  exit;
}

require_once 'jwt_helper.php';

$authHeader = '';
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
  $authHeader = trim($_SERVER['HTTP_AUTHORIZATION']);
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
  $authHeader = trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
} elseif (function_exists('apache_request_headers')) {
  $requestHeaders = apache_request_headers();
  $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
  if (isset($requestHeaders['Authorization'])) {
    $authHeader = trim($requestHeaders['Authorization']);
  }
}

if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
  echo json_encode(['success' => false, 'message' => 'Acceso denegado. No hay token de autenticación.']);
  exit;
}

$token = $matches[1];
$datosToken = validarJWT($token);

if (!$datosToken || $datosToken['exp'] < time()) {
  echo json_encode(['success' => false, 'message' => 'Token inválido o expirado. Inicia sesión nuevamente.']);
  exit;
}

// Si llega hasta aquí, el token es válido y $datosToken está disponible para el archivo que lo llame.
