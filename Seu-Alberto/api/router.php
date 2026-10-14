<?php
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if ($path === '/api/index.php') {
    require __DIR__ . '/index.php';
}
if (is_string($path) && str_starts_with($path, '/api/')) {
    http_response_code(404);
    exit;
}
return false;
