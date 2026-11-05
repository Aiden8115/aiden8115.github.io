#!/usr/bin/env python3
"""
DNS-01 certbot wrapper:
1. Launch certbot, read until it prints the TXT challenge token
2. Write token to /tmp/certbot_token.txt
3. Block until /tmp/certbot_go.txt exists (created externally)
4. Send Enter to certbot → let it verify DNS → complete
"""
import subprocess, time, sys, os, signal

p = subprocess.Popen(
    ['sudo', 'certbot', 'certonly', '--manual', '-d', 'server.aiden8115.cn',
     '--preferred-challenges', 'dns', '--agree-tos',
     '--register-unsafely-without-email', '--manual-public-ip-logging-ok'],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
)

token = None
while True:
    line = p.stdout.readline()
    if not line and p.poll() is not None:
        break
    sys.stdout.write(line)
    sys.stdout.flush()
    if token is None and len(line.strip()) >= 32:
        s = line.strip()
        if s.replace('-', '').replace('_', '').replace('=', '').isalnum():
            token = s
    if 'Press Enter to Continue' in line:
        break

if token:
    print(f'\n=== TOKEN: {token} ===', flush=True)
    with open('/tmp/certbot_token.txt', 'w') as f:
        f.write(token)
else:
    print('ERROR: no token extracted', flush=True)
    p.kill()
    sys.exit(1)

print('=== Waiting for /tmp/certbot_go.txt (create it to proceed) ===', flush=True)
for i in range(300):
    if os.path.exists('/tmp/certbot_go.txt'):
        break
    time.sleep(2)
    if i % 15 == 0:
        print(f'... {i*2}s waiting', flush=True)

p.stdin.write('\n')
p.stdin.flush()
out, _ = p.communicate(timeout=120)
print(out, flush=True)
print(f'=== CERTBOT EXIT CODE: {p.returncode} ===', flush=True)
with open('/tmp/certbot_exit.txt', 'w') as f:
    f.write(str(p.returncode))
sys.exit(p.returncode)
