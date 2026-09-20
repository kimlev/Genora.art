#!/usr/bin/env python3
"""Escrow a Genora backup key encrypted to the owner's SSH public key."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

if len(sys.argv) != 2 or sys.argv[1] not in ('dev', 'prod'):
    raise SystemExit('Usage: escrow-backup-key.py dev|prod')
environment = sys.argv[1]
config = Path(f'/etc/genora-art/{environment}-backup-s3.json')
recipient = Path('/etc/genora-art/backup-recipient.pub')
if config.stat().st_mode & 0o077:
    raise SystemExit('Backup configuration must be private')
cfg = json.loads(config.read_text())
if len(bytes.fromhex(cfg['encryptionKey'])) != 32:
    raise SystemExit('Invalid encryption key')
if cfg['bucket'] != 'bce1ad038-genora-art-dev-backups':
    raise SystemExit('Unexpected Genora bucket')

encrypted = subprocess.run(
    ['age', '-R', str(recipient)],
    input=cfg['encryptionKey'].encode('ascii'),
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    check=True,
).stdout
client = boto3.client('s3', endpoint_url=cfg['endpoint'], region_name=cfg['region'],
                      aws_access_key_id=cfg['accessKeyId'], aws_secret_access_key=cfg['secretAccessKey'],
                      config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}))
object_key = f'genora/recovery/{environment}-backup-key.age'
try:
    client.head_object(Bucket=cfg['bucket'], Key=object_key)
except ClientError as error:
    if error.response['Error']['Code'] not in ('404', 'NoSuchKey', 'NotFound'):
        raise
else:
    raise SystemExit('Recovery envelope already exists; refusing to overwrite')

client.put_object(Bucket=cfg['bucket'], Key=object_key, Body=encrypted,
                  ACL='private', ContentType='application/octet-stream')
response = client.get_object(Bucket=cfg['bucket'], Key=object_key)
try:
    restored = response['Body'].read()
finally:
    response['Body'].close()
if hashlib.sha256(restored).digest() != hashlib.sha256(encrypted).digest():
    raise SystemExit('Recovery envelope verification failed')
print(f'Encrypted recovery envelope verified: {object_key}')
