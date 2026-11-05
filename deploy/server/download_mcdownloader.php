<?php
/**
 * MCDownloader 下载 API
 * - JSON POST  → 仅密码校验，返回 202 Accepted（fetch 用来预检）
 * - form-urlencoded POST → 密码校验 + 流式返回文件（浏览器原生下载）
 * 部署位置: /var/www/aiden8115/api/download/mcdownloader.php
 */

const FILE_PATH    = '/var/www/secure/BestMCLauncher-Setup-1.0.0.exe';
const DOWNLOAD_NAME = 'BestMCLauncher-Setup-1.0.0.exe';
const PASSWORD     = '净念禅宗';

// 解析 Origin 用于 CORS
$origin    = $_SERVER['HTTP_ORIGIN'] ?? '';
$hasOrigin = ($origin !== '');

function cors_out() {
    global $hasOrigin, $origin;
    if ($hasOrigin) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    }
}

function json_response(int $code, string $msg): never {
    cors_out();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => $code === 202 || $code === 200, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// —— OPTIONS 预检 ——
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    cors_out();
    http_response_code(204);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    exit;
}

// —— 只允许 POST ——
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_response(405, 'Method Not Allowed');
}

// —— 解析密码（JSON body 或 form-urlencoded 两种都支持）——
$ct  = $_SERVER['CONTENT_TYPE'] ?? '';
$pwd = '';

if (stripos($ct, 'application/json') !== false) {
    // fetch JSON 模式
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) json_response(400, 'Invalid JSON body');
    $pwd  = trim((string)($body['password'] ?? ''));
} else {
    // form 提交模式（浏览器原生 form POST）
    $pwd = trim((string)($_POST['password'] ?? ''));
}

if ($pwd === '') {
    json_response(400, 'Password is required');
}

// —— timing-safe 密码校验 ——
if (!hash_equals(PASSWORD, $pwd)) {
    json_response(403, 'Incorrect password');
}

// —— 文件存在检查 ——
if (!is_file(FILE_PATH) || !is_readable(FILE_PATH)) {
    json_response(500, 'Server file not found');
}
$size = filesize(FILE_PATH);
if ($size === 0) {
    json_response(500, 'Server file is empty');
}

// —— JSON POST: 只校验密码，返回 202 Accepted ——
if (stripos($ct, 'application/json') !== false) {
    cors_out();
    http_response_code(202);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, 'message' => 'Password accepted, ready to download'], JSON_UNESCAPED_UNICODE);
    exit;
}

// —— form POST: 流式返回文件 ——
cors_out();

$asciiName = DOWNLOAD_NAME;
$utf8Name  = rawurlencode(DOWNLOAD_NAME);

header('Content-Type: application/octet-stream');
header("Content-Disposition: attachment; filename=\"$asciiName\"; filename*=UTF-8''$utf8Name");
header('Content-Length: ' . $size);
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Connection: close');

// 8MB 一块流式输出
$fp = fopen(FILE_PATH, 'rb');
if (!$fp) {
    http_response_code(500);
    echo 'Failed to open file';
    exit;
}
while (!feof($fp)) {
    echo fread($fp, 8 * 1024 * 1024);
    flush();
}
fclose($fp);
exit;
