-- 新版库结构（废弃旧数据，使用 UUID doctor_id，头像用 COS URL）

DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctor_schedules;
DROP TABLE IF EXISTS doctors;

CREATE TABLE doctors (
  doctor_id CHAR(36) PRIMARY KEY COMMENT '医生唯一ID（UUID）',
  name VARCHAR(100) NOT NULL COMMENT '姓名',
  title VARCHAR(100) COMMENT '头衔',
  expertise VARCHAR(255) COMMENT '擅长',
  intro TEXT COMMENT '简介',
  hospital_id VARCHAR(64) COMMENT '医院ID',
  hospital_name VARCHAR(200) COMMENT '医院名称',
  department_name VARCHAR(100) COMMENT '科室名称',
  registration_fee DECIMAL(10,2) DEFAULT 10.00 COMMENT '挂号费用（元）',
  avatar_url VARCHAR(500) COMMENT '头像 COS URL',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='医生信息';

CREATE TABLE doctor_schedules (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  doctor_id CHAR(36) NOT NULL COMMENT '医生ID',
  schedule_date DATE NOT NULL COMMENT '排班日期',
  period VARCHAR(10) NOT NULL COMMENT '时段：上午/下午',
  total_slots INT NOT NULL DEFAULT 20 COMMENT '总号源数量',
  remaining_slots INT NOT NULL DEFAULT 20 COMMENT '剩余号源数量',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_schedule (doctor_id, schedule_date, period),
  FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
  INDEX idx_doctor_date (doctor_id, schedule_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='医生号源管理';

CREATE TABLE appointments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  doctor_id CHAR(36) NOT NULL COMMENT '医生ID',
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
  FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE,
  INDEX idx_doctor (doctor_id),
  INDEX idx_date (schedule_date),
  INDEX idx_phone (patient_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预约记录';
