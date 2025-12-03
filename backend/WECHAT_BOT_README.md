# 企业微信群消息推送工具使用说明

## 功能介绍

这是一个用于向企业微信群发送消息通知的工具，支持多种消息类型：
- 文本消息
- Markdown 消息
- 预约通知消息（格式化）

## 快速开始

### 1. 获取企业微信群机器人 Webhook 地址

1. 在企业微信群中，点击右上角的 `...` 菜单
2. 选择 `群机器人` -> `添加机器人`
3. 设置机器人名称和头像
4. 复制生成的 Webhook 地址（格式类似：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx`）

### 2. API 接口说明

#### 2.1 发送预约通知消息

**接口地址：** `POST /api/wechat/send-booking-notification`

**请求参数：**

```json
{
  "webhookUrl": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx",
  "orderNumber": 7,
  "projectName": "衡阳肤康皮肤病医院",
  "phone": "18684039042",
  "message": "授权号码",
  "submitTime": "2025-12-03 14:05:49",
  "mentionAll": true
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| webhookUrl | string | 是 | 企业微信群机器人的 Webhook 地址 |
| orderNumber | number | 是 | 今日订单号 |
| projectName | string | 是 | 项目名称 |
| phone | string | 是 | 联系电话 |
| message | string | 否 | 留言信息，默认为"授权号码" |
| submitTime | string | 否 | 提交时间，默认为当前时间 |
| mentionAll | boolean | 否 | 是否@所有人，默认为 true |

**响应示例：**

```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "success": true,
    "data": {
      "errcode": 0,
      "errmsg": "ok"
    }
  }
}
```

#### 2.2 发送自定义文本消息

**接口地址：** `POST /api/wechat/send-text`

**请求参数：**

```json
{
  "webhookUrl": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx",
  "content": "这是一条测试消息",
  "mentionedList": ["@all"],
  "mentionedMobileList": ["13800138000"]
}
```

**参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| webhookUrl | string | 是 | 企业微信群机器人的 Webhook 地址 |
| content | string | 是 | 消息内容 |
| mentionedList | array | 否 | @的用户列表（userid），@所有人使用 ["@all"] |
| mentionedMobileList | array | 否 | @的用户手机号列表 |

#### 2.3 发送 Markdown 消息

**接口地址：** `POST /api/wechat/send-markdown`

**请求参数：**

```json
{
  "webhookUrl": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx",
  "content": "# 标题\n\n这是**加粗**文本\n\n- 列表项1\n- 列表项2"
}
```

## 使用示例

### Node.js 示例

```javascript
const axios = require('axios');

// 发送预约通知
async function sendBookingNotification() {
  try {
    const response = await axios.post('http://localhost:4000/api/wechat/send-booking-notification', {
      webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY',
      orderNumber: 7,
      projectName: '衡阳肤康皮肤病医院',
      phone: '18684039042',
      message: '授权号码',
      submitTime: '2025-12-03 14:05:49',
      mentionAll: true
    });
    
    console.log('发送成功:', response.data);
  } catch (error) {
    console.error('发送失败:', error.response?.data || error.message);
  }
}

sendBookingNotification();
```

### cURL 示例

```bash
curl -X POST http://localhost:4000/api/wechat/send-booking-notification \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY",
    "orderNumber": 7,
    "projectName": "衡阳肤康皮肤病医院",
    "phone": "18684039042",
    "message": "授权号码",
    "submitTime": "2025-12-03 14:05:49",
    "mentionAll": true
  }'
```

### 小程序集成示例

在小程序中调用后端接口发送通知：

```javascript
// 在预约成功后发送企业微信通知
wx.request({
  url: 'http://your-server.com/api/wechat/send-booking-notification',
  method: 'POST',
  data: {
    webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY',
    orderNumber: 7,
    projectName: '衡阳肤康皮肤病医院',
    phone: '18684039042',
    message: '授权号码',
    submitTime: '2025-12-03 14:05:49',
    mentionAll: true
  },
  success(res) {
    console.log('通知发送成功', res.data);
  },
  fail(err) {
    console.error('通知发送失败', err);
  }
});
```

## 直接使用 WechatBot 类

如果你想在代码中直接使用 WechatBot 类：

```javascript
const WechatBot = require('./wechatBot');

// 创建机器人实例
const bot = new WechatBot('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY');

// 发送预约通知
bot.sendBookingNotification({
  orderNumber: 7,
  projectName: '衡阳肤康皮肤病医院',
  phone: '18684039042',
  message: '授权号码',
  submitTime: '2025-12-03 14:05:49'
}, true)
  .then(result => console.log('发送成功', result))
  .catch(error => console.error('发送失败', error));

// 发送普通文本消息
bot.sendText('这是一条测试消息', ['@all'])
  .then(result => console.log('发送成功', result))
  .catch(error => console.error('发送失败', error));

// 发送 Markdown 消息
bot.sendMarkdown('# 标题\n\n这是**加粗**文本')
  .then(result => console.log('发送成功', result))
  .catch(error => console.error('发送失败', error));
```

## 注意事项

1. **Webhook 地址安全**：请妥善保管 Webhook 地址，不要泄露给无关人员
2. **消息频率限制**：企业微信对机器人消息有频率限制，建议不要过于频繁发送
3. **@所有人限制**：频繁 @所有人可能会被限制，请谨慎使用
4. **消息长度限制**：单条消息内容不能超过 2048 字节
5. **错误处理**：建议在生产环境中添加完善的错误处理和日志记录

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 93000 | 无效的 webhook 地址 |
| 93004 | 机器人被移除 |
| 93008 | 消息内容超长 |
| 93009 | 消息发送频率超限 |

## 环境变量配置（可选）

如果你想在 `.env` 文件中配置默认的 Webhook 地址：

```env
WECHAT_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY
```

然后在代码中使用：

```javascript
const webhookUrl = process.env.WECHAT_WEBHOOK_URL;
const bot = new WechatBot(webhookUrl);
```

## 技术支持

如有问题，请参考企业微信官方文档：
https://developer.work.weixin.qq.com/document/path/91770
