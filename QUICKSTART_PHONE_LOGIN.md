# 🚀 快速开始 - 手机号授权登录

## 第一步：安装依赖

```bash
cd backend
npm install
```

这会自动安装包括 `axios` 在内的所有依赖。

## 第二步：配置环境变量

在 `backend` 目录下创建 `.env` 文件：

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，填入你的微信小程序配置：

```env
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=medical_points

# 服务器配置
PORT=4000

# 微信小程序配置（必填）
WECHAT_APPID=你的小程序AppID
WECHAT_APP_SECRET=你的小程序AppSecret
```

### 如何获取 AppID 和 AppSecret？

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入你的小程序
3. 点击 **开发 > 开发管理 > 开发设置**
4. 找到 **AppID (小程序ID)** - 直接复制
5. 找到 **AppSecret (小程序密钥)** - 点击"生成"或"重置"

⚠️ **重要提示：**
- AppSecret 只显示一次，请妥善保管
- 不要将 `.env` 文件提交到 Git 仓库
- 手机号授权功能需要小程序完成**企业认证**

## 第三步：启动后端服务

```bash
cd backend
npm start
```

看到以下信息表示启动成功：
```
Doctor service listening on port 4000
```

## 第四步：配置小程序

### 1. 修改小程序 API 地址（如果需要）

如果你的后端不是运行在 `localhost:4000`，需要修改小程序中的 API 地址：

打开 `pages/profile/index.js`，找到：
```javascript
url: 'http://localhost:4000/api/decrypt-phone',
```

改为你的实际地址：
```javascript
url: 'https://your-domain.com/api/decrypt-phone',
```

### 2. 配置服务器域名（生产环境）

在微信公众平台：
1. 进入 **开发 > 开发管理 > 开发设置 > 服务器域名**
2. 在 **request合法域名** 中添加你的后端域名（必须是 HTTPS）

### 3. 开发环境调试

在微信开发者工具中：
1. 点击右上角 **详情**
2. 勾选 **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**

## 第五步：测试功能

1. 打开微信开发者工具
2. 导入小程序项目
3. 进入"我的"页面
4. 点击用户头像区域
5. 在弹出的授权页面点击"允许"
6. 查看是否显示手机号

## 🎉 完成！

现在你的小程序已经支持手机号快捷登录了！

## 📋 功能清单

- ✅ 点击头像弹出微信授权页面
- ✅ 获取用户手机号
- ✅ 手机号本地持久化存储
- ✅ 自动登录（下次打开自动显示）
- ✅ 退出登录功能

## 🐛 常见问题

### 1. 点击授权没有反应？

**检查：**
- 后端服务是否正常运行？
- 控制台是否有错误信息？
- 是否配置了 AppID 和 AppSecret？

### 2. 提示"服务器配置错误"？

**原因：** 未配置 `WECHAT_APPID` 或 `WECHAT_APP_SECRET`

**解决：** 检查 `backend/.env` 文件是否正确配置

### 3. 提示"Failed to get access token"？

**原因：** AppID 或 AppSecret 配置错误

**解决：** 
1. 检查 `.env` 文件中的配置是否正确
2. 确认 AppSecret 是否过期（可以重新生成）

### 4. 提示"Failed to decrypt phone number"？

**原因：** code 无效或已使用

**解决：** 
1. 重新点击授权按钮
2. 检查网络连接
3. 查看后端日志

### 5. 个人小程序无法使用？

**原因：** 手机号快速验证功能需要企业认证

**解决方案：**
- 方案1：完成企业认证（推荐）
- 方案2：使用微信登录获取用户信息（不包含手机号）

## 📞 需要帮助？

查看详细文档：[PHONE_LOGIN_SETUP.md](./PHONE_LOGIN_SETUP.md)

## 🔗 相关链接

- [微信公众平台](https://mp.weixin.qq.com/)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [手机号快速验证组件](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/getPhoneNumber.html)
