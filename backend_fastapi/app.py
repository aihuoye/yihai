import base64
import os
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiomysql
from aiomysql.cursors import DictCursor
import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from .wechat_bot import WechatBot

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parent.parent
LEGACY_BACKEND_DIR = ROOT_DIR / "backend"
ADMIN_DIR = LEGACY_BACKEND_DIR / "admin"
DEFAULT_AVATAR_PATH = LEGACY_BACKEND_DIR / "public-sample-avatar.png"

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "db": os.getenv("DB_NAME", "medical_points"),
    "port": int(os.getenv("DB_PORT", "3306")),
}

app = FastAPI(title="Medical Backend (FastAPI)", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if ADMIN_DIR.exists():
    app.mount("/admin", StaticFiles(directory=str(ADMIN_DIR), html=True), name="admin")


async def init_db_pool() -> aiomysql.Pool:
    return await aiomysql.create_pool(
        autocommit=True,
        minsize=1,
        maxsize=10,
        charset="utf8mb4",
        cursorclass=DictCursor,
        **DB_CONFIG,
    )


@app.on_event("startup")
async def _startup() -> None:
    app.state.db_pool = await init_db_pool()


@app.on_event("shutdown")
async def _shutdown() -> None:
    pool: aiomysql.Pool = getattr(app.state, "db_pool", None)
    if pool:
        pool.close()
        await pool.wait_closed()


async def get_pool() -> aiomysql.Pool:
    pool: aiomysql.Pool = getattr(app.state, "db_pool", None)
    if not pool:
        raise HTTPException(status_code=500, detail="Database pool not initialized")
    return pool


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
    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "title": row.get("title"),
        "expertise": row.get("expertise"),
        "intro": row.get("intro"),
        "hospitalId": row.get("hospital_id"),
        "hospitalName": row.get("hospital_name"),
        "departmentName": row.get("department_name"),
        "registrationFee": row.get("registration_fee") or 10.00,
        "avatarImage": to_avatar_data_uri(row.get("avatar_image")),
    }


def map_doctor_summary_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row.get("id"),
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


@app.get("/api/doctors")
async def get_doctors(
    keyword: Optional[str] = Query(default=None),
    summary: Optional[int] = Query(default=0),
    pool: aiomysql.Pool = Depends(get_pool),
) -> List[Dict[str, Any]]:
    sql = (
        "SELECT id, name, title, expertise, intro, hospital_id, hospital_name, department_name "
        "FROM doctors"
        if summary
        else "SELECT * FROM doctors"
    )
    params: List[Any] = []
    if keyword:
        sql += " WHERE name LIKE %s OR expertise LIKE %s"
        like_kw = f"%{keyword}%"
        params.extend([like_kw, like_kw])
    rows = await fetch_all(sql, params, pool)
    mapper = map_doctor_summary_row if summary else map_doctor_row
    return [mapper(row) for row in rows]


@app.get("/api/doctors/{doctor_id}")
async def get_doctor_detail(doctor_id: int, pool: aiomysql.Pool = Depends(get_pool)) -> Dict[str, Any]:
    row = await fetch_one("SELECT * FROM doctors WHERE id = %s", [doctor_id], pool)
    if not row:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return map_doctor_row(row)


@app.get("/api/doctors/{doctor_id}/avatar")
async def get_doctor_avatar(doctor_id: int, pool: aiomysql.Pool = Depends(get_pool)) -> Response:
    row = await fetch_one("SELECT avatar_image FROM doctors WHERE id = %s", [doctor_id], pool)
    base = ""
    if row:
        value = row.get("avatar_image")
        if isinstance(value, (bytes, bytearray)):
            base = base64.b64encode(value).decode()
        elif isinstance(value, str):
            base = value.strip()
    if not base:
        base = DEFAULT_AVATAR_BASE64
    if not base:
        raise HTTPException(status_code=404, detail="Avatar not found")
    try:
        content = base64.b64decode(base)
    except Exception:
        raise HTTPException(status_code=500, detail="Invalid avatar data")
    return Response(
        content=content,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=31536000"},
    )


@app.post("/api/admin/doctors", status_code=201)
async def create_doctor(payload: Dict[str, Any], pool: aiomysql.Pool = Depends(get_pool)) -> Dict[str, Any]:
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Doctor name is required")
    avatar_payload = normalize_avatar(payload.get("avatarImage")) or DEFAULT_AVATAR_BASE64 or None
    fee = payload.get("registrationFee", 10.00)
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO doctors 
                (name, title, expertise, intro, hospital_id, hospital_name, department_name, avatar_image, registration_fee)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
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
            new_id = cur.lastrowid
    row = await fetch_one("SELECT * FROM doctors WHERE id = %s", [new_id], pool)
    return map_doctor_row(row)


@app.put("/api/admin/doctors/{doctor_id}")
async def update_doctor(doctor_id: int, payload: Dict[str, Any], pool: aiomysql.Pool = Depends(get_pool)) -> Dict[str, Any]:
    avatar_payload = normalize_avatar(payload.get("avatarImage"))
    fee = payload.get("registrationFee", 10.00)
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE doctors SET name=%s, title=%s, expertise=%s, intro=%s,
                hospital_id=%s, hospital_name=%s, department_name=%s, avatar_image=%s, registration_fee=%s
                WHERE id=%s
                """,
                [
                    payload.get("name"),
                    payload.get("title"),
                    payload.get("expertise"),
                    payload.get("intro"),
                    payload.get("hospitalId"),
                    payload.get("hospitalName"),
                    payload.get("departmentName"),
                    avatar_payload,
                    fee,
                    doctor_id,
                ],
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Doctor not found")
    row = await fetch_one("SELECT * FROM doctors WHERE id = %s", [doctor_id], pool)
    return map_doctor_row(row)


@app.delete("/api/admin/doctors/{doctor_id}", status_code=204)
async def delete_doctor(doctor_id: int, pool: aiomysql.Pool = Depends(get_pool)) -> Response:
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("DELETE FROM doctors WHERE id = %s", [doctor_id])
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Doctor not found")
    return Response(status_code=204)


@app.post("/api/decrypt-phone")
async def decrypt_phone(body: Dict[str, Any]) -> Dict[str, Any]:
    code = body.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="code is required")
    app_id = os.getenv("WECHAT_APPID")
    app_secret = os.getenv("WECHAT_APP_SECRET")
    if not app_id or not app_secret:
        raise HTTPException(status_code=500, detail="Missing WeChat credentials")
    token_url = (
        f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={app_id}&secret={app_secret}"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        token_resp = await client.get(token_url)
        token_data = token_resp.json()
        if token_data.get("errcode"):
            raise HTTPException(status_code=500, detail=token_data.get("errmsg", "Failed to get access token"))
        access_token = token_data.get("access_token")
        phone_url = f"https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token={access_token}"
        phone_resp = await client.post(phone_url, json={"code": code})
        phone_data = phone_resp.json()
        if phone_data.get("errcode") != 0:
            raise HTTPException(status_code=500, detail=phone_data.get("errmsg", "Failed to decrypt phone number"))
    phone_info = phone_data.get("phone_info", {})
    phone_number = phone_info.get("purePhoneNumber") or phone_info.get("phoneNumber")
    return {"success": True, "phoneNumber": phone_number, "countryCode": phone_info.get("countryCode")}


@app.post("/api/wechat/send-booking-notification")
async def send_booking_notification(body: Dict[str, Any]) -> Dict[str, Any]:
    webhook_url = body.get("webhookUrl")
    order_number = body.get("orderNumber")
    project_name = body.get("projectName")
    phone = body.get("phone")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="webhookUrl is required")
    if not order_number or not project_name or not phone:
        raise HTTPException(status_code=400, detail="orderNumber, projectName and phone are required")
    bot = WechatBot(webhook_url)
    submit_time = body.get(
        "submitTime",
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )
    result = await bot.send_booking_notification(
        {
            "orderNumber": order_number,
            "projectName": project_name,
            "phone": phone,
            "message": body.get("message") or "授权号码",
            "submitTime": submit_time,
        },
        mention_all=body.get("mentionAll", True),
    )
    return {"success": True, "message": "Notification sent successfully", "data": result}


@app.post("/api/wechat/send-text")
async def send_wechat_text(body: Dict[str, Any]) -> Dict[str, Any]:
    webhook_url = body.get("webhookUrl")
    content = body.get("content")
    if not webhook_url or not content:
        raise HTTPException(status_code=400, detail="webhookUrl and content are required")
    bot = WechatBot(webhook_url)
    result = await bot.send_text(content, body.get("mentionedList") or [], body.get("mentionedMobileList") or [])
    return {"success": True, "message": "Text message sent successfully", "data": result}


@app.post("/api/wechat/send-markdown")
async def send_wechat_markdown(body: Dict[str, Any]) -> Dict[str, Any]:
    webhook_url = body.get("webhookUrl")
    content = body.get("content")
    if not webhook_url or not content:
        raise HTTPException(status_code=400, detail="webhookUrl and content are required")
    bot = WechatBot(webhook_url)
    result = await bot.send_markdown(content)
    return {"success": True, "message": "Markdown message sent successfully", "data": result}


@app.get("/api/doctors/{doctor_id}/schedules")
async def get_doctor_schedules(
    doctor_id: int,
    startDate: Optional[str] = Query(default=None),
    pool: aiomysql.Pool = Depends(get_pool),
) -> List[Dict[str, Any]]:
    start = startDate or date.today().isoformat()
    schedules = await fetch_all(
        """
        SELECT * FROM doctor_schedules
        WHERE doctor_id = %s AND schedule_date >= %s
        ORDER BY schedule_date, period
        """,
        [doctor_id, start],
        pool,
    )
    return schedules


@app.post("/api/admin/schedules")
async def save_schedule(body: Dict[str, Any], pool: aiomysql.Pool = Depends(get_pool)) -> Dict[str, Any]:
    doctor_id = body.get("doctorId")
    schedule_date = body.get("scheduleDate")
    period = body.get("period")
    total_slots = body.get("totalSlots")
    if not doctor_id or not schedule_date or not period or total_slots is None:
        raise HTTPException(status_code=400, detail="Missing required fields")
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO doctor_schedules (doctor_id, schedule_date, period, total_slots, remaining_slots)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE total_slots=VALUES(total_slots), remaining_slots=VALUES(remaining_slots)
                """,
                [doctor_id, schedule_date, period, total_slots, total_slots],
            )
            new_id = cur.lastrowid
    return {"success": True, "message": "Schedule saved successfully", "id": new_id}


@app.post("/api/admin/schedules/batch")
async def batch_schedules(body: Dict[str, Any], pool: aiomysql.Pool = Depends(get_pool)) -> Dict[str, Any]:
    doctor_id = body.get("doctorId")
    days = body.get("days")
    start_date = body.get("startDate")
    end_date = body.get("endDate")
    morning_slots = body.get("morningSlots")
    afternoon_slots = body.get("afternoonSlots")
    if not doctor_id:
        raise HTTPException(status_code=400, detail="Missing doctorId")
    dates: List[str] = []
    if start_date and end_date:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        current = start_dt
        while current <= end_dt:
            dates.append(current.date().isoformat())
            current += timedelta(days=1)
    elif days:
        today = date.today()
        for i in range(int(days)):
            target = today + timedelta(days=i)
            dates.append(target.isoformat())
    else:
        raise HTTPException(status_code=400, detail="Missing date range or days parameter")

    async with pool.acquire() as conn:
        conn.autocommit(False)
        try:
            async with conn.cursor() as cur:
                for date_str in dates:
                    if morning_slots is not None and morning_slots >= 0:
                        await cur.execute(
                            """
                            INSERT INTO doctor_schedules (doctor_id, schedule_date, period, total_slots, remaining_slots)
                            VALUES (%s, %s, '上午', %s, %s)
                            ON DUPLICATE KEY UPDATE total_slots=VALUES(total_slots), remaining_slots=VALUES(remaining_slots)
                            """,
                            [doctor_id, date_str, morning_slots, morning_slots],
                        )
                    if afternoon_slots is not None and afternoon_slots >= 0:
                        await cur.execute(
                            """
                            INSERT INTO doctor_schedules (doctor_id, schedule_date, period, total_slots, remaining_slots)
                            VALUES (%s, %s, '下午', %s, %s)
                            ON DUPLICATE KEY UPDATE total_slots=VALUES(total_slots), remaining_slots=VALUES(remaining_slots)
                            """,
                            [doctor_id, date_str, afternoon_slots, afternoon_slots],
                        )
                await conn.commit()
        except Exception:
            await conn.rollback()
            conn.autocommit(True)
            raise
        conn.autocommit(True)
    return {"success": True, "message": f"Successfully set schedules for {len(dates)} days"}


@app.get("/api/admin/schedules")
async def admin_get_schedules(
    doctorId: Optional[int] = Query(default=None),
    startDate: Optional[str] = Query(default=None),
    endDate: Optional[str] = Query(default=None),
    pool: aiomysql.Pool = Depends(get_pool),
) -> List[Dict[str, Any]]:
    sql = """
        SELECT s.*, d.name as doctor_name, d.hospital_name, d.department_name
        FROM doctor_schedules s
        LEFT JOIN doctors d ON s.doctor_id = d.id
        WHERE 1=1
    """
    params: List[Any] = []
    if doctorId:
        sql += " AND s.doctor_id = %s"
        params.append(doctorId)
    if startDate:
        sql += " AND s.schedule_date >= %s"
        params.append(startDate)
    if endDate:
        sql += " AND s.schedule_date <= %s"
        params.append(endDate)
    if not startDate and not endDate:
        sql += " AND s.schedule_date >= CURDATE()"
    sql += " ORDER BY s.schedule_date, s.doctor_id, s.period"
    schedules = await fetch_all(sql, params, pool)

    if doctorId and startDate and endDate:
        merged: List[Dict[str, Any]] = []
        date_map: Dict[str, Dict[str, Any]] = {}
        for schedule in schedules:
            key = schedule["schedule_date"].isoformat() if isinstance(schedule["schedule_date"], (date, datetime)) else schedule["schedule_date"]
            if key not in date_map:
                date_map[key] = {
                    "date": key,
                    "morningSlots": 0,
                    "afternoonSlots": 0,
                    "morningId": None,
                    "afternoonId": None,
                }
            item = date_map[key]
            if schedule["period"] == "上午":
                item["morningSlots"] = schedule["total_slots"]
                item["morningId"] = schedule["id"]
            elif schedule["period"] == "下午":
                item["afternoonSlots"] = schedule["total_slots"]
                item["afternoonId"] = schedule["id"]

        current = datetime.fromisoformat(startDate)
        end_dt = datetime.fromisoformat(endDate)
        while current <= end_dt:
            key = current.date().isoformat()
            item = date_map.get(key)
            if item:
                merged.append(
                    {
                        "id": item["morningId"] or item["afternoonId"],
                        "date": key,
                        "morningSlots": item["morningSlots"],
                        "afternoonSlots": item["afternoonSlots"],
                    }
                )
            else:
                merged.append({"id": None, "date": key, "morningSlots": 0, "afternoonSlots": 0})
            current += timedelta(days=1)
        return merged

    return schedules


@app.put("/api/admin/schedules/{schedule_id}")
async def update_schedule(schedule_id: int, body: Dict[str, Any], pool: aiomysql.Pool = Depends(get_pool)) -> Dict[str, Any]:
    slots = body.get("totalSlots")
    if slots is None:
        slots = body.get("morningSlots") if body.get("morningSlots") is not None else body.get("afternoonSlots")
    if slots is None:
        raise HTTPException(status_code=400, detail="No fields to update")
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE doctor_schedules SET total_slots=%s, remaining_slots=%s WHERE id = %s",
                [slots, slots, schedule_id],
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Schedule not found")
    return {"success": True, "message": "Schedule updated successfully"}


@app.post("/api/appointments", status_code=201)
async def create_appointment(body: Dict[str, Any], pool: aiomysql.Pool = Depends(get_pool)) -> JSONResponse:
    doctor_id = body.get("doctorId")
    schedule_date = body.get("scheduleDate")
    period = body.get("period")
    patient_name = body.get("patientName")
    patient_phone = body.get("patientPhone")
    if not doctor_id or not schedule_date or not period or not patient_name or not patient_phone:
        raise HTTPException(status_code=400, detail="Missing required fields")

    async with pool.acquire() as conn:
        conn.autocommit(False)
        try:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT * FROM doctor_schedules
                    WHERE doctor_id = %s AND schedule_date = %s AND period = %s
                    FOR UPDATE
                    """,
                    [doctor_id, schedule_date, period],
                )
                schedule = await cur.fetchone()
                if not schedule:
                    await conn.rollback()
                    conn.autocommit(True)
                    raise HTTPException(status_code=400, detail="该时段暂无号源")
                if schedule["remaining_slots"] <= 0:
                    await conn.rollback()
                    conn.autocommit(True)
                    raise HTTPException(status_code=400, detail="该时段号源已满")

                await cur.execute(
                    "UPDATE doctor_schedules SET remaining_slots = remaining_slots - 1 WHERE id = %s",
                    [schedule["id"]],
                )
                await cur.execute(
                    """
                    INSERT INTO appointments
                    (doctor_id, doctor_name, hospital_name, department_name, schedule_date, period,
                    patient_name, patient_gender, patient_age, patient_phone, symptoms, registration_fee, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
                    """,
                    [
                        doctor_id,
                        body.get("doctorName"),
                        body.get("hospitalName"),
                        body.get("departmentName"),
                        schedule_date,
                        period,
                        patient_name,
                        body.get("patientGender"),
                        body.get("patientAge"),
                        patient_phone,
                        body.get("symptoms"),
                        body.get("registrationFee"),
                    ],
                )
                new_id = cur.lastrowid
                await conn.commit()
        except Exception:
            await conn.rollback()
            conn.autocommit(True)
            raise
        conn.autocommit(True)

    appointment = await fetch_one("SELECT * FROM appointments WHERE id = %s", [new_id], pool)
    return JSONResponse(
        status_code=201,
        content={"success": True, "message": "预约成功", "appointment": appointment},
    )


@app.get("/api/appointments")
async def list_appointments(
    phone: Optional[str] = Query(default=None),
    doctorId: Optional[int] = Query(default=None),
    status: Optional[str] = Query(default=None),
    pool: aiomysql.Pool = Depends(get_pool),
) -> List[Dict[str, Any]]:
    sql = "SELECT * FROM appointments WHERE 1=1"
    params: List[Any] = []
    if phone:
        sql += " AND patient_phone = %s"
        params.append(phone)
    if doctorId:
        sql += " AND doctor_id = %s"
        params.append(doctorId)
    if status:
        sql += " AND status = %s"
        params.append(status)
    sql += " ORDER BY created_at DESC"
    return await fetch_all(sql, params, pool)


@app.put("/api/appointments/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: int, pool: aiomysql.Pool = Depends(get_pool)) -> Dict[str, Any]:
    async with pool.acquire() as conn:
        conn.autocommit(False)
        try:
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM appointments WHERE id = %s FOR UPDATE", [appointment_id])
                appointment = await cur.fetchone()
                if not appointment:
                    await conn.rollback()
                    conn.autocommit(True)
                    raise HTTPException(status_code=404, detail="Appointment not found")
                if appointment.get("status") == "cancelled":
                    await conn.rollback()
                    conn.autocommit(True)
                    raise HTTPException(status_code=400, detail="Appointment already cancelled")
                await cur.execute(
                    'UPDATE appointments SET status = "cancelled" WHERE id = %s',
                    [appointment_id],
                )
                await cur.execute(
                    """
                    UPDATE doctor_schedules
                    SET remaining_slots = remaining_slots + 1
                    WHERE doctor_id = %s AND schedule_date = %s AND period = %s
                    """,
                    [appointment["doctor_id"], appointment["schedule_date"], appointment["period"]],
                )
                await conn.commit()
        except Exception:
            await conn.rollback()
            conn.autocommit(True)
            raise
        conn.autocommit(True)
    return {"success": True, "message": "Appointment cancelled successfully"}
