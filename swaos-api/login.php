<?php
// login.php
require 'db.php';
require 'jwt_helper.php'; // <-- 1. Importamos nuestro nuevo motor JWT

$data = json_decode(file_get_contents("php://input"));

if (isset($data->email) && isset($data->password)) {
  $stmt = $pdo->prepare("SELECT id, nombre, primer_apellido, segundo_apellido, rol, hotel_base_id, password_hash, permisos FROM usuarios WHERE email = ?");
  $stmt->execute([$data->email]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($user) {
    if (password_verify($data->password, $user['password_hash'])) {

      $permisos_arreglo = [];
      if (!empty($user['permisos'])) {
        $permisos_arreglo = json_decode($user['permisos'], true);
        if (!is_array($permisos_arreglo)) {
          $permisos_arreglo = [];
        }
      }

      // 2. Creamos la carga útil del Token con los datos esenciales
      $payload = [
        'user_id' => $user['id'],
        'rol' => $user['rol'],
        'hotel_id' => $user['hotel_base_id'],
        'exp' => time() + (86400 * 7) // El token expira en 7 días
      ];

      // 3. Generamos el JWT
      $token_seguro = generarJWT($payload);

      echo json_encode([
        'success' => true,
        'token' => $token_seguro, // <-- 4. Se lo mandamos a React
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
      echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta.']);
    }
  } else {
    echo json_encode(['success' => false, 'message' => 'El correo ingresado no existe en el sistema.']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'Faltan credenciales.']);
}
