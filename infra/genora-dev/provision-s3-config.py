#!/usr/bin/env python3
"""Install private Genora S3 credentials from filtered JSON on stdin."""
import json
import os
import secrets
import sys
from pathlib import Path

if len(sys.argv) != 2 or sys.argv[1] not in ('dev', 'prod'):
    raise SystemExit('Usage: provision-s3-config.py dev|prod')
environment = sys.argv[1]
destination = Path(f'/etc/genora-art/{environment}-backup-s3.json')
source = json.load(sys.stdin)
if destination.exists():
    raise SystemExit('Refusing to overwrite an existing Genora S3 configuration')
if source.get('endpoint') != 'https://s3-nl-cold.hostkey.com' or source.get('region') != 'nl':
    raise SystemExit('Unexpected S3 endpoint or region')
if not source.get('accessKeyId') or not source.get('secretAccessKey'):
    raise SystemExit('Missing S3 credentials')
destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
source['bucket'] = 'bce1ad038-genora-art-dev-backups'
source['encryptionKey'] = secrets.token_hex(32)
fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as output:
    json.dump(source, output)
    output.flush()
    os.fsync(output.fileno())
print(f'Genora {environment} S3 config created with a new encryption key; secrets not displayed.')
