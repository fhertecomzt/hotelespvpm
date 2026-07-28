<?php
// login.php
require 'db.php';

$data = json_decode(file_get_contents("php://input"));

if (isset($data->email) && isset($data->password)) {
  // Agregamos primer_apellido y segundo_apellido a la consulta
  $stmt = $pdo->prepare("SELECT id, nombre, primer_apellido, segundo_apellido, rol, hotel_base_id, password_hash FROM usuarios WHERE email = ?");
  $stmt->execute([$data->email]);
  $user = $stmt->fetch();

  if ($user) {
    echo json_encode([
      'success' => true,
      'usuario' => [
        'id' => $user['id'],
        'nombre' => $user['nombre'],
        'primer_apellido' => $user['primer_apellido'],
        'segundo_apellido' => $user['segundo_apellido'] ? $user['segundo_apellido'] : '',
        'rol' => $user['rol'],
        'hotel_id' => $user['hotel_base_id']
      ]
    ]);
  } else {
    echo json_encode(['success' => false, 'message' => 'El correo ingresado no existe en el sistema.']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'Faltan credenciales']);
}
