import base64
import uuid

from app.config import settings


async def save_file(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    project_id: str,
) -> dict:
    """
    Persist file bytes and return storage metadata for canvas_files row.

    Returns dict with exactly two keys:
      - file_data:    base64 string (DB fallback) or None (Vultr path)
      - storage_key:  Vultr S3 object key or None (DB fallback)
    """
    if settings.VULTR_ACCESS_KEY:
        return await _save_to_vultr(file_bytes, filename, content_type, project_id)
    return _save_to_db(file_bytes)


def _save_to_db(file_bytes: bytes) -> dict:
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    return {"file_data": b64, "storage_key": None}


async def _save_to_vultr(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    project_id: str,
) -> dict:
    import boto3  # optional dep — only imported when Vultr is configured
    from botocore.exceptions import BotoCoreError, ClientError

    key = f"canvas/{project_id}/{uuid.uuid4()}/{filename}"

    try:
        s3 = boto3.client(
            "s3",
            endpoint_url=settings.VULTR_ENDPOINT_URL,
            aws_access_key_id=settings.VULTR_ACCESS_KEY,
            aws_secret_access_key=settings.VULTR_SECRET_KEY,
        )
        s3.put_object(
            Bucket=settings.VULTR_BUCKET_NAME,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except (BotoCoreError, ClientError):
        # Vultr upload failed — fall back to DB storage so the request still succeeds
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        return {"file_data": b64, "storage_key": None}

    return {"file_data": None, "storage_key": key}
