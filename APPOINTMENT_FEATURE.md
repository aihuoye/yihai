# 预约功能开发文档

## 📋 功能概述

本次开发实现了完整的医生预约挂号功能，包括：

1. **医生挂号费用管理** - 为每位医生设置挂号费用
2. **号源管理** - 管理每位医生每天的号源数量
3. **预约功能** - 用户可以在小程序中预约医生
4. **号源扣减** - 预约成功后自动扣减号源
5. **预约记录** - 保存所有预约记录

## 🗄️ 数据库变更

### 1. 执行数据库迁移

在MySQL中执行以下SQL文件：

```bash
mysql -u root -p medical_points < backend/database-migration.sql
```

或者手动执行SQL：

```sql
-- 1. 为医生表添加挂号费用字段
ALTER TABLE doctors ADD COLUMN registration_fee DECIMAL(10,2) DEFAULT 10.00 COMMENT '挂号费用（元）';

-- 2. 创建医生号源管理表
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL COMMENT '医生ID',
  schedule_date DATE NOT NULL COMMENT '排班日期',
  period VARCHAR(10) NOT NULL COMMENT '时段：上午/下午',
  total_slots INT NOT NULL DEFAULT 20 COMMENT '总号源数量',
  remaining_slots INT NOT NULL DEFAULT 20 COMMENT '剩余号源数量',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_schedule (doctor_id, schedule_date, period),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  INDEX idx_doctor_date (doctor_id, schedule_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 创建预约记录表
CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL COMMENT '医生ID',
  doctor_name VARCHAR(100) NOT NULL COMMENT '医生姓名',
  hospital_name VARCHAR(200) COMMENT '医院名称',
  department_name VARCHAR(100) COMMENT '科室名称',
  schedule_date DATE NOT NULL COMMENT '预约日期',
  period VARCHAR(10) NOT NULL COMMENT '时段：上午/下午',
  patient_name VARCHAR(100) NOT NULL COMMENT '就诊人姓名',
  patient_gender VARCHAR(10) COMMENT '就诊人性别',
  patient_age INT COMMENT '就诊人年龄',
  patient_phone VARCHAR(20) NOT NULL COMMENT '预约电话',
  symptoms TEXT COMMENT '病情症状描述',
  registration_fee DECIMAL(10,2) COMMENT '挂号费用',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '预约状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  INDEX idx_doctor (doctor_id),
  INDEX idx_date (schedule_date),
  INDEX idx_phone (patient_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 🚀 使用指南

### 1. 管理后台操作

访问：`http://localhost:4000/admin/index.html`

#### 设置医生挂号费用

1. 点击"编辑"按钮编辑医生信息
2. 在"挂号费用（元）"字段输入费用，如：10.00
3. 点击"保存"

#### 设置医生号源

1. 在医生列表中点击"号源"按钮
2. 输入要设置的天数（如：7天）
3. 输入每天上午的号源数量（如：20）
4. 输入每天下午的号源数量（如：20）
5. 系统会自动为该医生设置未来N天的号源

### 2. 小程序使用流程

#### 用户预约流程

1. **进入医生详情页**
   - 在首页或医生列表中点击医生卡片
   - 进入医生详情页面

2. **选择预约日期**
   - 在"挂号"标签页中查看可预约日期
   - 点击某个日期的"预约"按钮

3. **填写预约信息**
   - 系统显示医生姓名和挂号费用
   - 选择预约时段（上午/下午）
   - 输入预约电话
   - 填写就诊人信息：
     - 就诊人姓名
     - 性别
     - 年龄
     - 病情症状描述

4. **提交预约**
   - 点击"确定预约"按钮
   - 系统验证信息并提交
   - 预约成功后自动扣减号源

## 🔌 API接口文档

### 号源管理接口

#### 1. 获取医生号源

```
GET /api/doctors/:id/schedules?startDate=2025-12-04
```

响应：
```json
[
  {
    "id": 1,
    "doctor_id": 1,
    "schedule_date": "2025-12-04",
    "period": "上午",
    "total_slots": 20,
    "remaining_slots": 15
  }
]
```

#### 2. 设置单个号源（管理后台）

```
POST /api/admin/schedules
Content-Type: application/json

{
  "doctorId": 1,
  "scheduleDate": "2025-12-04",
  "period": "上午",
  "totalSlots": 20
}
```

#### 3. 批量设置号源（管理后台）

```
POST /api/admin/schedules/batch
Content-Type: application/json

{
  "doctorId": 1,
  "days": 7,
  "morningSlots": 20,
  "afternoonSlots": 20
}
```

### 预约接口

#### 1. 创建预约

```
POST /api/appointments
Content-Type: application/json

{
  "doctorId": 1,
  "doctorName": "刘志勇",
  "hospitalName": "衡阳肤康皮肤病医院",
  "departmentName": "皮肤科",
  "scheduleDate": "2025-12-04",
  "period": "上午",
  "patientName": "张三",
  "patientGender": "男",
  "patientAge": 30,
  "patientPhone": "13800138000",
  "symptoms": "皮肤瘙痒",
  "registrationFee": 10.00
}
```

响应：
```json
{
  "success": true,
  "message": "预约成功",
  "appointment": {
    "id": 1,
    "doctor_id": 1,
    "schedule_date": "2025-12-04",
    "period": "上午",
    "patient_name": "张三",
    "status": "pending"
  }
}
```

#### 2. 查询预约记录

```
GET /api/appointments?phone=13800138000
```

#### 3. 取消预约

```
PUT /api/appointments/:id/cancel
```

## 📱 小程序页面

### 新增页面

- **pages/appointment-detail/index** - 预约详情页面
  - 显示医生信息和挂号费用
  - 选择预约时段
  - 填写就诊人信息
  - 提交预约

### 修改页面

- **pages/doctor-detail/index** - 医生详情页面
  - 修改预约按钮逻辑，跳转到预约详情页面

## 🎯 功能特点

### 1. 号源管理

- ✅ 支持按医生、日期、时段设置号源
- ✅ 批量设置未来N天的号源
- ✅ 预约时自动扣减号源
- ✅ 取消预约时自动恢复号源
- ✅ 使用数据库事务保证数据一致性

### 2. 预约功能

- ✅ 实时检查号源是否充足
- ✅ 支持上午/下午时段选择
- ✅ 完整的就诊人信息采集
- ✅ 手机号格式验证
- ✅ 预约记录持久化存储

### 3. 用户体验

- ✅ 清晰的预约流程
- ✅ 友好的表单验证提示
- ✅ 实时显示挂号费用
- ✅ 自动填充用户昵称
- ✅ 预约成功后自动返回

## 🔧 技术实现

### 后端技术

- **Node.js + Express** - Web框架
- **MySQL** - 数据库
- **事务处理** - 保证号源扣减的原子性
- **连接池** - 提高数据库性能

### 前端技术

- **微信小程序原生开发**
- **RESTful API调用**
- **表单验证**
- **状态管理**

## 📝 注意事项

1. **数据库迁移**
   - 必须先执行数据库迁移SQL
   - 确保数据库连接配置正确

2. **号源设置**
   - 建议提前设置未来7-30天的号源
   - 可以随时调整号源数量

3. **预约限制**
   - 号源为0时无法预约
   - 同一时段可能被多人同时预约，使用事务锁避免超卖

4. **API地址**
   - 小程序中的API地址需要根据实际部署修改
   - 当前使用：`http://localhost:4000/api`

## 🐛 故障排查

### 预约失败

1. 检查数据库是否执行了迁移SQL
2. 检查医生是否设置了号源
3. 检查号源是否已满
4. 查看后端日志错误信息

### 号源设置失败

1. 检查医生ID是否正确
2. 检查数据库连接是否正常
3. 查看后端控制台错误日志

## 🎉 完成清单

- ✅ 数据库表结构设计
- ✅ 后端API接口开发
- ✅ 管理后台功能扩展
- ✅ 小程序预约页面开发
- ✅ 预约流程集成
- ✅ 号源管理功能
- ✅ 文档编写

## 📞 技术支持

如有问题，请检查：
1. 数据库是否正确迁移
2. 后端服务是否正常运行
3. API地址是否配置正确
4. 浏览器/小程序控制台的错误信息
