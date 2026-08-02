<?php
// login.php
require 'db.php';

$data = json_decode(file_get_contents("php://input"));

if (isset($data->email) && isset($data->password)) {
  // 1. Extraemos los datos del usuario, incluyendo su contraseña encriptada
  $stmt = $pdo->prepare("SELECT id, nombre, primer_apellido, segundo_apellido, rol, hotel_base_id, password_hash FROM usuarios WHERE email = ?");
  $stmt->execute([$data->email]);

  // Usamos PDO::FETCH_ASSOC para traer un arreglo limpio
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  // 2. Verificamos si el correo existe en la base de datos
  if ($user) {

    // 3. Verificamos si la contraseña coincide con el hash encriptado
    if (password_verify($data->password, $user['password_hash'])) {

      // Contraseña correcta: Damos acceso al sistema
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
      // Contraseña incorrecta: Bloqueamos el acceso
      echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta.']);
    }
  } else {
    // El correo no existe
    echo json_encode(['success' => false, 'message' => 'El correo ingresado no existe en el sistema.']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'Faltan credenciales.']);
}
