#!/bin/bash
cd /tmp
echo '{"password":"wrong"}' > bw.json
python3 -c "import json; open('/tmp/br.json','w').write(json.dumps({'password':'净念禅宗'}, ensure_ascii=False))"

echo "=== 1. 密码错 403 ==="
curl -sk -X POST https://127.0.0.1/api/download/mcdownloader \
     -H 'Host: server.aiden8115.cn' \
     -H 'Content-Type: application/json' \
     --data-binary @/tmp/bw.json -w ' [HTTP=%{http_code}]'
echo ""

echo "=== 2. 密码对 200 + 响应头 ==="
curl -sk -D- -o /dev/null -X POST https://127.0.0.1/api/download/mcdownloader \
     -H 'Host: server.aiden8115.cn' \
     -H 'Content-Type: application/json' \
     --data-binary @/tmp/br.json 2>&1 | head -15

echo "=== 3. OPTIONS CORS 预检 ==="
curl -sk -D- -X OPTIONS https://127.0.0.1/api/download/mcdownloader \
     -H 'Host: server.aiden8115.cn' \
     -H 'Origin: https://aiden8115.github.io' \
     -H 'Access-Control-Request-Method: POST' 2>&1 | head -10
