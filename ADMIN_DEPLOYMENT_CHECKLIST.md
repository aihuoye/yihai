# 管理后台部署检查清单

## 📋 部署前检查

### 1. 环境准备
- [ ] Node.js 已安装（建议 v14 或更高版本）
- [ ] MySQL 数据库已安装并运行
- [ ] npm 依赖已安装（`npm install`）

### 2. 数据库配置
- [ ] 数据库已创建（`hospital_appointment`）
- [ ] 数据库迁移脚本已执行（`database-migration.sql`）
- [ ] 数据库连接信息已配置（`server.js`）
- [ ] 数据库连接测试成功

### 3. 文件检查
- [ ] `backend/admin/login.html` 存在
- [ ] `backend/admin/index.html` 已更新
- [ ] `backend/server.js` 已更新
- [ ] 所有文档文件已创建

### 4. 功能测试
- [ ] 后端服务可以正常启动
- [ ] 登录页面可以访问
- [ ] 登录功能正常工作
- [ ] 医生管理功能正常
- [ ] 号源管理功能正常

---

## 🚀 部署步骤

### 步骤1：准备数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库（如果还没有）
CREATE DATABASE IF NOT EXISTS hospital_appointment;

# 使用数据库
USE hospital_appointment;

# 执行迁移脚本
SOURCE /path/to/backend/database-migration.sql;

# 验证表结构
SHOW TABLES;
DESC doctors;
DESC doctor_schedules;
DESC appointments;
```

### 步骤2：配置后端服务

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 检查配置
# 编辑 server.js，确认数据库连接信息正确
```

### 步骤3：启动服务

```bash
# 启动后端服务
npm start

# 应该看到：
# Doctor service listening on port 4000
```

### 步骤4：验证部署

```bash
# 在浏览器中访问：
# http://localhost:4000/admin/login.html

# 使用以下信息登录：
# 用户名：admin
# 密码：Aa121212
```

---

## ✅ 功能验证清单

### 登录功能
- [ ] 可以访问登录页面
- [ ] 验证码正常显示
- [ ] 点击验证码可以刷新
- [ ] 正确的用户名和密码可以登录
- [ ] 错误的用户名或密码无法登录
- [ ] 验证码错误无法登录
- [ ] 登录后跳转到管理页面

### 医生管理功能
- [ ] 可以查看医生列表
- [ ] 可以添加新医生
- [ ] 可以编辑医生信息
- [ ] 可以删除医生
- [ ] 可以上传医生头像
- [ ] 表单验证正常工作
- [ ] 数据保存成功

### 号源管理功能
- [ ] 可以选择医生
- [ ] 可以选择日期范围
- [ ] 可以查询号源
- [ ] 可以批量设置号源
- [ ] 可以单独修改号源
- [ ] 数据保存成功
- [ ] 显示正确的星期信息

### 界面功能
- [ ] 左侧菜单可以切换
- [ ] 顶部显示用户名
- [ ] 退出登录功能正常
- [ ] 页面布局正常
- [ ] 按钮样式正常
- [ ] 表格显示正常

---

## 🔧 配置检查

### 数据库配置
```javascript
// backend/server.js
const pool = mysql.createPool({
  host: 'localhost',        // ✓ 检查主机地址
  user: 'root',             // ✓ 检查用户名
  password: 'your_password', // ✓ 检查密码
  database: 'hospital_appointment', // ✓ 检查数据库名
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

### 端口配置
```javascript
// backend/server.js
const PORT = process.env.PORT || 4000; // ✓ 检查端口号
```

### 登录信息
```javascript
// backend/admin/login.html
// 默认用户名：admin
// 默认密码：Aa121212
// ✓ 如需修改，请在登录页面的验证逻辑中修改
```

---

## 🐛 常见问题排查

### 问题1：无法启动服务
**症状**：运行 `npm start` 报错

**排查步骤**：
1. 检查 Node.js 是否已安装：`node -v`
2. 检查依赖是否已安装：`npm list express mysql2`
3. 检查端口是否被占用：`lsof -i :4000`（Mac/Linux）或 `netstat -ano | findstr :4000`（Windows）
4. 查看错误日志

**解决方案**：
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 或更换端口
# 修改 server.js 中的 PORT 变量
```

### 问题2：无法连接数据库
**症状**：服务启动后报数据库连接错误

**排查步骤**：
1. 检查 MySQL 是否运行：`mysql -u root -p`
2. 检查数据库是否存在：`SHOW DATABASES;`
3. 检查用户权限：`SHOW GRANTS FOR 'root'@'localhost';`
4. 检查连接信息是否正确

**解决方案**：
```sql
-- 创建数据库
CREATE DATABASE hospital_appointment;

-- 授予权限
GRANT ALL PRIVILEGES ON hospital_appointment.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### 问题3：登录页面无法访问
**症状**：访问 `http://localhost:4000/admin/login.html` 显示404

**排查步骤**：
1. 检查服务是否启动
2. 检查文件是否存在：`ls backend/admin/login.html`
3. 检查静态文件配置

**解决方案**：
```javascript
// 确保 server.js 中有以下配置
app.use('/admin', express.static(path.join(__dirname, 'admin')));
```

### 问题4：登录后跳转失败
**症状**：登录成功但没有跳转

**排查步骤**：
1. 打开浏览器控制台查看错误
2. 检查 SessionStorage 是否被禁用
3. 检查浏览器是否支持 JavaScript

**解决方案**：
- 使用现代浏览器（Chrome、Edge、Firefox）
- 启用 JavaScript
- 清除浏览器缓存

### 问题5：验证码不显示
**症状**：登录页面验证码区域空白

**排查步骤**：
1. 打开浏览器控制台查看错误
2. 检查浏览器是否支持 Canvas

**解决方案**：
- 使用支持 Canvas 的浏览器
- 更新浏览器到最新版本

### 问题6：数据保存失败
**症状**：添加或修改数据时提示保存失败

**排查步骤**：
1. 打开浏览器控制台查看网络请求
2. 检查后端日志
3. 检查数据库表结构

**解决方案**：
```bash
# 检查数据库表是否存在
mysql -u root -p hospital_appointment -e "SHOW TABLES;"

# 如果表不存在，执行迁移脚本
mysql -u root -p hospital_appointment < backend/database-migration.sql
```

---

## 📊 性能优化建议

### 数据库优化
- [ ] 为常用查询字段添加索引
- [ ] 定期清理过期数据
- [ ] 配置数据库连接池

### 前端优化
- [ ] 压缩静态资源
- [ ] 启用浏览器缓存
- [ ] 优化图片大小

### 后端优化
- [ ] 启用 gzip 压缩
- [ ] 添加请求日志
- [ ] 实现错误监控

---

## 🔒 安全建议

### 生产环境配置
- [ ] 修改默认密码
- [ ] 使用 HTTPS
- [ ] 配置 CORS
- [ ] 添加请求频率限制
- [ ] 实现 SQL 注入防护
- [ ] 添加 XSS 防护

### 密码安全
```javascript
// 建议使用加密存储密码
const bcrypt = require('bcrypt');

// 注册时加密
const hashedPassword = await bcrypt.hash(password, 10);

// 登录时验证
const isValid = await bcrypt.compare(password, hashedPassword);
```

### Session 安全
```javascript
// 使用 express-session
const session = require('express-session');

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // 仅在 HTTPS 下传输
    httpOnly: true, // 防止 XSS
    maxAge: 3600000 // 1小时过期
  }
}));
```

---

## 📝 部署后检查

### 立即检查
- [ ] 服务正常运行
- [ ] 可以正常登录
- [ ] 所有功能正常工作
- [ ] 没有控制台错误
- [ ] 数据可以正常保存

### 定期检查
- [ ] 检查服务运行状态
- [ ] 检查数据库连接
- [ ] 检查磁盘空间
- [ ] 检查日志文件
- [ ] 备份数据库

---

## 📞 技术支持

### 遇到问题？

1. **查看文档**
   - [使用说明](ADMIN_GUIDE.md)
   - [快速开始](ADMIN_QUICKSTART.md)
   - [测试指南](ADMIN_TEST_GUIDE.md)

2. **检查日志**
   - 浏览器控制台
   - 后端服务日志
   - 数据库日志

3. **联系支持**
   - 技术支持：[联系方式]
   - 问题反馈：[反馈渠道]

---

## ✅ 部署完成确认

完成以下所有检查后，部署即可完成：

- [ ] 数据库配置正确
- [ ] 服务正常启动
- [ ] 登录功能正常
- [ ] 医生管理功能正常
- [ ] 号源管理功能正常
- [ ] 界面显示正常
- [ ] 所有测试用例通过
- [ ] 文档已阅读
- [ ] 备份已完成

**部署日期**：__________  
**部署人员**：__________  
**验证人员**：__________  

---

**祝部署顺利！** 🎉
