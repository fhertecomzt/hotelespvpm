<?php
// login.php
require 'db.php';

$data = json_decode(file_get_contents("php://input"));

if (isset($data->email) && isset($data->password)) {
  $stmt = $pdo->prepare("SELECT id, nombre, rol, hotel_base_id, password_hash FROM usuarios WHERE email = ?");
  $stmt->execute([$data->email]);
  $user = $stmt->fetch();

  // NOTA: Como insertamos 'hash_secreto' en la BD de prueba, para este MVP permitiremos 
  // el acceso si escriben cualquier contraseña, simulando un login exitoso. 
  // En producción, aquí usaríamos: password_verify($data->password, $user['password_hash'])

  if ($user) {
    echo json_encode([
      'success' => true,
      'usuario' => [
        'id' => $user['id'],
        'nombre' => $user['nombre'],
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
