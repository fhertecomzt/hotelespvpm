<?php
// actualizar_estatus.php
require 'db.php';

// Leer el JSON entrante
$data = json_decode(file_get_contents("php://input"));

if (isset($data->habitacionId) && isset($data->nuevoEstatus)) {
  // Limpiar el prefijo 'h' que usamos en React
  $habitacion_id = str_replace('h', '', $data->habitacionId);
  $nuevo_estatus = $data->nuevoEstatus;

  // Actualizar el estatus operativo (TU CÓDIGO ORIGINAL INTOCABLE)
  $stmt = $pdo->prepare("UPDATE habitaciones SET estatus_operativo = ? WHERE id = ?");

  if ($stmt->execute([$nuevo_estatus, $habitacion_id])) {

    // =========================================================================
    // INYECCIÓN SILENCIOSA PARA AUDITORÍA DE TIEMPOS (bitacora_limpieza)
    // Si esto falla por alguna razón externa, se ignora en silencio y NUNCA
    // afectará la respuesta de éxito que Recepción espera recibir.
    // =========================================================================
    try {
      // Obtener ID del usuario que hace la acción (o 1 por defecto para no romper llaves foráneas)
      $usuario_id = isset($data->usuarioId) ? intval($data->usuarioId) : (isset($data->usuario_id) ? intval($data->usuario_id) : 1);
      if ($usuario_id <= 0) $usuario_id = 1;

      // Obtener un ID de zona válido por defecto de la base de datos
      $stmtZDefault = $pdo->query("SELECT id FROM zonas ORDER BY id ASC LIMIT 1");
      $zona_id = intval($stmtZDefault->fetchColumn() ?: 1);

      // Si la habitación tiene una zona asociada, la usamos
      try {
        $stmtZHab = $pdo->prepare("SELECT zona_id FROM habitaciones WHERE id = ?");
        $stmtZHab->execute([$habitacion_id]);
        $resZ = $stmtZHab->fetchColumn();
        if ($resZ && intval($resZ) > 0) {
          $zona_id = intval($resZ);
        }
      } catch (Exception $e) {
      }

      $fecha_hoy = date('Y-m-d');

      // =========================================================================
      // DETECCIÓN INTELIGENTE DE LA CAMARISTA REAL
      // =========================================================================
      $camarista_id_final = $usuario_id;
      try {
        // Consultamos qué rol tiene el usuario que presionó el botón
        $stmtRol = $pdo->prepare("SELECT rol FROM usuarios WHERE id = ?");
        $stmtRol->execute([$usuario_id]);
        $rol = strtolower(trim($stmtRol->fetchColumn() ?: ''));

        // Si quien hizo clic NO es camarista (ej. Fernando Rentería, Recepción o ID 1 por defecto),
        // buscamos en MySQL qué camarista está asignada a esa zona para darle el crédito a ella.
        if ($rol !== 'camarista') {
          $stmtCam = $pdo->prepare("SELECT camarista_id FROM zonas WHERE id = ? AND camarista_id > 0 LIMIT 1");
          $stmtCam->execute([$zona_id]);
          $camZona = $stmtCam->fetchColumn();
          if ($camZona && intval($camZona) > 0) {
            $camarista_id_final = intval($camZona);
          }
        }
      } catch (Exception $eRol) {
      }
      // =========================================================================

      // Lógica del temporizador de limpieza (usando ahora $camarista_id_final)
      if ($nuevo_estatus === 'En Proceso' || $nuevo_estatus === 'en_proceso' || $nuevo_estatus === 'Limpiando') {
        $sqlInsert = "INSERT INTO bitacora_limpieza (habitacion_id, usuario_id, zona_id_historico, fecha, hora_inicio, estatus_final) VALUES (?, ?, ?, ?, NOW(), 'En Proceso')";
        $stmtInsert = $pdo->prepare($sqlInsert);
        $stmtInsert->execute([$habitacion_id, $camarista_id_final, $zona_id, $fecha_hoy]);
      } elseif ($nuevo_estatus === 'Limpia' || $nuevo_estatus === 'limpia' || $nuevo_estatus === 'Terminada') {
        $stmtBuscar = $pdo->prepare("SELECT id, hora_inicio FROM bitacora_limpieza WHERE habitacion_id = ? AND hora_fin IS NULL ORDER BY id DESC LIMIT 1");
        $stmtBuscar->execute([$habitacion_id]);
        $registroAbierto = $stmtBuscar->fetch(PDO::FETCH_ASSOC);

        if ($registroAbierto) {
          $bitacora_id = $registroAbierto['id'];
          $sqlUpdate = "UPDATE bitacora_limpieza SET hora_fin = NOW(), duracion_minutos = TIMESTAMPDIFF(MINUTE, hora_inicio, NOW()), estatus_final = 'Limpia' WHERE id = ?";
          $stmtUpdate = $pdo->prepare($sqlUpdate);
          $stmtUpdate->execute([$bitacora_id]);
        } else {
          $sqlInsert = "INSERT INTO bitacora_limpieza (habitacion_id, usuario_id, zona_id_historico, fecha, hora_inicio, hora_fin, duracion_minutos, estatus_final) VALUES (?, ?, ?, ?, NOW(), NOW(), 1, 'Limpia')";
          $stmtInsert = $pdo->prepare($sqlInsert);
          $stmtInsert->execute([$habitacion_id, $camarista_id_final, $zona_id, $fecha_hoy]);
        }
      }
    } catch (Exception $eBitacora) {
      // Bloque de absorción de errores: el flujo continúa normalmente
    }
    // =========================================================================

    // Respuesta original intacta para que React en Recepción no se congele
    echo json_encode(['success' => true, 'message' => 'Estatus actualizado']);
  } else {
    echo json_encode(['success' => false, 'message' => 'Error al actualizar el estatus']);
  }
} else {
  echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
}
