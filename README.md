# 医疗预约小程序

这是一个医疗预约小程序项目，包含小程序前端和后端服务。

## 项目结构

```
.
├── pages/              # 小程序页面
├── components/         # 小程序组件
├── utils/             # 工具函数
├── assets/            # 静态资源
└── backend/           # 后端服务
    ├── server.js                    # 主服务文件
    ├── wechatBot.js                 # 企业微信机器人工具
    ├── admin/                       # 管理后台
    │   └── wechat-test.html        # 企业微信测试页面
    ├── QUICKSTART.md                # 快速开始指南
    ├── WECHAT_BOT_README.md        # 详细使用文档
    ├── PROJECT_SUMMARY.md           # 项目总结
    └── integration-example.js       # 集成示例代码
```

## 🤖 企业微信群消息推送工具

本项目已集成企业微信群消息推送功能，可以在预约成功后自动向企业微信群发送通知。

### 快速开始

1. **启动后端服务**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **打开测试页面**
   ```
   http://localhost:4000/admin/wechat-test.html
   ```

3. **配置企业微信机器人**
   - 在企业微信群中添加机器人
   - 获取 Webhook 地址
   - 在测试页面中填入 Webhook 地址

### 文档说明

- **[快速开始指南](backend/QUICKSTART.md)** - 3步快速上手
- **[详细使用文档](backend/WECHAT_BOT_README.md)** - 完整的API文档和示例
- **[项目总结](backend/PROJECT_SUMMARY.md)** - 功能说明和使用指南
- **[集成示例](backend/integration-example.js)** - 如何在小程序中集成

### 主要功能

✅ 发送预约通知消息（格式化）
✅ 发送自定义文本消息
✅ 发送 Markdown 消息
✅ 支持 @所有人或特定用户
✅ Web 可视化测试界面
✅ 命令行测试工具

### 消息示例

```
【今日第 7 单】
项目：衡阳肤康皮肤病医院
电话：18684039042
留言：授权号码

提交时间：2025-12-03 14:05:49
@所有人
```

## 小程序功能

- 医院列表展示
- 医生团队查看
- 在线预约挂号
- 个人中心管理
- 预约记录查询

## 技术栈

### 小程序端
- 微信小程序原生开发
- WXML + WXSS + JavaScript

### 后端
- Node.js + Express
- MySQL 数据库
- 企业微信机器人 API

## 开发说明

### 小程序开发

1. 使用微信开发者工具打开项目
2. 配置 `utils/api.js` 中的 API 地址
3. 开始开发

### 后端开发

1. 配置数据库连接（`.env` 文件）
2. 导入数据库结构（`schema.sql`）
3. 启动服务：`npm start`

## 环境配置

复制 `backend/.env.example` 为 `backend/.env`，并配置：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=medical_points
PORT=4000
```

## API 接口

### 医生相关
- `GET /api/doctors` - 获取医生列表
- `GET /api/doctors/:id` - 获取医生详情
- `POST /api/admin/doctors` - 创建医生
- `PUT /api/admin/doctors/:id` - 更新医生
- `DELETE /api/admin/doctors/:id` - 删除医生

### 企业微信推送
- `POST /api/wechat/send-booking-notification` - 发送预约通知
- `POST /api/wechat/send-text` - 发送文本消息
- `POST /api/wechat/send-markdown` - 发送 Markdown 消息

详细 API 文档请查看 [WECHAT_BOT_README.md](backend/WECHAT_BOT_README.md)

## 许可证

MIT
