$ErrorActionPreference = 'Continue'
$ip = '115.159.38.100'
$domain = 'server.aiden8115.cn'

Write-Host "=== 1. HTTP -> HTTPS 301 ==="
curl.exe -sI -m 8 "http://$domain/" 2>&1 | Select-Object -First 6

Write-Host "=== 2. HTTPS 根目录 ==="
curl.exe -sI -m 8 "https://$domain/" 2>&1 | Select-Object -First 5

Write-Host "=== 3. OPTIONS CORS 预检 ==="
curl.exe -sI -m 8 -X OPTIONS "https://$domain/api/download/mcdownloader" -H "Origin: https://aiden8115.github.io" -H "Access-Control-Request-Method: POST" 2>&1 | Select-Object -First 8

Write-Host "=== 4. 密码错 403 ==="
$bodyW = '{"password":"wrongtest123"}'
curl.exe -s -m 8 -X POST "https://$domain/api/download/mcdownloader" -H "Content-Type: application/json" -d $bodyW 2>&1

Write-Host ""
Write-Host "=== 5. 密码对 200 (只看响应头) ==="
$bodyR = '{"password":"净念禅宗"}'
curl.exe -sI -m 8 -X POST "https://$domain/api/download/mcdownloader" -H "Content-Type: application/json" -d $bodyR 2>&1 | Select-Object -First 12
