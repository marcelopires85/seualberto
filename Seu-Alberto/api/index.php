<?php
declare(strict_types=1);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

$storageDirectory = __DIR__ . '/storage';
$storePath = $storageDirectory . '/store.json';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Content-Type: application/json; charset=utf-8');
session_set_cookie_params([
    'httponly' => true,
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Lax',
]);
session_start();

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status): never
{
    respond(['message' => $message, 'data' => null], $status);
}

function jsonInput(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') === false) {
        return $_POST;
    }

    $decoded = json_decode(file_get_contents('php://input'), true);
    if (!is_array($decoded)) {
        fail('O corpo da solicitação é inválido.', 400);
    }
    return $decoded;
}

function textValue(array $input, string $key, int $maxLength): string
{
    $value = trim((string)($input[$key] ?? ''));
    $characterCount = preg_match_all('/./us', $value, $matches);
    if ($value === '' || $characterCount === false || $characterCount > $maxLength) {
        fail("O campo {$key} é obrigatório e deve ter até {$maxLength} caracteres.", 422);
    }
    return $value;
}

function defaultAnimals(): array
{
    $animals = [];
    for ($number = 1; $number <= 6; $number++) {
        $animals[] = [
            'id' => "demo-{$number}",
            'name' => "Pet {$number}",
            'age' => 'Idade a confirmar',
            'physicalTraits' => 'Porte e características físicas em atualização.',
            'temperament' => 'Estamos conhecendo sua personalidade.',
            'image' => "demo:dog{$number}",
            'imageAlt' => "Cão disponível para adoção, perfil demonstrativo {$number}",
            'likes' => [],
            'comments' => [],
            'shares' => 0,
        ];
    }
    return $animals;
}

function withStore(string $storePath, string $storageDirectory, callable $operation): mixed
{
    if (!is_dir($storageDirectory) && !mkdir($storageDirectory, 0770, true) && !is_dir($storageDirectory)) {
        throw new RuntimeException('Não foi possível criar a pasta privada de armazenamento.');
    }

    $lock = fopen($storageDirectory . '/store.lock', 'c+');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('Não foi possível bloquear o armazenamento.');
    }

    try {
        if (is_file($storePath)) {
            $contents = file_get_contents($storePath);
            $store = is_string($contents) ? json_decode($contents, true) : null;
            if (!is_array($store) || !isset($store['animals'], $store['adoptions'])) {
                throw new RuntimeException('O arquivo de armazenamento está corrompido.');
            }
        } else {
            $store = ['animals' => defaultAnimals(), 'adoptions' => []];
        }

        $result = $operation($store);
        $encoded = json_encode(
            $store,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
        if (!is_string($encoded) || file_put_contents($storePath, $encoded, LOCK_EX) === false) {
            throw new RuntimeException('Não foi possível salvar os dados.');
        }
        return $result;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function requireCsrf(): array
{
    $input = jsonInput();
    $sentToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $input['csrfToken'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (!is_string($sentToken) || !is_string($sessionToken) || $sessionToken === '' ||
        !hash_equals($sessionToken, $sentToken)) {
        fail('A sessão expirou. Atualize a página e tente novamente.', 403);
    }
    return $input;
}

function requireAdmin(): void
{
    if (empty($_SESSION['admin_authenticated'])) {
        fail('Faça login para continuar.', 401);
    }
}

function imageUrl(string $filename): string
{
    return '/api/index.php?action=image&name=' . rawurlencode($filename);
}

function removeStoredImage(string $image, string $storageDirectory): void
{
    $query = parse_url($image, PHP_URL_QUERY);
    if (!is_string($query)) {
        return;
    }
    parse_str($query, $parameters);
    $filename = (string)($parameters['name'] ?? '');
    if (preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/', $filename)) {
        $path = $storageDirectory . '/uploads/' . $filename;
        if (is_file($path)) {
            unlink($path);
        }
    }
}

$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($action === 'image' && $method === 'GET') {
        $filename = (string)($_GET['name'] ?? '');
        if (!preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/', $filename)) {
            fail('Imagem não encontrada.', 404);
        }
        $path = $storageDirectory . '/uploads/' . $filename;
        if (!is_file($path)) {
            fail('Imagem não encontrada.', 404);
        }
        $imageInfo = getimagesize($path);
        if ($imageInfo === false || !in_array($imageInfo['mime'], ['image/jpeg', 'image/png', 'image/webp'], true)) {
            fail('Imagem não encontrada.', 404);
        }
        header_remove('Content-Type');
        header('Content-Type: ' . $imageInfo['mime']);
        header('Cache-Control: public, max-age=86400');
        readfile($path);
        exit;
    }

    if ($action === 'csrf' && $method === 'GET') {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        respond(['data' => ['token' => $_SESSION['csrf_token']]]);
    }

    if ($action === 'animals' && $method === 'GET') {
        $animals = withStore($storePath, $storageDirectory, static fn(array &$store): array => $store['animals']);
        respond(['data' => $animals]);
    }

    if ($action === 'admin-state' && $method === 'GET') {
        respond(['data' => ['authenticated' => !empty($_SESSION['admin_authenticated'])]]);
    }

    if ($action === 'login' && $method === 'POST') {
        $input = requireCsrf();
        $email = filter_var(trim((string)($input['email'] ?? '')), FILTER_VALIDATE_EMAIL);
        $adminEmail = getenv('ADMIN_EMAIL');
        $passwordHash = getenv('ADMIN_PASSWORD_HASH');
        $password = (string)($input['password'] ?? '');
        if (!$adminEmail || !$passwordHash) {
            fail('O acesso administrativo ainda não foi configurado no servidor.', 503);
        }
        if (!is_string($email) || !hash_equals(strtolower($adminEmail), strtolower($email)) ||
            !password_verify($password, $passwordHash)) {
            fail('E-mail ou senha incorretos.', 401);
        }
        session_regenerate_id(true);
        $_SESSION['admin_authenticated'] = true;
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        respond(['data' => ['authenticated' => true]]);
    }

    if ($action === 'logout' && $method === 'POST') {
        requireCsrf();
        $_SESSION = [];
        session_destroy();
        respond(['data' => ['authenticated' => false]]);
    }

    if ($action === 'adoption' && $method === 'POST') {
        $input = requireCsrf();
        $name = textValue($input, 'name', 120);
        $email = filter_var(trim((string)($input['email'] ?? '')), FILTER_VALIDATE_EMAIL);
        $age = filter_var($input['age'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 120]]);
        if (!is_string($email) || $age === false) {
            fail('Informe um e-mail válido e uma idade válida.', 422);
        }
        $animalId = textValue($input, 'animalId', 80);
        $adoption = withStore($storePath, $storageDirectory, static function (array &$store) use (
            $animalId,
            $name,
            $age,
            $email,
            $input
        ): array {
            $animal = null;
            foreach ($store['animals'] as $candidate) {
                if ($candidate['id'] === $animalId) {
                    $animal = $candidate;
                    break;
                }
            }
            if ($animal === null) {
                fail('Este animal não está mais disponível.', 404);
            }

            $request = [
                'id' => bin2hex(random_bytes(16)),
                'animalName' => $animal['name'],
                'name' => $name,
                'age' => $age,
                'city' => textValue($input, 'city', 100),
                'neighborhood' => textValue($input, 'neighborhood', 100),
                'email' => $email,
                'phone' => textValue($input, 'phone', 30),
                'status' => 'pending',
                'createdAt' => gmdate(DATE_ATOM),
            ];
            $store['adoptions'][] = $request;
            return $request;
        });

        $mailTo = getenv('MAIL_TO');
        $mailFrom = getenv('MAIL_FROM');
        $mailSent = false;
        if ($mailTo && filter_var($mailTo, FILTER_VALIDATE_EMAIL) &&
            $mailFrom && filter_var($mailFrom, FILTER_VALIDATE_EMAIL)) {
            $subject = '=?UTF-8?B?' . base64_encode('Interesse em adoção: ' . $adoption['animalName']) . '?=';
            $body = implode("\n", [
                'Novo formulário de interesse em adoção',
                '',
                'Animal: ' . $adoption['animalName'],
                'Nome: ' . $adoption['name'],
                'Idade: ' . $adoption['age'],
                'Cidade: ' . $adoption['city'],
                'Bairro: ' . $adoption['neighborhood'],
                'E-mail: ' . $adoption['email'],
                'Telefone: ' . $adoption['phone'],
            ]);
            $headers = "From: {$mailFrom}\r\nReply-To: {$adoption['email']}\r\nContent-Type: text/plain; charset=UTF-8";
            $mailSent = mail($mailTo, $subject, $body, $headers);
        }
        respond([
            'data' => ['id' => $adoption['id']],
            'mailSent' => $mailSent,
            'message' => $mailSent
                ? 'Interesse salvo e enviado ao abrigo.'
                : 'Interesse salvo, mas o e-mail não foi enviado. Avise a equipe do abrigo.',
        ]);
    }

    if ($action === 'like' || $action === 'comment' || $action === 'share') {
        if ($method !== 'POST') {
            fail('Método não permitido.', 405);
        }
        $input = requireCsrf();
        $animalId = textValue($input, 'animalId', 80);
        $animal = withStore($storePath, $storageDirectory, static function (array &$store) use (
            $action,
            $animalId,
            $input
        ): array {
            foreach ($store['animals'] as &$candidate) {
                if ($candidate['id'] !== $animalId) {
                    continue;
                }
                if ($action === 'like') {
                    $visitorId = textValue($input, 'visitorId', 80);
                    if (!in_array($visitorId, $candidate['likes'], true)) {
                        $candidate['likes'][] = $visitorId;
                    } else {
                        $candidate['likes'] = array_values(array_diff($candidate['likes'], [$visitorId]));
                    }
                } elseif ($action === 'comment') {
                    $candidate['comments'][] = [
                        'id' => bin2hex(random_bytes(16)),
                        'name' => textValue($input, 'name', 80),
                        'message' => textValue($input, 'message', 1000),
                        'createdAt' => gmdate(DATE_ATOM),
                    ];
                } else {
                    $candidate['shares']++;
                }
                $updated = $candidate;
                unset($candidate);
                return $updated;
            }
            unset($candidate);
            fail('Animal não encontrado.', 404);
        });
        respond(['data' => $animal]);
    }

    if (str_starts_with($action, 'delete-') || str_starts_with($action, 'clear-') ||
        str_starts_with($action, 'update-') || $action === 'save-animal' || $action === 'adoptions') {
        requireAdmin();
    }

    if ($action === 'adoptions' && $method === 'GET') {
        $adoptions = withStore($storePath, $storageDirectory, static fn(array &$store): array => $store['adoptions']);
        respond(['data' => $adoptions]);
    }

    if ($action === 'save-animal' && $method === 'POST') {
        $input = requireCsrf();
        $name = textValue($input, 'name', 100);
        $age = textValue($input, 'age', 50);
        $physicalTraits = textValue($input, 'physicalTraits', 500);
        $temperament = textValue($input, 'temperament', 500);
        $imageAlt = textValue($input, 'imageAlt', 200);
        $id = trim((string)($input['id'] ?? ''));
        $uploadedImage = null;
        if (isset($_FILES['imageFile']) && $_FILES['imageFile']['error'] !== UPLOAD_ERR_NO_FILE) {
            $file = $_FILES['imageFile'];
            if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] > MAX_IMAGE_SIZE) {
                fail('A imagem deve ter até 5 MB.', 422);
            }
            $imageInfo = getimagesize($file['tmp_name']);
            $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
            $mime = is_array($imageInfo) ? $imageInfo['mime'] : '';
            if (!isset($extensions[$mime])) {
                fail('Envie uma imagem JPG, PNG ou WebP válida.', 422);
            }
            $uploadDirectory = $storageDirectory . '/uploads';
            if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0770, true) && !is_dir($uploadDirectory)) {
                throw new RuntimeException('Não foi possível criar a pasta privada de imagens.');
            }
            $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
            if (!move_uploaded_file($file['tmp_name'], $uploadDirectory . '/' . $filename)) {
                throw new RuntimeException('Não foi possível salvar a imagem enviada.');
            }
            $uploadedImage = imageUrl($filename);
        }

        $previousImage = null;
        $result = withStore($storePath, $storageDirectory, static function (array &$store) use (
            $id,
            $name,
            $age,
            $physicalTraits,
            $temperament,
            $imageAlt,
            $input,
            $uploadedImage,
            &$previousImage
        ): array {
            $existingIndex = null;
            foreach ($store['animals'] as $index => $candidate) {
                if ($candidate['id'] === $id && $id !== '') {
                    $existingIndex = $index;
                    break;
                }
            }
            $oldAnimal = $existingIndex === null ? null : $store['animals'][$existingIndex];
            $previousImage = $oldAnimal['image'] ?? null;
            $image = $uploadedImage ?? (string)($input['image'] ?? $oldAnimal['image'] ?? '');
            if ($image === '') {
                fail('Selecione uma foto para o animal.', 422);
            }
            $animal = [
                'id' => $oldAnimal['id'] ?? bin2hex(random_bytes(16)),
                'name' => $name,
                'age' => $age,
                'physicalTraits' => $physicalTraits,
                'temperament' => $temperament,
                'image' => $image,
                'imageAlt' => $imageAlt,
                'likes' => $oldAnimal['likes'] ?? [],
                'comments' => $oldAnimal['comments'] ?? [],
                'shares' => $oldAnimal['shares'] ?? 0,
            ];
            if ($existingIndex === null) {
                $store['animals'][] = $animal;
            } else {
                $store['animals'][$existingIndex] = $animal;
            }
            return $animal;
        });
        if ($uploadedImage !== null && is_string($previousImage)) {
            removeStoredImage($previousImage, $storageDirectory);
        }
        respond(['data' => $result]);
    }

    if ($action === 'delete-animal' && $method === 'POST') {
        $input = requireCsrf();
        $animalId = textValue($input, 'animalId', 80);
        $animal = withStore($storePath, $storageDirectory, static function (array &$store) use ($animalId): array {
            foreach ($store['animals'] as $index => $candidate) {
                if ($candidate['id'] === $animalId) {
                    array_splice($store['animals'], $index, 1);
                    return $candidate;
                }
            }
            fail('Animal não encontrado.', 404);
        });
        removeStoredImage($animal['image'], $storageDirectory);
        respond(['data' => $animal]);
    }

    if ($action === 'delete-comment' && $method === 'POST') {
        $input = requireCsrf();
        $animalId = textValue($input, 'animalId', 80);
        $commentId = textValue($input, 'commentId', 80);
        $animal = withStore($storePath, $storageDirectory, static function (array &$store) use ($animalId, $commentId): array {
            foreach ($store['animals'] as &$candidate) {
                if ($candidate['id'] === $animalId) {
                    $candidate['comments'] = array_values(array_filter(
                        $candidate['comments'],
                        static fn(array $comment): bool => $comment['id'] !== $commentId
                    ));
                    $updated = $candidate;
                    unset($candidate);
                    return $updated;
                }
            }
            unset($candidate);
            fail('Animal não encontrado.', 404);
        });
        respond(['data' => $animal]);
    }

    if ($action === 'clear-interactions' && $method === 'POST') {
        $input = requireCsrf();
        $animalId = textValue($input, 'animalId', 80);
        $animal = withStore($storePath, $storageDirectory, static function (array &$store) use ($animalId): array {
            foreach ($store['animals'] as &$candidate) {
                if ($candidate['id'] === $animalId) {
                    $candidate['likes'] = [];
                    $candidate['comments'] = [];
                    $candidate['shares'] = 0;
                    $updated = $candidate;
                    unset($candidate);
                    return $updated;
                }
            }
            unset($candidate);
            fail('Animal não encontrado.', 404);
        });
        respond(['data' => $animal]);
    }

    if ($action === 'update-adoption' && $method === 'POST') {
        $input = requireCsrf();
        $id = textValue($input, 'id', 80);
        $status = (string)($input['status'] ?? '');
        if (!in_array($status, ['pending', 'contacted'], true)) {
            fail('Status inválido.', 422);
        }
        $adoption = withStore($storePath, $storageDirectory, static function (array &$store) use ($id, $status): array {
            foreach ($store['adoptions'] as &$candidate) {
                if ($candidate['id'] === $id) {
                    $candidate['status'] = $status;
                    $updated = $candidate;
                    unset($candidate);
                    return $updated;
                }
            }
            unset($candidate);
            fail('Pedido de adoção não encontrado.', 404);
        });
        respond(['data' => $adoption]);
    }

    fail('Ação não encontrada.', 404);
} catch (Throwable $error) {
    error_log('Seu Alberto API: ' . $error->getMessage());
    fail('Erro interno ao processar a solicitação.', 500);
}
