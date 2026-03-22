#!/usr/bin/env python3
"""Validate ConceptPilot backend environment: .env parsing, Settings, and live checks.

Run from the repository root (recommended with backend dependencies installed):

    cd /path/to/ConceptPilot
    python validate_env.py

Or point at a specific env file:

    python validate_env.py --env-file backend/.env

Install deps first (same venv you use for the API):

    pip install -r backend/requirements.txt

Exit code 0 if nothing critical failed; 1 if required config or database is broken.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parent


def _default_env_path() -> Path:
    return _repo_root() / "backend" / ".env"


def _print_section(title: str) -> None:
    print()
    print(f"--- {title} ---")


def _ok(msg: str) -> None:
    print(f"  OK   {msg}")


def _fail(msg: str) -> None:
    print(f"  FAIL {msg}")


def _warn(msg: str) -> None:
    print(f"  WARN {msg}")


def _info(msg: str) -> None:
    print(f"  INFO {msg}")


def _looks_like_placeholder(key: str, value: str) -> bool | str:
    v = value.strip()
    if not v:
        return "empty"
    if "YOUR_" in v:
        return "contains YOUR_ placeholder"
    if key in ("DATABASE_URL", "ANTHROPIC_API_KEY") and v.lower().startswith("your"):
        return "looks like a template value"
    return False


def _validate_production_rules(settings) -> list[str]:
    """Mirror backend/app/main.py production guards (without importing main)."""
    errors: list[str] = []
    if settings.APP_ENV.lower() != "production":
        return errors
    origins = settings.CORS_ALLOWED_ORIGINS.strip()
    if not origins or origins == "*":
        errors.append(
            "APP_ENV=production requires CORS_ALLOWED_ORIGINS to be explicit (not empty or '*')"
        )
    if settings.INSTRUCTOR_USERNAME == "admin" and settings.INSTRUCTOR_PASSWORD == "admin":
        errors.append("APP_ENV=production cannot use default instructor admin/admin")
    if settings.COMPUTE_ASYNC_ENABLED:
        if settings.COMPUTE_QUEUE_BACKEND != "redis":
            errors.append(
                "APP_ENV=production with COMPUTE_ASYNC_ENABLED=true requires "
                "COMPUTE_QUEUE_BACKEND=redis"
            )
        if not str(settings.COMPUTE_QUEUE_REDIS_URL or "").strip():
            errors.append(
                "APP_ENV=production with COMPUTE_ASYNC_ENABLED=true requires "
                "COMPUTE_QUEUE_REDIS_URL"
            )
    return errors


async def _check_database() -> tuple[bool, str]:
    import sqlalchemy

    from app.database import engine

    try:
        async with engine.connect() as conn:
            await conn.execute(sqlalchemy.text("SELECT 1"))
        return True, "connected"
    except Exception as exc:
        return False, str(exc)[:200]


async def _check_object_storage(settings) -> tuple[bool, str]:
    if not settings.OBJECT_STORAGE_ENABLED:
        return True, "skipped (OBJECT_STORAGE_ENABLED=false)"
    if not settings.VULTR_OBJECT_STORAGE_ENDPOINT.strip():
        return False, "OBJECT_STORAGE_ENABLED but no endpoint (VULTR_* or S3_*)"
    try:
        import boto3
        from botocore.config import Config as BotoConfig
    except ImportError:
        return False, "boto3 not installed"

    try:
        client = boto3.client(
            "s3",
            endpoint_url=settings.VULTR_OBJECT_STORAGE_ENDPOINT,
            aws_access_key_id=settings.VULTR_OBJECT_STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.VULTR_OBJECT_STORAGE_SECRET_KEY,
            config=BotoConfig(signature_version="s3v4"),
        )
        client.head_bucket(Bucket=settings.VULTR_OBJECT_STORAGE_BUCKET)
        return True, f"bucket reachable ({settings.VULTR_OBJECT_STORAGE_BUCKET})"
    except Exception as exc:
        return False, str(exc)[:200]


async def _check_elevenlabs() -> tuple[bool, str]:
    from app.services.elevenlabs_service import check_api_reachable

    ok, detail = await check_api_reachable()
    if detail == "not_configured":
        return True, "skipped (ELEVENLABS not configured)"
    return ok, detail


def _check_export_dir(settings) -> tuple[bool, str]:
    d = settings.EXPORT_DIR
    try:
        os.makedirs(d, exist_ok=True)
        if not os.access(d, os.W_OK):
            return False, f"not writable: {d}"
        return True, f"writable: {d}"
    except OSError as exc:
        return False, f"{d}: {exc}"


def _check_redis(settings) -> tuple[bool, str]:
    if not settings.COMPUTE_ASYNC_ENABLED:
        return True, "skipped (COMPUTE_ASYNC_ENABLED=false)"
    if settings.COMPUTE_QUEUE_BACKEND != "redis":
        return True, f"skipped (queue backend is {settings.COMPUTE_QUEUE_BACKEND!r})"
    url = settings.COMPUTE_QUEUE_REDIS_URL.strip()
    if not url:
        return False, "COMPUTE_QUEUE_REDIS_URL empty"
    try:
        import redis
    except ImportError:
        return False, "redis package not installed"
    try:
        r = redis.from_url(url, socket_connect_timeout=3)
        r.ping()
        return True, "ping OK"
    except Exception as exc:
        return False, str(exc)[:200]


async def async_main(env_file: Path) -> int:
    root = _repo_root()
    backend = root / "backend"
    if not backend.is_dir():
        _fail(f"backend directory not found: {backend}")
        return 1

    if not env_file.is_file():
        _fail(f"Env file not found: {env_file}")
        _info(f"Copy backend/.env.example to {env_file} and fill in values.")
        return 1

    sys.path.insert(0, str(backend))

    try:
        from dotenv import load_dotenv
    except ImportError:
        _fail("python-dotenv is not installed. Run: pip install -r backend/requirements.txt")
        return 1

    # Load .env before any app.* import so Settings() sees the file.
    load_dotenv(env_file, override=True)

    _print_section("Env file")
    _ok(f"Loaded {env_file}")

    try:
        from app.config import settings
    except Exception as exc:
        _fail(f"Could not load app.config / Settings: {exc}")
        return 1

    critical_errors: list[str] = []
    warnings: list[str] = []

    _print_section("Placeholder / template values")
    for key in (
        "DATABASE_URL",
        "ANTHROPIC_API_KEY",
        "INSTRUCTOR_USERNAME",
        "INSTRUCTOR_PASSWORD",
        "CORS_ALLOWED_ORIGINS",
        "ELEVENLABS_API_KEY",
        "ELEVENLABS_VOICE_ID",
        "VULTR_OBJECT_STORAGE_ENDPOINT",
        "VULTR_OBJECT_STORAGE_ACCESS_KEY",
        "VULTR_OBJECT_STORAGE_SECRET_KEY",
        "VULTR_OBJECT_STORAGE_BUCKET",
        "S3_ENDPOINT",
        "S3_ACCESS_KEY",
        "S3_SECRET_KEY",
        "S3_BUCKET",
    ):
        val = os.environ.get(key, "")
        if not val:
            continue
        reason = _looks_like_placeholder(key, val)
        if reason:
            msg = f"{key}: {reason}"
            if key == "DATABASE_URL":
                _fail(msg)
                critical_errors.append(msg)
            elif key == "ANTHROPIC_API_KEY":
                _warn(msg)
                warnings.append(msg)
            else:
                _warn(msg)
                warnings.append(msg)

    _print_section("Pydantic Settings")
    try:
        # Re-instantiate to surface validation errors clearly.
        from app.config import Settings

        Settings()
        _ok("Settings() validates")
    except Exception as exc:
        _fail(f"Settings validation failed: {exc}")
        critical_errors.append(str(exc))

    _print_section("Production rules (if APP_ENV=production)")
    prod_issues = _validate_production_rules(settings)
    if not prod_issues:
        _ok("No production rule violations (or not in production)")
    for msg in prod_issues:
        _fail(msg)
        critical_errors.append(msg)

    _print_section("Anthropic")
    if settings.ANTHROPIC_API_KEY and len(settings.ANTHROPIC_API_KEY) > 10:
        _ok("ANTHROPIC_API_KEY looks set (length OK); API not called from this script")
    else:
        _warn("ANTHROPIC_API_KEY missing or very short — AI features will not work")
        warnings.append("anthropic key")

    _print_section("Database")
    try:
        db_ok, db_detail = await _check_database()
        if db_ok:
            _ok(db_detail)
        else:
            _fail(db_detail)
            critical_errors.append(f"database: {db_detail}")
    except Exception as exc:
        _fail(str(exc)[:200])
        critical_errors.append(f"database: {exc}")

    _print_section("Export directory")
    ex_ok, ex_detail = _check_export_dir(settings)
    if ex_ok:
        _ok(ex_detail)
    else:
        _fail(ex_detail)
        critical_errors.append(ex_detail)

    _print_section("Object storage (S3-compatible)")
    os_ok, os_detail = await _check_object_storage(settings)
    if os_ok and os_detail.startswith("skipped"):
        _info(os_detail)
    elif os_ok:
        _ok(os_detail)
    else:
        _fail(os_detail)
        if settings.OBJECT_STORAGE_ENABLED:
            critical_errors.append(f"object storage: {os_detail}")
        else:
            warnings.append(os_detail)

    _print_section("ElevenLabs")
    el_ok, el_detail = await _check_elevenlabs()
    if el_detail == "not_configured" or (
        not el_ok and el_detail == "not_configured"
    ):
        _info(f"skipped ({el_detail})")
    elif el_ok:
        _ok(el_detail)
    else:
        _warn(el_detail)
        warnings.append(f"elevenlabs: {el_detail}")

    _print_section("Redis (async compute queue)")
    r_ok, r_detail = _check_redis(settings)
    if r_detail.startswith("skipped"):
        _info(r_detail)
    elif r_ok:
        _ok(r_detail)
    else:
        _fail(r_detail)
        if settings.COMPUTE_ASYNC_ENABLED and settings.COMPUTE_QUEUE_BACKEND == "redis":
            critical_errors.append(f"redis: {r_detail}")
        else:
            warnings.append(r_detail)

    _print_section("Summary")
    if critical_errors:
        print("  Critical problems:")
        for e in critical_errors:
            print(f"    - {e}")
        print()
        print("  Fix the items above, then run this script again.")
        return 1

    if warnings:
        print("  Warnings (optional or non-blocking):")
        for w in warnings:
            print(f"    - {w}")
    print()
    print("  All required checks passed.")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate backend .env and dependencies.")
    parser.add_argument(
        "--env-file",
        type=Path,
        default=_default_env_path(),
        help="Path to .env (default: backend/.env)",
    )
    args = parser.parse_args()
    code = asyncio.run(async_main(args.env_file.resolve()))
    raise SystemExit(code)


if __name__ == "__main__":
    main()
