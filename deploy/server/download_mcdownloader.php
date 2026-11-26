<?php
/**
 * BestMCLauncher 下载 API
 * - POST JSON {password}       → 校验密码，返回 202 + 带令牌的原生下载地址
 * - GET  ?token=...            → 校验令牌，流式下发文件（浏览器原生下载，带进度条）
 * - POST form-urlencoded       → 兼容旧版前端，校验密码后直接流式下发
 * 注：新版前端用 text/plain 发送 JSON，避免触发 CORS 预检
 * 部署位置: /var/www/aiden8115/api/download/mcdownloader.php
 */

const FILE_PATH     = '/var/www/secure/BestMCLauncher-Setup-1.0.0.exe';
const DOWNLOAD_NAME = 'BestMCLauncher-Setup-1.0.0.exe';
const PASSWORD      = '净念禅宗';
const TOKEN_TTL     = 300; // 令牌有效期（秒）

// 令牌签名密钥（部署时请保持此值不变）
const TOKEN_SECRET  = '9f3c1a7e5b2d48c6a0e7f4b9d1c35728e6a4f0b8c2d95e13a7b6c8d0e2f4a1b3';

set_time_limit(0);

// 解析 Origin 用于 CORS
$origin    = $_SERVER['HTTP_ORIGIN'] ?? '';
$hasOrigin = ($origin !== '');

function cors_out(): void {
    global $hasOrigin, $origin;
    header('Vary: Origin');
    if ($hasOrigin) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    }
}

function json_response(int $code, string $msg, array $extra = []): never {
    cors_out();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(
        array_merge(['ok' => $code >= 200 && $code < 300, 'message' => $msg], $extra),
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

// —— 一次性下载令牌：过期时间.HMAC 签名 ——
function make_token(): string {
    $exp = time() + TOKEN_TTL;
    return $exp . '.' . hash_hmac('sha256', 'mcdownloader|' . $exp, TOKEN_SECRET);
}

function token_valid(string $token): bool {
    $parts = explode('.', $token, 2);
    if (count($parts) !== 2) return false;
    [$exp, $sig] = $parts;
    if (!ctype_digit($exp) || (int)$exp < time()) return false;
    return hash_equals(hash_hmac('sha256', 'mcdownloader|' . $exp, TOKEN_SECRET), $sig);
}

// —— 流式下发文件 ——
function stream_download(): never {
    if (!is_file(FILE_PATH) || !is_readable(FILE_PATH)) {
        json_response(500, 'Server file not found');
    }
    $size = filesize(FILE_PATH);
    if ($size === 0) {
        json_response(500, 'Server file is empty');
    }

    cors_out();
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . DOWNLOAD_NAME . '"; filename*=UTF-8\'\'' . rawurlencode(DOWNLOAD_NAME));
    header('Content-Length: ' . $size);
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    header('Connection: close');

    $fp = fopen(FILE_PATH, 'rb');
    if (!$fp) {
        http_response_code(500);
        echo 'Failed to open file';
        exit;
    }
    while (!feof($fp)) {
        echo fread($fp, 1024 * 1024);
        flush();
    }
    fclose($fp);
    exit;
}

// —— OPTIONS 预检 ——
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    cors_out();
    http_response_code(204);
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';

// —— GET：凭令牌下载 ——
if ($method === 'GET') {
    if (!token_valid((string)($_GET['token'] ?? ''))) {
        json_response(403, 'Invalid or expired token');
    }
    stream_download();
}

// —— 其余方法只允许 POST ——
if ($method !== 'POST') {
    json_response(405, 'Method Not Allowed');
}

// —— 支持两种 POST ——
// 1) 表单 POST（旧版前端）：密码在 $_POST，校验后直接流式下载
// 2) JSON body（新版前端）：为避免 CORS 预检，前端用 text/plain 发送，
//    因此这里不再按 Content-Type 判断，而是尝试解析 JSON
$pwd    = trim((string)($_POST['password'] ?? ''));
$isForm = ($pwd !== '');

if (!$isForm) {
    $body = json_decode((string)file_get_contents('php://input'), true);
    if (is_array($body)) {
        $pwd = trim((string)($body['password'] ?? ''));
    }
}

if ($pwd === '') {
    json_response(400, 'Password is required');
}

// —— timing-safe 密码校验 ——
if (!hash_equals(PASSWORD, $pwd)) {
    json_response(403, 'Incorrect password');
}

if ($isForm) {
    stream_download();
}

// —— 密码正确：下发带令牌的下载地址 ——
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host   = $_SERVER['HTTP_HOST'] ?? 'server.aiden8115.cn';
$url    = $scheme . '://' . $host . '/api/download/mcdownloader?token=' . urlencode(make_token());

json_response(202, 'Password accepted, ready to download', ['url' => $url]);
