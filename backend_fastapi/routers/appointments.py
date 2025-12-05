from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend_fastapi.db import get_pool
from backend_fastapi.utils import fetch_all, fetch_one

router = APIRouter(prefix="/api", tags=["appointments"])


@router.post("/appointments")
async def create_appointment(body: Dict[str, Any], pool=Depends(get_pool)) -> Dict[str, Any]:
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
    return {"success": True, "message": "预约成功", "appointment": appointment}


@router.get("/appointments")
async def list_appointments(
    phone: Optional[str] = Query(default=None),
    doctorId: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    pool=Depends(get_pool),
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


# 取消预约：传入 appointmentId
@router.post("/appointments/cancel")
async def cancel_appointment(body: Dict[str, Any], pool=Depends(get_pool)) -> Dict[str, Any]:
    appointment_id = body.get("appointmentId")
    if not appointment_id:
        raise HTTPException(status_code=400, detail="appointmentId is required")
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
