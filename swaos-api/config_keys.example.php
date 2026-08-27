<?php
// config_keys.example.php
// Renombra este archivo a config_keys.php y coloca tus accesos reales

// Llave secreta de Cloudflare Turnstile
define('CF_SECRET_KEY', 'AquiVaLaClaveCloudflareSecreta');

//Llave encriptar passwords de login
define('SECRET_KEY', 'PON_TU_LLAVE_SECRETA_AQUI');

//Credenciales para base de datos
define('DB_HOST', 'localhost');
define('DB_NAME', 'nombre_bd_produccion');
define('DB_USER', 'usuario_bd_produccion');
define('DB_PASS', 'password_bd_produccion');
