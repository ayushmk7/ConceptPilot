"""Optional Vultr Object Storage (S3-compatible) integration."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger("conceptpilot.object_storage")


def _is_enabled() -> bool:
    return bool(
        settings.OBJECT_STORAGE_ENABLED
        and settings.VULTR_OBJECT_STORAGE_ENDPOINT
        and settings.VULTR_OBJECT_STORAGE_ACCESS_KEY
        and settings.VULTR_OBJECT_STORAGE_SECRET_KEY
        and settings.VULTR_OBJECT_STORAGE_BUCKET
    )


def _put_object_blocking(object_name: str, payload: bytes, content_type: str) -> bool:
    try:
        import boto3
        from botocore.config import Config as BotoConfig
    except Exception:
        logger.warning("boto3 unavailable; skipping S3 upload for %s", object_name)
        return False

    client = boto3.client(
        "s3",
        endpoint_url=settings.VULTR_OBJECT_STORAGE_ENDPOINT,
        aws_access_key_id=settings.VULTR_OBJECT_STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.VULTR_OBJECT_STORAGE_SECRET_KEY,
        config=BotoConfig(signature_version="s3v4"),
    )
    bucket = settings.VULTR_OBJECT_STORAGE_BUCKET
    client.put_object(
        Bucket=bucket,
        Key=object_name,
        Body=payload,
        ContentType=content_type,
    )
    return True


def _get_object_blocking(object_name: str) -> bytes:
    import boto3
    from botocore.config import Config as BotoConfig

    client = boto3.client(
        "s3",
        endpoint_url=settings.VULTR_OBJECT_STORAGE_ENDPOINT,
        aws_access_key_id=settings.VULTR_OBJECT_STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.VULTR_OBJECT_STORAGE_SECRET_KEY,
        config=BotoConfig(signature_version="s3v4"),
    )
    bucket = settings.VULTR_OBJECT_STORAGE_BUCKET
    obj = client.get_object(Bucket=bucket, Key=object_name)
    return obj["Body"].read()


async def upload_raw_upload_artifact(
    exam_id: str,
    artifact_kind: str,
    payload: bytes,
    content_type: str = "text/csv",
) -> bool:
    """Best-effort upload hook for raw uploaded files."""
    if not _is_enabled():
        return False
    object_name = f"uploads/{exam_id}/{artifact_kind}"
    try:
        return await asyncio.to_thread(
            _put_object_blocking,
            object_name,
            payload,
            content_type,
        )
    except Exception:
        logger.exception("Failed object storage upload: %s", object_name)
        return False


async def upload_export_bundle_artifact(exam_id: str, file_path: str) -> bool:
    """Best-effort upload hook for generated export bundles."""
    if not _is_enabled():
        return False
    filename = Path(file_path).name
    object_name = f"exports/{exam_id}/{filename}"
    try:
        payload = Path(file_path).read_bytes()
        return await asyncio.to_thread(
            _put_object_blocking,
            object_name,
            payload,
            "application/zip",
        )
    except Exception:
        logger.exception("Failed object storage export upload: %s", object_name)
        return False


async def put_object_bytes(
    object_name: str,
    payload: bytes,
    content_type: str,
) -> bool:
    """Generic best-effort object upload for generated artifacts."""
    if not _is_enabled():
        return False
    try:
        return await asyncio.to_thread(
            _put_object_blocking,
            object_name,
            payload,
            content_type,
        )
    except Exception:
        logger.exception("Failed object storage upload: %s", object_name)
        return False


async def get_object_bytes(object_name: str) -> bytes | None:
    """Fetch bytes from object storage if configured."""
    if not _is_enabled():
        return None
    try:
        return await asyncio.to_thread(_get_object_blocking, object_name)
    except Exception:
        logger.exception("Failed object storage download: %s", object_name)
        return None


def _delete_object_blocking(object_name: str) -> bool:
    try:
        import boto3
        from botocore.config import Config as BotoConfig
    except Exception:
        logger.warning("boto3 unavailable; skipping S3 delete for %s", object_name)
        return False
    if not _is_enabled():
        return False
    try:
        client = boto3.client(
            "s3",
            endpoint_url=settings.VULTR_OBJECT_STORAGE_ENDPOINT,
            aws_access_key_id=settings.VULTR_OBJECT_STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.VULTR_OBJECT_STORAGE_SECRET_KEY,
            config=BotoConfig(signature_version="s3v4"),
        )
        bucket = settings.VULTR_OBJECT_STORAGE_BUCKET
        client.delete_object(Bucket=bucket, Key=object_name)
        return True
    except Exception:
        logger.exception("Failed object storage delete: %s", object_name)
        return False


async def delete_object_key(object_name: str) -> bool:
    """Remove an object from S3-compatible storage (best-effort)."""
    if not _is_enabled():
        return False
    try:
        return await asyncio.to_thread(_delete_object_blocking, object_name)
    except Exception:
        logger.exception("Failed object storage delete: %s", object_name)
        return False
