from datetime import date, datetime
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend_fastapi.db import get_pool
from backend_fastapi.utils import (
    DEFAULT_AVATAR_BASE64,
    fetch_all,
    fetch_one,
    map_doctor_row,
    map_doctor_summary_row,
    process_avatar_payload,
    upload_avatar_to_cos,
)

router = APIRouter(prefix="/api", tags=["doctors"])


@router.get("/doctors")
async def get_doctors(
    keyword: Optional[str] = Query(default=None),
    pool=Depends(get_pool),
) -> List[Dict[str, Any]]:
    sql = "SELECT doctor_id, name, title, expertise, intro, hospital_id, hospital_name, department_name, registration_fee, avatar_url FROM doctors"
    params: List[Any] = []
    if keyword:
        sql += " WHERE name LIKE %s OR expertise LIKE %s"
        like_kw = f"%{keyword}%"
        params.extend([like_kw, like_kw])
    rows = await fetch_all(sql, params, pool)
    return [map_doctor_row(row) for row in rows]


@router.get("/admin/doctors")
async def admin_list_doctors(keyword: Optional[str] = Query(default=None), pool=Depends(get_pool)) -> List[Dict[str, Any]]:
    sql = "SELECT doctor_id, name, title, expertise, intro, hospital_id, hospital_name, department_name, registration_fee, avatar_url FROM doctors"
    params: List[Any] = []
    if keyword:
        sql += " WHERE name LIKE %s OR expertise LIKE %s"
        like_kw = f"%{keyword}%"
        params.extend([like_kw, like_kw])
    rows = await fetch_all(sql, params, pool)
    return [map_doctor_row(row) for row in rows]


@router.get("/doctors/{doctor_id}")
async def get_doctor_detail(doctor_id: str, pool=Depends(get_pool)) -> Dict[str, Any]:
    row = await fetch_one("SELECT * FROM doctors WHERE doctor_id = %s", [doctor_id], pool)
    if not row:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return map_doctor_row(row)


@router.get("/doctors/{doctor_id}/avatar")
async def get_doctor_avatar(doctor_id: str, pool=Depends(get_pool)):
    row = await fetch_one("SELECT avatar_url FROM doctors WHERE doctor_id = %s", [doctor_id], pool)
    base = ""
    if row:
        value = row.get("avatar_url")
        if isinstance(value, str) and value.startswith("http"):
            from fastapi.responses import RedirectResponse

            return RedirectResponse(value)
        if isinstance(value, (bytes, bytearray)):
            import base64 as b64

            base = b64.b64encode(value).decode()
        elif isinstance(value, str):
            base = value.strip()
    if not base:
        base = DEFAULT_AVATAR_BASE64
    if not base:
        raise HTTPException(status_code=404, detail="Avatar not found")
    import base64
    from fastapi import Response

    try:
        content = base64.b64decode(base)
    except Exception:
        raise HTTPException(status_code=500, detail="Invalid avatar data")
    return Response(
        content=content,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=31536000"},
    )


@router.post("/admin/doctors")
async def create_doctor(payload: Dict[str, Any], pool=Depends(get_pool)) -> Dict[str, Any]:
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Doctor name is required")
    avatar_payload = None
    if payload.get("avatarImage"):
        processed = process_avatar_payload(payload.get("avatarImage"))
        if processed:
            try:
                avatar_payload = upload_avatar_to_cos(processed)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"上传头像失败: {e}") from e
    fee = payload.get("registrationFee", 10.00)
    doctor_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO doctors 
                (doctor_id, name, title, expertise, intro, hospital_id, hospital_name, department_name, avatar_url, registration_fee)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    doctor_id,
                    name,
                    payload.get("title", ""),
                    payload.get("expertise", ""),
                    payload.get("intro", ""),
                    payload.get("hospitalId", ""),
                    payload.get("hospitalName", ""),
                    payload.get("departmentName", ""),
                    avatar_payload,
                    fee,
                ],
            )
    row = await fetch_one("SELECT * FROM doctors WHERE doctor_id = %s", [doctor_id], pool)
    return map_doctor_row(row)


@router.post("/admin/doctors/getInfo")
async def admin_get_doctor_info(body: Dict[str, Any], pool=Depends(get_pool)) -> Dict[str, Any]:
    doctor_id = body.get("doctorId")
    if not doctor_id:
        raise HTTPException(status_code=400, detail="doctorId is required")
    row = await fetch_one(
        """
        SELECT doctor_id, name, title, expertise, intro,
               hospital_id, hospital_name, department_name, registration_fee, avatar_url
        FROM doctors WHERE doctor_id = %s
        """,
        [doctor_id],
        pool,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return map_doctor_row(row)


@router.post("/admin/doctors/modifyInfo")
async def admin_modify_doctor_info(body: Dict[str, Any], pool=Depends(get_pool)) -> Dict[str, Any]:
    doctor_id = body.get("doctorId")
    if not doctor_id:
        raise HTTPException(status_code=400, detail="doctorId is required")
    exists = await fetch_one("SELECT doctor_id FROM doctors WHERE doctor_id = %s", [doctor_id], pool)
    if not exists:
        raise HTTPException(status_code=404, detail="Doctor not found")

    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE doctors SET name=%s, title=%s, expertise=%s, intro=%s,
                hospital_id=%s, hospital_name=%s, department_name=%s, registration_fee=%s
                WHERE doctor_id=%s
                """,
                [
                    body.get("name"),
                    body.get("title"),
                    body.get("expertise"),
                    body.get("intro"),
                    body.get("hospitalId"),
                    body.get("hospitalName"),
                    body.get("departmentName"),
                    body.get("registrationFee", 10.00),
                    doctor_id,
                ],
            )
    row = await fetch_one(
        """
        SELECT doctor_id, name, title, expertise, intro,
               hospital_id, hospital_name, department_name, registration_fee, avatar_url
        FROM doctors WHERE doctor_id = %s
        """,
        [doctor_id],
        pool,
    )
    return map_doctor_row(row)


@router.post("/admin/doctors/modifyImage")
async def admin_modify_doctor_image(body: Dict[str, Any], pool=Depends(get_pool)) -> Dict[str, Any]:
    doctor_id = body.get("doctorId")
    raw_avatar = body.get("avatarImage")
    if not doctor_id or not raw_avatar:
        raise HTTPException(status_code=400, detail="doctorId and avatarImage are required")
    exists = await fetch_one("SELECT doctor_id FROM doctors WHERE doctor_id = %s", [doctor_id], pool)
    if not exists:
        raise HTTPException(status_code=404, detail="Doctor not found")

    avatar_payload = process_avatar_payload(raw_avatar)
    if not avatar_payload:
        raise HTTPException(status_code=400, detail="Invalid avatar image")
    try:
        avatar_url = upload_avatar_to_cos(avatar_payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传头像失败: {e}") from e

    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("UPDATE doctors SET avatar_url=%s WHERE doctor_id=%s", [avatar_url, doctor_id])

    row = await fetch_one(
        """
        SELECT doctor_id, name, title, expertise, intro,
               hospital_id, hospital_name, department_name, registration_fee, avatar_url
        FROM doctors WHERE doctor_id = %s
        """,
        [doctor_id],
        pool,
    )
    return map_doctor_row(row)


@router.post("/admin/doctors/getImage")
async def admin_get_doctor_image(body: Dict[str, Any], pool=Depends(get_pool)) -> Dict[str, Any]:
    doctor_id = body.get("doctorId")
    if not doctor_id:
        raise HTTPException(status_code=400, detail="doctorId is required")
    row = await fetch_one("SELECT avatar_url FROM doctors WHERE doctor_id = %s", [doctor_id], pool)
    val = (row or {}).get("avatar_url")
    if isinstance(val, str) and val.startswith("http"):
        return {"avatarImage": val}
    base = ""
    if val:
        if isinstance(val, (bytes, bytearray)):
            import base64 as b64

            base = b64.b64encode(val).decode()
        elif isinstance(val, str):
            base = val.strip()
    if not base:
        base = DEFAULT_AVATAR_BASE64
    data_uri = f"data:image/png;base64,{base}" if base else None
    return {"avatarImage": data_uri}


@router.delete("/admin/doctors/{doctor_id}", status_code=204)
async def delete_doctor(doctor_id: str, pool=Depends(get_pool)):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("DELETE FROM doctors WHERE doctor_id = %s", [doctor_id])
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Doctor not found")
    return {"success": True}
