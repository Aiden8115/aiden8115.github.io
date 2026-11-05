#!/bin/bash
cd /tmp

echo '=== 1. JSON POST 密码错 → 403 ==='
curl -sk -X POST https://127.0.0.1/api/download/mcdownloader \
     -H 'Host: server.aiden8115.cn' \
     -H 'Content-Type: application/json' \
     -d '{"password":"wrong"}' -w ' [HTTP=%{http_code}]'
echo ""

echo '=== 2. JSON POST 密码对 → 202 (只校验不下载) ==='
curl -sk -D- -X POST https://127.0.0.1/api/download/mcdownloader \
     -H 'Host: server.aiden8115.cn' \
     -H 'Content-Type: application/json' \
     -d '{"password":"净念禅宗"}' 2>&1 | head -15
echo ""

echo '=== 3. form POST 密码对 → 200 + 文件流 ==='
curl -sk -D- -o /dev/null -X POST https://127.0.0.1/api/download/mcdownloader \
     -H 'Host: server.aiden8115.cn' \
     -d 'password=净念禅宗' 2>&1 | head -15

echo '=== 4. 外部: JSON 密码错 ==='
curl.exe -s -X POST https://server.aiden8115.cn/api/download/mcdownloader ^
     -H "Content-Type: application/json" ^
     --data-binary "@c:\Users\Z440\WebstormProjects\aiden8115.github.io\deploy\server\body_wrong.json"
echo ""
