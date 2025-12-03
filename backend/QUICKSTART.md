# 企业微信群消息推送工具 - 快速开始

## 📦 已创建的文件

```
backend/
├── wechatBot.js                    # 企业微信机器人核心类
├── server.js                       # 已添加推送API接口
├── test-wechat-bot.js             # 命令行测试脚本
├── .env.example                    # 环境变量配置示例
├── WECHAT_BOT_README.md           # 详细使用文档
└── admin/
    └── wechat-test.html           # Web测试页面
```

## 🚀 快速开始（3步）

### 第1步：获取企业微信群机器人 Webhook 地址

1. 在企业微信群中，点击右上角 `...` 菜单
2. 选择 `群机器人` → `添加机器人`
3. 设置机器人名称（如：预约通知机器人）
4. 复制生成的 Webhook 地址（类似：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx`）

### 第2步：启动后端服务

```bash
cd backend
npm install
npm start
```

服务将在 `http://localhost:4000` 启动

### 第3步：测试消息推送

#### 方式1：使用 Web 测试页面（推荐）

1. 打开浏览器访问：`http://localhost:4000/admin/wechat-test.html`
2. 填入 Webhook 地址和其他信息
3. 点击"发送通知"按钮

#### 方式2：使用命令行测试

```bash
# 编辑 test-wechat-bot.js，替换 WEBHOOK_URL
node test-wechat-bot.js
```

#### 方式3：使用 cURL 测试

```bash
curl -X POST http://localhost:4000/api/wechat/send-booking-notification \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "你的Webhook地址",
    "orderNumber": 7,
    "projectName": "衡阳肤康皮肤病医院",
    "phone": "18684039042",
    "message": "授权号码",
    "submitTime": "2025-12-03 14:05:49",
    "mentionAll": true
  }'
```

## 📝 API 接口说明

### 1. 发送预约通知

**接口：** `POST /api/wechat/send-booking-notification`

**参数：**
```json
{
  "webhookUrl": "必填 - 企业微信群机器人Webhook地址",
  "orderNumber": "必填 - 订单号（数字）",
  "projectName": "必填 - 项目名称",
  "phone": "必填 - 联系电话",
  "message": "选填 - 留言信息（默认：授权号码）",
  "submitTime": "选填 - 提交时间（默认：当前时间）",
  "mentionAll": "选填 - 是否@所有人（默认：true）"
}
```

### 2. 发送文本消息

**接口：** `POST /api/wechat/send-text`

**参数：**
```json
{
  "webhookUrl": "必填 - Webhook地址",
  "content": "必填 - 消息内容",
  "mentionedList": "选填 - @用户列表，如 ['@all']",
  "mentionedMobileList": "选填 - @手机号列表"
}
```

### 3. 发送 Markdown 消息

**接口：** `POST /api/wechat/send-markdown`

**参数：**
```json
{
  "webhookUrl": "必填 - Webhook地址",
  "content": "必填 - Markdown格式内容"
}
```

## 💡 集成到小程序

在小程序预约成功后调用：

```javascript
// pages/booking/index.js
wx.request({
  url: 'http://your-server.com/api/wechat/send-booking-notification',
  method: 'POST',
  data: {
    webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY',
    orderNumber: 7,
    projectName: '衡阳肤康皮肤病医院',
    phone: '18684039042',
    message: '授权号码',
    submitTime: new Date().toLocaleString('zh-CN'),
    mentionAll: true
  },
  success(res) {
    console.log('通知发送成功', res.data);
  }
});
```

## 🔧 在代码中直接使用

```javascript
const WechatBot = require('./wechatBot');

const bot = new WechatBot('你的Webhook地址');

// 发送预约通知
await bot.sendBookingNotification({
  orderNumber: 7,
  projectName: '衡阳肤康皮肤病医院',
  phone: '18684039042',
  message: '授权号码',
  submitTime: '2025-12-03 14:05:49'
}, true);
```

## ⚠️ 注意事项

1. **Webhook 地址安全**：不要将 Webhook 地址提交到公开的代码仓库
2. **消息频率限制**：避免过于频繁发送消息
3. **@所有人限制**：谨慎使用 @所有人功能
4. **消息长度限制**：单条消息不超过 2048 字节

## 📚 更多文档

- 详细使用文档：[WECHAT_BOT_README.md](./WECHAT_BOT_README.md)
- 企业微信官方文档：https://developer.work.weixin.qq.com/document/path/91770

## 🎯 效果预览

发送的消息格式：

```
【今日第 7 单】
项目：衡阳肤康皮肤病医院
电话：18684039042
留言：授权号码

提交时间：2025-12-03 14:05:49
@所有人
```

## 🐛 常见问题

**Q: 提示"无效的 webhook 地址"？**
A: 请检查 Webhook 地址是否正确，确保是从企业微信群机器人获取的完整地址。

**Q: 消息发送失败？**
A: 检查网络连接，确保服务器可以访问企业微信 API（qyapi.weixin.qq.com）。

**Q: 如何获取今日订单号？**
A: 可以在数据库中查询当天的订单数量，或使用计数器记录。

## 📞 技术支持

如有问题，请查看详细文档或联系技术支持。
