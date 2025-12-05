import base64
import os
import uuid
from datetime import date, datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import aiomysql
from PIL import Image
from qcloud_cos import CosConfig, CosS3Client

ROOT_DIR = Path(__file__).resolve().parent.parent
LEGACY_BACKEND_DIR = ROOT_DIR / "backend"
DEFAULT_AVATAR_PATH = LEGACY_BACKEND_DIR / "public-sample-avatar.png"

COS_BUCKET = os.getenv("COS_BUCKET")
COS_REGION = os.getenv("COS_REGION")
COS_SECRET_ID = os.getenv("COS_SECRET_ID")
COS_SECRET_KEY = os.getenv("COS_SECRET_KEY")
COS_FOLDER = os.getenv("COS_FOLDER", "avatars")


def load_default_avatar() -> str:
    try:
        data = DEFAULT_AVATAR_PATH.read_bytes()
        return base64.b64encode(data).decode()
    except Exception:
        return ""


DEFAULT_AVATAR_BASE64 = load_default_avatar()


def normalize_avatar(value: Optional[str]) -> Optional[str]:
    if not value or not isinstance(value, str):
        return None
    return value.replace(
        "data:image/png;base64,", ""
    ).replace("data:image/jpeg;base64,", "").strip()


def compress_image_to_limit(image_bytes: bytes, limit_bytes: int = 100 * 1024) -> bytes:
    """压缩图片至限定大小，优先降质量，必要时缩放。"""
    try:
        image = Image.open(BytesIO(image_bytes))
    except Exception:
        return image_bytes

    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")

    max_side = max(image.size)
    if max_side > 800:
        ratio = 800 / float(max_side)
        new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
        image = image.resize(new_size, Image.LANCZOS)

    quality = 90
    step = 10
    min_quality = 40
    buffer = BytesIO()

    def save_with_quality(q: int) -> Tuple[bytes, int]:
        buffer.seek(0)
        buffer.truncate(0)
        img_to_save = image.convert("RGB")
        img_to_save.save(buffer, format="JPEG", quality=q, optimize=True)
        data = buffer.getvalue()
        return data, len(data)

    data, size = save_with_quality(quality)
    while size > limit_bytes and quality > min_quality:
        quality -= step
        data, size = save_with_quality(quality)

    return data


def process_avatar_payload(raw_value: Optional[str]) -> Optional[str]:
    """归一化并压缩头像 base64，返回压缩后的 base64 字符串。"""
    normalized = normalize_avatar(raw_value)
    if not normalized:
        return None
    try:
        decoded = base64.b64decode(normalized, validate=True)
    except Exception:
        return None
    compressed = compress_image_to_limit(decoded)
    return base64.b64encode(compressed).decode()


def to_avatar_data_uri(value: Any) -> Optional[str]:
    if value is None and not DEFAULT_AVATAR_BASE64:
        return None
    base = ""
    if isinstance(value, (bytes, bytearray)):
        base = base64.b64encode(value).decode()
    elif isinstance(value, str):
        base = value.strip()
    if not base:
        base = DEFAULT_AVATAR_BASE64
    return f"data:image/png;base64,{base}" if base else None


def map_doctor_row(row: Dict[str, Any]) -> Dict[str, Any]:
    avatar_val = row.get("avatar_url") or row.get("avatar_image")
    avatar_url = None
    if isinstance(avatar_val, str) and avatar_val.startswith("http"):
        avatar_url = avatar_val
    return {
        "id": row.get("doctor_id") or row.get("id"),
        "name": row.get("name"),
        "title": row.get("title"),
        "expertise": row.get("expertise"),
        "intro": row.get("intro"),
        "hospitalId": row.get("hospital_id"),
        "hospitalName": row.get("hospital_name"),
        "departmentName": row.get("department_name"),
        "registrationFee": row.get("registration_fee") or 10.00,
        "avatarUrl": avatar_url or (f"/api/doctors/{row.get('doctor_id') or row.get('id')}/avatar" if (row.get("doctor_id") or row.get("id")) else None),
    }


def map_doctor_summary_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row.get("doctor_id") or row.get("id"),
        "name": row.get("name"),
        "title": row.get("title"),
        "expertise": row.get("expertise"),
        "intro": row.get("intro"),
        "hospitalId": row.get("hospital_id"),
        "hospitalName": row.get("hospital_name"),
        "departmentName": row.get("department_name"),
    }


async def fetch_all(sql: str, params: Optional[List[Any]], pool: aiomysql.Pool) -> List[Dict[str, Any]]:
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params or [])
            return await cur.fetchall()


async def fetch_one(sql: str, params: Optional[List[Any]], pool: aiomysql.Pool) -> Optional[Dict[str, Any]]:
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, params or [])
            return await cur.fetchone()


def upload_avatar_to_cos(base64_data: str) -> str:
    if not (COS_BUCKET and COS_REGION and COS_SECRET_ID and COS_SECRET_KEY):
        raise RuntimeError("COS config missing (COS_BUCKET/COS_REGION/COS_SECRET_ID/COS_SECRET_KEY)")
    decoded = base64.b64decode(base64_data)
    # 使用压缩后的数据
    compressed = compress_image_to_limit(decoded)
    client = CosS3Client(
        CosConfig(Region=COS_REGION, SecretId=COS_SECRET_ID, SecretKey=COS_SECRET_KEY, Scheme="https")
    )
    key = f"{COS_FOLDER.rstrip('/')}/{uuid.uuid4().hex}.jpg"
    client.put_object(Bucket=COS_BUCKET, Body=compressed, Key=key)
    return f"https://{COS_BUCKET}.cos.{COS_REGION}.myqcloud.com/{key}"
