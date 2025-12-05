import os
from datetime import datetime
from typing import Any, Dict

import httpx
from fastapi import APIRouter, HTTPException

from backend_fastapi.wechat_bot import WechatBot

router = APIRouter(prefix="/api", tags=["wechat"])


@router.post("/decrypt-phone")
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


@router.post("/wechat/send-booking-notification")
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


@router.post("/wechat/send-text")
async def send_wechat_text(body: Dict[str, Any]) -> Dict[str, Any]:
    webhook_url = body.get("webhookUrl")
    content = body.get("content")
    if not webhook_url or not content:
        raise HTTPException(status_code=400, detail="webhookUrl and content are required")
    bot = WechatBot(webhook_url)
    result = await bot.send_text(content, body.get("mentionedList") or [], body.get("mentionedMobileList") or [])
    return {"success": True, "message": "Text message sent successfully", "data": result}


@router.post("/wechat/send-markdown")
async def send_wechat_markdown(body: Dict[str, Any]) -> Dict[str, Any]:
    webhook_url = body.get("webhookUrl")
    content = body.get("content")
    if not webhook_url or not content:
        raise HTTPException(status_code=400, detail="webhookUrl and content are required")
    bot = WechatBot(webhook_url)
    result = await bot.send_markdown(content)
    return {"success": True, "message": "Markdown message sent successfully", "data": result}
