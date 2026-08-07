<?php
// login.php
require 'db.php';

$data = json_decode(file_get_contents("php://input"));

if (isset($data->email) && isset($data->password)) {
  // 1. Agregamos 'permisos' a la consulta SQL
  $stmt = $pdo->prepare("SELECT id, nombre, primer_apellido, segundo_apellido, rol, hotel_base_id, password_hash, permisos FROM usuarios WHERE email = ?");
  $stmt->execute([$data->email]);

  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($user) {
    if (password_verify($data->password, $user['password_hash'])) {

      // 2. Desempaquetamos los permisos JSON
      $permisos_arreglo = [];
      if (!empty($user['permisos'])) {
        $permisos_arreglo = json_decode($user['permisos'], true);
        if (!is_array($permisos_arreglo)) {
          $permisos_arreglo = [];
        }
      }

      // 3. Enviamos los datos con los permisos incluidos
      echo json_encode([
        'success' => true,
        'usuario' => [
          'id' => $user['id'],
          'nombre' => $user['nombre'],
          'primer_apellido' => $user['primer_apellido'],
          'segundo_apellido' => $user['segundo_apellido'] ? $user['segundo_apellido'] : '',
          'rol' => $user['rol'],
          'hotel_id' => $user['hotel_base_id'],
          'permisos' => $permisos_arreglo // Inyectamos los permisos aquí
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
