<?php
// jwt_helper.php

// 1. Mandamos llamar la llave secreta desde el archivo protegido
require_once 'config_keys.php';

function generarJWT($payload)
{
  // 1. Cabecera (Header)
  $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
  $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));

  // 2. Carga útil (Payload - Los datos del usuario)
  $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));

  // 3. Firma (Signature)
  $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, SECRET_KEY, true);
  $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

  // Retornamos el Token completo
  return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function validarJWT($token)
{
  $partes = explode('.', $token);
  if (count($partes) !== 3) return false;

  list($header, $payload, $signature) = $partes;

  // Recalculamos la firma para ver si coincide
  $signatureValida = hash_hmac('sha256', $header . "." . $payload, SECRET_KEY, true);
  $base64UrlSignatureValida = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signatureValida));

  // Verificamos matemáticamente que nadie haya alterado el token
  if (hash_equals($base64UrlSignatureValida, $signature)) {
    return json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
  }

  return false;
}
