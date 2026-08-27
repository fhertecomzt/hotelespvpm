<?php
// login.php
require 'db.php';
require 'jwt_helper.php';
require_once 'config_keys.php';

$data = json_decode(file_get_contents("php://input"));

if (isset($data->email) && isset($data->password)) {

  // NUEVA SECCIÓN: VALIDACIÓN DE CLOUDFLARE TURNSTILE
  if (!isset($data->cf_turnstile_response) || empty($data->cf_turnstile_response)) {
    echo json_encode(['success' => false, 'message' => 'Falta el token de seguridad anti-bots.']);
    exit; // Detenemos todo, ni siquiera tocamos la base de datos
  }

  $turnstile_token = $data->cf_turnstile_response;

  // Llave SECRETA de prueba de Cloudflare (Hace par con la llave pública de React)
  // IMPORTANTE: Cuando pases a producción, Cloudflare te dará una llave secreta real.
  // Llave SECRETA que viene de nuestro config
  $secret_key = CF_SECRET_KEY;

  // Hacemos una petición desde nuestro servidor hacia los servidores de Cloudflare
  $verify_url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $verify_url);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'secret' => $secret_key,
    'response' => $turnstile_token
  ]));
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

  $cloudflare_response = curl_exec($ch);
  curl_close($ch);

  $cloudflare_data = json_decode($cloudflare_response);

  // Si Cloudflare dice que la prueba falló, bloqueamos al intruso
  if (!$cloudflare_data->success) {
    echo json_encode(['success' => false, 'message' => 'Validación de seguridad fallida. Eres un bot o tu sesión expiró.']);
    exit;
  }

  // FIN DE LA SECCIÓN DE SEGURIDAD CLOUDFLARE. Si llegamos aquí, ES UN HUMANO.

  // 1. Buscamos al usuario incluyendo las nuevas columnas de seguridad
  $stmt = $pdo->prepare("SELECT id, nombre, primer_apellido, segundo_apellido, rol, hotel_base_id, password_hash, permisos, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE email = ?");
  $stmt->execute([$data->email]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($user) {
    // 2. Verificamos si la cuenta está actualmente bloqueada
    if ($user['bloqueado_hasta'] !== null) {
      $fecha_bloqueo = strtotime($user['bloqueado_hasta']);
      $ahora = time();

      if ($ahora < $fecha_bloqueo) {
        $minutos_restantes = ceil(($fecha_bloqueo - $ahora) / 60);
        echo json_encode(['success' => false, 'message' => "Cuenta bloqueada por seguridad. Intenta de nuevo en $minutos_restantes minuto(s)."]);
        exit;
      }
    }

    // 3. Verificamos la contraseña
    if (password_verify($data->password, $user['password_hash'])) {

      // ¡ÉXITO! Reseteamos los intentos fallidos a 0
      $reset_stmt = $pdo->prepare("UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?");
      $reset_stmt->execute([$user['id']]);

      $permisos_arreglo = [];
      if (!empty($user['permisos'])) {
        $permisos_arreglo = json_decode($user['permisos'], true);
        if (!is_array($permisos_arreglo)) {
          $permisos_arreglo = [];
        }
      }

      $payload = [
        'user_id' => $user['id'],
        'rol' => $user['rol'],
        'hotel_id' => $user['hotel_base_id'],
        'exp' => time() + (86400 * 7)
      ];

      $token_seguro = generarJWT($payload);

      echo json_encode([
        'success' => true,
        'token' => $token_seguro,
        'usuario' => [
          'id' => $user['id'],
          'nombre' => $user['nombre'],
          'primer_apellido' => $user['primer_apellido'],
          'segundo_apellido' => $user['segundo_apellido'] ? $user['segundo_apellido'] : '',
          'rol' => $user['rol'],
          'hotel_id' => $user['hotel_base_id'],
          'permisos' => $permisos_arreglo
        ]
      ]);
    } else {
      // CONTRASEÑA INCORRECTA: Aumentamos el contador de errores
      $intentos = $user['intentos_fallidos'] + 1;
      $bloqueado = null;

      // Si llega a 5 intentos, le sumamos 15 minutos al reloj actual
      if ($intentos >= 5) {
        $bloqueado = date('Y-m-d H:i:s', strtotime('+15 minutes'));
      }

      $update_stmt = $pdo->prepare("UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?");
      $update_stmt->execute([$intentos, $bloqueado, $user['id']]);

      if ($intentos >= 5) {
        echo json_encode(['success' => false, 'message' => 'Demasiados intentos fallidos. Tu cuenta ha sido bloqueada por 15 minutos.']);
      } else {
        $intentos_restantes = 5 - $intentos;
        echo json_encode(['success' => false, 'message' => "Contraseña incorrecta. Te quedan $intentos_restantes intento(s)."]);
      }
    }
  } else {
    // Para no darle pistas a los hackers, usamos un mensaje genérico
    echo json_encode(['success' => false, 'message' => 'Credenciales incorrectas o el usuario no existe.']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'Faltan credenciales.']);
}
