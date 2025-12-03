# 医疗预约小程序

这是一个医疗预约小程序项目，包含小程序前端和后端服务。

> 📚 **[查看完整文档索引](DOCS_INDEX.md)** - 快速找到你需要的文档

## 项目结构

```
.
├── pages/              # 小程序页面
├── components/         # 小程序组件
├── utils/             # 工具函数
├── assets/            # 静态资源
├── backend/           # 后端服务
│   ├── server.js                    # 主服务文件
│   ├── wechatBot.js                 # 企业微信机器人工具
│   ├── admin/                       # 管理后台
│   │   ├── login.html              # 登录页面
│   │   ├── index.html              # 管理主页面
│   │   └── wechat-test.html        # 企业微信测试页面
│   ├── QUICKSTART.md                # 快速开始指南
│   ├── WECHAT_BOT_README.md        # 详细使用文档
│   ├── PROJECT_SUMMARY.md           # 项目总结
│   └── integration-example.js       # 集成示例代码
├── ADMIN_GUIDE.md                   # 管理后台使用说明
├── ADMIN_QUICKSTART.md              # 管理后台快速开始
├── ADMIN_SCREENSHOTS.md             # 管理后台功能截图说明
├── ADMIN_TEST_GUIDE.md              # 管理后台测试指南
├── ADMIN_SUMMARY.md                 # 管理后台升级总结
└── CHANGELOG.md                     # 更新日志
```

## 🎯 管理后台系统

本项目提供了功能完善的管理后台，用于管理医生信息和号源。

### 快速访问

1. **启动后端服务**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **访问登录页面**
   ```
   http://localhost:4000/admin/login.html
   ```

3. **登录信息**
   - 用户名：`admin`
   - 密码：`Aa121212`
   - 验证码：输入图片中的字符

### 主要功能

✅ 登录认证系统（用户名密码 + 验证码）
✅ 医生基础信息管理（CRUD操作）
✅ 医生号源信息管理（批量设置、可视化展示）
✅ 左侧菜单导航
✅ 现代化UI设计
✅ 响应式布局

### 文档说明

- **[管理后台使用说明](ADMIN_GUIDE.md)** - 详细的功能说明和操作步骤
- **[快速开始指南](ADMIN_QUICKSTART.md)** - 5分钟快速上手
- **[功能截图说明](ADMIN_SCREENSHOTS.md)** - 界面和功能展示
- **[测试指南](ADMIN_TEST_GUIDE.md)** - 完整的测试用例
- **[升级总结](ADMIN_SUMMARY.md)** - 技术实现和功能对比

### 核心功能

#### 1. 医生基础信息管理
- 添加/编辑/删除医生
- 头像上传和预览
- 挂号费用设置
- 医生信息列表展示

#### 2. 医生号源信息管理
- 按医生和日期范围查询号源
- 批量设置号源（支持日期范围）
- 单独修改号源数量
- 可视化展示（日期、星期、上午/下午号源）

---

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

### 号源管理
- `GET /api/schedules` - 获取号源列表（支持按医生和日期查询）
- `GET /api/admin/schedules` - 管理后台获取号源（支持合并格式）
- `POST /api/admin/schedules/batch` - 批量设置号源（支持日期范围）
- `PUT /api/admin/schedules/:id` - 更新单个号源

### 预约管理
- `POST /api/appointments` - 创建预约
- `GET /api/appointments` - 查询预约记录
- `PUT /api/appointments/:id/cancel` - 取消预约

### 企业微信推送
- `POST /api/wechat/send-booking-notification` - 发送预约通知
- `POST /api/wechat/send-text` - 发送文本消息
- `POST /api/wechat/send-markdown` - 发送 Markdown 消息

详细 API 文档请查看 [WECHAT_BOT_README.md](backend/WECHAT_BOT_README.md)

## 许可证

MIT
