#!/usr/bin/env python3
"""Encrypt and verify a Genora dev dump in its dedicated HOSTKEY S3 bucket."""
import hashlib
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import boto3
from botocore.config import Config
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

CONFIG = Path('/etc/genora-art/dev-backup-s3.json')
ROOT = Path('/srv/backups/genora-art-dev')
PREFIX = 'genora/dev-backups/'
MAGIC = b'GENORA01'
CHUNK = 1024 * 1024
REMOTE_NAME = re.compile(r'genora/dev-backups/genora-dev-\d{8}T\d{6}Z\.dump\.[0-9a-f]{64}\.aesgcm\Z')


def main() -> None:
    source = Path(sys.argv[1]).resolve(strict=True)
    if source.parent != ROOT or not re.fullmatch(r'genora-dev-\d{8}T\d{6}Z\.dump', source.name):
        raise ValueError('Unexpected dump path')
    if CONFIG.stat().st_mode & 0o077:
        raise ValueError('S3 configuration must be private')
    cfg = json.loads(CONFIG.read_text())
    key = bytes.fromhex(cfg['encryptionKey'])
    if len(key) != 32 or cfg['bucket'] != 'bce1ad038-genora-art-dev-backups' or cfg['endpoint'] != 'https://s3-nl-cold.hostkey.com':
        raise ValueError('Unexpected Genora S3 configuration')
    client = boto3.client('s3', endpoint_url=cfg['endpoint'], region_name=cfg['region'],
                          aws_access_key_id=cfg['accessKeyId'], aws_secret_access_key=cfg['secretAccessKey'],
                          config=Config(signature_version='s3v4', s3={'addressing_style': 'path'},
                                        connect_timeout=15, read_timeout=120, retries={'max_attempts': 3}))
    nonce = os.urandom(12)
    header = MAGIC + nonce
    digest = hashlib.sha256()
    with tempfile.NamedTemporaryFile(dir=ROOT, prefix='.encrypted-', delete=False) as temp:
        encrypted_path = Path(temp.name)
        try:
            encryptor = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()
            encryptor.authenticate_additional_data(header)
            temp.write(header)
            with source.open('rb') as plain:
                for chunk in iter(lambda: plain.read(CHUNK), b''):
                    digest.update(chunk)
                    temp.write(encryptor.update(chunk))
            temp.write(encryptor.finalize())
            temp.write(encryptor.tag)
            temp.flush()
            os.fsync(temp.fileno())
            object_key = f'{PREFIX}{source.name}.{digest.hexdigest()}.aesgcm'
            client.upload_file(str(encrypted_path), cfg['bucket'], object_key,
                               ExtraArgs={'ACL': 'private', 'ContentType': 'application/octet-stream'})
            response = client.get_object(Bucket=cfg['bucket'], Key=object_key)
            body = response['Body']
            try:
                if body.read(20) != header:
                    raise ValueError('Remote archive header mismatch')
                decryptor = Cipher(algorithms.AES(key), modes.GCM(nonce)).decryptor()
                decryptor.authenticate_additional_data(header)
                remote_digest = hashlib.sha256()
                remaining = response['ContentLength'] - 36
                while remaining > 0:
                    chunk = body.read(min(CHUNK, remaining))
                    if not chunk:
                        raise ValueError('Truncated remote archive')
                    remaining -= len(chunk)
                    remote_digest.update(decryptor.update(chunk))
                remote_digest.update(decryptor.finalize_with_tag(body.read(16)))
                if remote_digest.digest() != digest.digest():
                    raise ValueError('Remote archive checksum mismatch')
            finally:
                body.close()
            source.unlink()
            print(f'Encrypted Genora backup uploaded and verified: {object_key}')
            cutoff = datetime.now(timezone.utc) - timedelta(days=29)
            paginator = client.get_paginator('list_objects_v2')
            for page in paginator.paginate(Bucket=cfg['bucket'], Prefix=PREFIX):
                for item in page.get('Contents', []):
                    old_key = item['Key']
                    if old_key != object_key and REMOTE_NAME.fullmatch(old_key) and item['LastModified'] <= cutoff:
                        client.delete_object(Bucket=cfg['bucket'], Key=old_key)
                        print(f'Removed expired Genora backup: {old_key}')
        finally:
            encrypted_path.unlink(missing_ok=True)


if __name__ == '__main__':
    main()
