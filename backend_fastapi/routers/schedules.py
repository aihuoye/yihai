from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend_fastapi.db import get_pool
from backend_fastapi.utils import fetch_all, fetch_one

router = APIRouter(prefix="/api", tags=["schedules"])


@router.get("/doctors/{doctor_id}/schedules")
async def get_doctor_schedules(
    doctor_id: str,
    startDate: Optional[str] = Query(default=None),
    pool=Depends(get_pool),
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


@router.post("/admin/schedules")
async def save_schedule(body: Dict[str, Any], pool=Depends(get_pool)) -> Dict[str, Any]:
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


@router.post("/admin/schedules/batch")
async def batch_schedules(body: Dict[str, Any], pool=Depends(get_pool)) -> Dict[str, Any]:
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


@router.get("/admin/schedules")
async def admin_get_schedules(
    doctorId: Optional[str] = Query(default=None),
    startDate: Optional[str] = Query(default=None),
    endDate: Optional[str] = Query(default=None),
    pool=Depends(get_pool),
) -> List[Dict[str, Any]]:
    sql = """
        SELECT s.*, d.name as doctor_name, d.hospital_name, d.department_name
        FROM doctor_schedules s
        LEFT JOIN doctors d ON s.doctor_id = d.doctor_id
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
                        "date": key,
                        "morningSlots": item["morningSlots"],
                        "afternoonSlots": item["afternoonSlots"],
                        "morningId": item["morningId"],
                        "afternoonId": item["afternoonId"],
                        "doctorId": doctorId,
                    }
                )
            else:
                merged.append({"date": key, "morningSlots": 0, "afternoonSlots": 0, "morningId": None, "afternoonId": None, "doctorId": doctorId})
            current += timedelta(days=1)
        return merged

    return schedules


@router.post("/admin/schedules/updateOne")
async def update_schedule(body: Dict[str, Any], pool=Depends(get_pool)) -> Dict[str, Any]:
    schedule_id = body.get("scheduleId")
    if not schedule_id:
        raise HTTPException(status_code=400, detail="scheduleId is required")
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
