import httpx


class WechatBot:
    def __init__(self, webhook_url: str) -> None:
        if not webhook_url:
            raise ValueError("Webhook URL is required")
        self.webhook_url = webhook_url

    async def _post(self, payload: dict) -> dict:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(self.webhook_url, json=payload)
            data = resp.json()
            if data.get("errcode") != 0:
                raise ValueError(f"企业微信API错误: {data.get('errmsg')} (errcode: {data.get('errcode')})")
            return data

    async def send_text(self, content: str, mentioned_list=None, mentioned_mobile_list=None) -> dict:
        payload = {
            "msgtype": "text",
            "text": {
                "content": content,
                "mentioned_list": mentioned_list or [],
                "mentioned_mobile_list": mentioned_mobile_list or [],
            },
        }
        return await self._post(payload)

    async def send_markdown(self, content: str) -> dict:
        payload = {"msgtype": "markdown", "markdown": {"content": content}}
        return await self._post(payload)

    async def send_booking_notification(self, booking_info: dict, mention_all: bool = True) -> dict:
        order_number = booking_info.get("orderNumber")
        project_name = booking_info.get("projectName")
        phone = booking_info.get("phone")
        message = booking_info.get("message")
        submit_time = booking_info.get("submitTime")
        content = (
            f"【今日第 {order_number} 单】\n"
            f"项目：{project_name}\n"
            f"电话：{phone}\n"
            f"留言：{message}\n\n"
            f"提交时间：{submit_time}"
        )
        mentioned = ["@all"] if mention_all else []
        return await self.send_text(content, mentioned_list=mentioned)
