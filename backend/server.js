const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const WechatBot = require('./wechatBot');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'medical_points',
  waitForConnections: true,
  connectionLimit: 10
});

const DEFAULT_AVATAR_PATH = path.join(__dirname, 'public-sample-avatar.png');
let defaultAvatarBase64 = '';

try {
  defaultAvatarBase64 = fs.readFileSync(DEFAULT_AVATAR_PATH).toString('base64');
} catch (error) {
  console.warn('Unable to preload default avatar image', error);
  defaultAvatarBase64 = '';
}

const normalizeAvatarValue = value => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  return value.replace(/^data:image\/[a-zA-Z0-9+/]+;base64,/, '').trim();
};

const getAvatarBase64 = stored => {
  if (!stored && !defaultAvatarBase64) {
    return null;
  }
  let normalized = '';
  if (Buffer.isBuffer(stored)) {
    normalized = stored.toString('base64');
  } else if (typeof stored === 'string') {
    normalized = stored.trim();
  }
  if (!normalized) {
    normalized = defaultAvatarBase64;
  }
  return normalized ? `data:image/png;base64,${normalized}` : null;
};

const mapDoctorRow = row => ({
  id: row.id,
  name: row.name,
  title: row.title,
  expertise: row.expertise,
  intro: row.intro,
  hospitalId: row.hospital_id,
  hospitalName: row.hospital_name,
  departmentName: row.department_name,
  registrationFee: row.registration_fee || 10.00,
  avatarImage: getAvatarBase64(row.avatar_image)
});

const mapDoctorSummaryRow = row => ({
  id: row.id,
  name: row.name,
  title: row.title,
  expertise: row.expertise,
  intro: row.intro,
  hospitalId: row.hospital_id,
  hospitalName: row.hospital_name,
  departmentName: row.department_name
});

app.get('/api/doctors', async (req, res) => {
  const start = Date.now();
  try {
    const keyword = req.query.keyword ? `%${req.query.keyword}%` : null;
    const summary = req.query.summary === '1';
    let sql;
    if (summary) {
      sql =
        'SELECT id, name, title, expertise, intro, hospital_id, hospital_name, department_name FROM doctors';
    } else {
      sql = 'SELECT * FROM doctors';
    }
    const params = [];
    if (keyword) {
      sql += ' WHERE name LIKE ? OR expertise LIKE ?';
      params.push(keyword, keyword);
    }
    const dbStart = Date.now();
    const [rows] = await pool.query(sql, params);
    const dbElapsed = Date.now() - dbStart;
    const mapper = summary ? mapDoctorSummaryRow : mapDoctorRow;
    const payload = rows.map(mapper);
    const totalElapsed = Date.now() - start;
    console.log(
      '[api/doctors]',
      `summary=${summary ? '1' : '0'}`,
      `rows=${rows.length}`,
      `db=${dbElapsed}ms`,
      `total=${totalElapsed}ms`
    );
    res.json(payload);
  } catch (error) {
    const totalElapsed = Date.now() - start;
    console.error('Failed to query doctors', { elapsed: totalElapsed, error });
    res.status(500).json({ message: 'Failed to load doctors' });
  }
});

app.get('/api/doctors/:id/avatar', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT avatar_image FROM doctors WHERE id = ?', [req.params.id]);
    let base64 = '';
    if (!rows.length || !rows[0].avatar_image) {
      base64 = defaultAvatarBase64;
    } else if (typeof rows[0].avatar_image === 'string') {
      base64 = rows[0].avatar_image.trim();
    } else if (Buffer.isBuffer(rows[0].avatar_image)) {
      base64 = rows[0].avatar_image.toString('base64');
    }
    if (!base64) {
      res.status(404).end();
      return;
    }
    const buffer = Buffer.from(base64, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(buffer);
  } catch (error) {
    console.error('Failed to load avatar', error);
    res.status(500).json({ message: 'Failed to load avatar' });
  }
});

app.get('/api/doctors/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      res.status(404).json({ message: 'Doctor not found' });
      return;
    }
    res.json(mapDoctorRow(rows[0]));
  } catch (error) {
    console.error('Failed to load doctor', error);
    res.status(500).json({ message: 'Failed to load doctor' });
  }
});

app.post('/api/admin/doctors', async (req, res) => {
  const { name, title, expertise, intro, hospitalId, hospitalName, departmentName, avatarImage, registrationFee } = req.body;
  if (!name) {
    res.status(400).json({ message: 'Doctor name is required' });
    return;
  }
  try {
    const avatarPayload = normalizeAvatarValue(avatarImage) || defaultAvatarBase64 || null;
    const fee = registrationFee || 10.00;
    const [result] = await pool.query(
      'INSERT INTO doctors (name, title, expertise, intro, hospital_id, hospital_name, department_name, avatar_image, registration_fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, title || '', expertise || '', intro || '', hospitalId || '', hospitalName || '', departmentName || '', avatarPayload, fee]
    );
    const [rows] = await pool.query('SELECT * FROM doctors WHERE id = ?', [result.insertId]);
    res.status(201).json(mapDoctorRow(rows[0]));
  } catch (error) {
    console.error('Failed to create doctor', error);
    res.status(500).json({ message: 'Create doctor failed' });
  }
});

app.put('/api/admin/doctors/:id', async (req, res) => {
  const { name, title, expertise, intro, hospitalId, hospitalName, departmentName, avatarImage, registrationFee } = req.body;
  try {
    const avatarPayload = normalizeAvatarValue(avatarImage);
    const fee = registrationFee !== undefined ? registrationFee : 10.00;
    const [result] = await pool.query(
      'UPDATE doctors SET name=?, title=?, expertise=?, intro=?, hospital_id=?, hospital_name=?, department_name=?, avatar_image=?, registration_fee=? WHERE id=?',
      [name, title, expertise, intro, hospitalId, hospitalName, departmentName, avatarPayload, fee, req.params.id]
    );
    if (!result.affectedRows) {
      res.status(404).json({ message: 'Doctor not found' });
      return;
    }
    const [rows] = await pool.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    res.json(mapDoctorRow(rows[0]));
  } catch (error) {
    console.error('Failed to update doctor', error);
    res.status(500).json({ message: 'Update doctor failed' });
  }
});

app.delete('/api/admin/doctors/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM doctors WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) {
      res.status(404).json({ message: 'Doctor not found' });
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error('Failed to delete doctor', error);
    res.status(500).json({ message: 'Delete doctor failed' });
  }
});

// 微信小程序手机号解密接口
app.post('/api/decrypt-phone', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false,
        message: 'code is required' 
      });
    }
    
    // 从环境变量获取小程序配置
    const appId = process.env.WECHAT_APPID;
    const appSecret = process.env.WECHAT_APP_SECRET;
    
    if (!appId || !appSecret) {
      console.error('Missing WECHAT_APPID or WECHAT_APP_SECRET in environment variables');
      return res.status(500).json({ 
        success: false,
        message: 'Server configuration error: Missing WeChat credentials' 
      });
    }
    
    // 调用微信接口获取 access_token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    const tokenResponse = await axios.get(tokenUrl);
    
    if (tokenResponse.data.errcode) {
      console.error('Failed to get access_token:', tokenResponse.data);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to get access token',
        error: tokenResponse.data.errmsg 
      });
    }
    
    const accessToken = tokenResponse.data.access_token;
    
    // 调用微信接口获取手机号
    const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
    const phoneResponse = await axios.post(phoneUrl, { code });
    
    if (phoneResponse.data.errcode !== 0) {
      console.error('Failed to get phone number:', phoneResponse.data);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to decrypt phone number',
        error: phoneResponse.data.errmsg 
      });
    }
    
    const phoneInfo = phoneResponse.data.phone_info;
    const phoneNumber = phoneInfo.purePhoneNumber || phoneInfo.phoneNumber;
    
    res.json({ 
      success: true,
      phoneNumber: phoneNumber,
      countryCode: phoneInfo.countryCode
    });
    
  } catch (error) {
    console.error('Failed to decrypt phone number', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to decrypt phone number', 
      error: error.message 
    });
  }
});

// 企业微信消息推送接口
app.post('/api/wechat/send-booking-notification', async (req, res) => {
  try {
    const { webhookUrl, orderNumber, projectName, phone, message, submitTime, mentionAll } = req.body;
    
    // 验证必填参数
    if (!webhookUrl) {
      return res.status(400).json({ message: 'webhookUrl is required' });
    }
    if (!orderNumber || !projectName || !phone) {
      return res.status(400).json({ message: 'orderNumber, projectName and phone are required' });
    }
    
    // 创建企业微信机器人实例
    const bot = new WechatBot(webhookUrl);
    
    // 发送预约通知
    const result = await bot.sendBookingNotification({
      orderNumber,
      projectName,
      phone,
      message: message || '授权号码',
      submitTime: submitTime || new Date().toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      })
    }, mentionAll !== false);
    
    res.json({ 
      success: true, 
      message: 'Notification sent successfully',
      data: result 
    });
  } catch (error) {
    console.error('Failed to send wechat notification', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send notification', 
      error: error.message 
    });
  }
});

// 企业微信发送自定义文本消息接口
app.post('/api/wechat/send-text', async (req, res) => {
  try {
    const { webhookUrl, content, mentionedList, mentionedMobileList } = req.body;
    
    if (!webhookUrl || !content) {
      return res.status(400).json({ message: 'webhookUrl and content are required' });
    }
    
    const bot = new WechatBot(webhookUrl);
    const result = await bot.sendText(content, mentionedList, mentionedMobileList);
    
    res.json({ 
      success: true, 
      message: 'Text message sent successfully',
      data: result 
    });
  } catch (error) {
    console.error('Failed to send wechat text message', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send text message', 
      error: error.message 
    });
  }
});

// 企业微信发送Markdown消息接口
app.post('/api/wechat/send-markdown', async (req, res) => {
  try {
    const { webhookUrl, content } = req.body;
    
    if (!webhookUrl || !content) {
      return res.status(400).json({ message: 'webhookUrl and content are required' });
    }
    
    const bot = new WechatBot(webhookUrl);
    const result = await bot.sendMarkdown(content);
    
    res.json({ 
      success: true, 
      message: 'Markdown message sent successfully',
      data: result 
    });
  } catch (error) {
    console.error('Failed to send wechat markdown message', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send markdown message', 
      error: error.message 
    });
  }
});

// ==================== 号源管理接口 ====================

// 获取医生号源信息
app.get('/api/doctors/:id/schedules', async (req, res) => {
  try {
    const doctorId = req.params.id;
    const startDate = req.query.startDate || new Date().toISOString().split('T')[0];
    
    const [schedules] = await pool.query(
      `SELECT * FROM doctor_schedules 
       WHERE doctor_id = ? AND schedule_date >= ? 
       ORDER BY schedule_date, period`,
      [doctorId, startDate]
    );
    
    res.json(schedules);
  } catch (error) {
    console.error('Failed to load doctor schedules', error);
    res.status(500).json({ message: 'Failed to load schedules' });
  }
});

// 管理后台：设置医生号源
app.post('/api/admin/schedules', async (req, res) => {
  try {
    const { doctorId, scheduleDate, period, totalSlots } = req.body;
    
    if (!doctorId || !scheduleDate || !period || !totalSlots) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // 使用 INSERT ... ON DUPLICATE KEY UPDATE 来处理新增或更新
    const [result] = await pool.query(
      `INSERT INTO doctor_schedules (doctor_id, schedule_date, period, total_slots, remaining_slots)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       total_slots = VALUES(total_slots),
       remaining_slots = VALUES(remaining_slots)`,
      [doctorId, scheduleDate, period, totalSlots, totalSlots]
    );
    
    res.json({ 
      success: true, 
      message: 'Schedule saved successfully',
      id: result.insertId 
    });
  } catch (error) {
    console.error('Failed to save schedule', error);
    res.status(500).json({ message: 'Failed to save schedule' });
  }
});

// 管理后台：批量设置医生号源（设置未来N天的号源）
app.post('/api/admin/schedules/batch', async (req, res) => {
  try {
    const { doctorId, days, morningSlots, afternoonSlots } = req.body;
    
    if (!doctorId || !days) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const today = new Date();
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // 设置上午号源
        if (morningSlots > 0) {
          await connection.query(
            `INSERT INTO doctor_schedules (doctor_id, schedule_date, period, total_slots, remaining_slots)
             VALUES (?, ?, '上午', ?, ?)
             ON DUPLICATE KEY UPDATE 
             total_slots = VALUES(total_slots),
             remaining_slots = VALUES(remaining_slots)`,
            [doctorId, dateStr, morningSlots, morningSlots]
          );
        }
        
        // 设置下午号源
        if (afternoonSlots > 0) {
          await connection.query(
            `INSERT INTO doctor_schedules (doctor_id, schedule_date, period, total_slots, remaining_slots)
             VALUES (?, ?, '下午', ?, ?)
             ON DUPLICATE KEY UPDATE 
             total_slots = VALUES(total_slots),
             remaining_slots = VALUES(remaining_slots)`,
            [doctorId, dateStr, afternoonSlots, afternoonSlots]
          );
        }
      }
      
      await connection.commit();
      res.json({ success: true, message: `Successfully set schedules for ${days} days` });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to batch save schedules', error);
    res.status(500).json({ message: 'Failed to batch save schedules' });
  }
});

// 管理后台：获取所有号源列表
app.get('/api/admin/schedules', async (req, res) => {
  try {
    const [schedules] = await pool.query(
      `SELECT s.*, d.name as doctor_name, d.hospital_name, d.department_name
       FROM doctor_schedules s
       LEFT JOIN doctors d ON s.doctor_id = d.id
       WHERE s.schedule_date >= CURDATE()
       ORDER BY s.schedule_date, s.doctor_id, s.period`
    );
    
    res.json(schedules);
  } catch (error) {
    console.error('Failed to load schedules', error);
    res.status(500).json({ message: 'Failed to load schedules' });
  }
});

// ==================== 预约接口 ====================

// 创建预约
app.post('/api/appointments', async (req, res) => {
  try {
    const {
      doctorId,
      doctorName,
      hospitalName,
      departmentName,
      scheduleDate,
      period,
      patientName,
      patientGender,
      patientAge,
      patientPhone,
      symptoms,
      registrationFee
    } = req.body;
    
    // 验证必填字段
    if (!doctorId || !scheduleDate || !period || !patientName || !patientPhone) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 1. 检查号源是否充足
      const [schedules] = await connection.query(
        `SELECT * FROM doctor_schedules 
         WHERE doctor_id = ? AND schedule_date = ? AND period = ?
         FOR UPDATE`,
        [doctorId, scheduleDate, period]
      );
      
      if (!schedules.length) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ message: '该时段暂无号源' });
      }
      
      const schedule = schedules[0];
      if (schedule.remaining_slots <= 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ message: '该时段号源已满' });
      }
      
      // 2. 扣减号源
      await connection.query(
        `UPDATE doctor_schedules 
         SET remaining_slots = remaining_slots - 1 
         WHERE id = ?`,
        [schedule.id]
      );
      
      // 3. 创建预约记录
      const [result] = await connection.query(
        `INSERT INTO appointments 
         (doctor_id, doctor_name, hospital_name, department_name, schedule_date, period, 
          patient_name, patient_gender, patient_age, patient_phone, symptoms, registration_fee, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [doctorId, doctorName, hospitalName, departmentName, scheduleDate, period,
         patientName, patientGender, patientAge, patientPhone, symptoms, registrationFee]
      );
      
      await connection.commit();
      connection.release();
      
      // 4. 返回预约信息
      const [appointments] = await pool.query(
        'SELECT * FROM appointments WHERE id = ?',
        [result.insertId]
      );
      
      res.status(201).json({
        success: true,
        message: '预约成功',
        appointment: appointments[0]
      });
      
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Failed to create appointment', error);
    res.status(500).json({ message: 'Failed to create appointment', error: error.message });
  }
});

// 查询预约记录
app.get('/api/appointments', async (req, res) => {
  try {
    const { phone, doctorId, status } = req.query;
    
    let sql = 'SELECT * FROM appointments WHERE 1=1';
    const params = [];
    
    if (phone) {
      sql += ' AND patient_phone = ?';
      params.push(phone);
    }
    
    if (doctorId) {
      sql += ' AND doctor_id = ?';
      params.push(doctorId);
    }
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const [appointments] = await pool.query(sql, params);
    res.json(appointments);
  } catch (error) {
    console.error('Failed to load appointments', error);
    res.status(500).json({ message: 'Failed to load appointments' });
  }
});

// 取消预约
app.put('/api/appointments/:id/cancel', async (req, res) => {
  try {
    const appointmentId = req.params.id;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 1. 获取预约信息
      const [appointments] = await connection.query(
        'SELECT * FROM appointments WHERE id = ? FOR UPDATE',
        [appointmentId]
      );
      
      if (!appointments.length) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: 'Appointment not found' });
      }
      
      const appointment = appointments[0];
      
      if (appointment.status === 'cancelled') {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ message: 'Appointment already cancelled' });
      }
      
      // 2. 更新预约状态
      await connection.query(
        'UPDATE appointments SET status = "cancelled" WHERE id = ?',
        [appointmentId]
      );
      
      // 3. 恢复号源
      await connection.query(
        `UPDATE doctor_schedules 
         SET remaining_slots = remaining_slots + 1 
         WHERE doctor_id = ? AND schedule_date = ? AND period = ?`,
        [appointment.doctor_id, appointment.schedule_date, appointment.period]
      );
      
      await connection.commit();
      connection.release();
      
      res.json({ success: true, message: 'Appointment cancelled successfully' });
      
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Failed to cancel appointment', error);
    res.status(500).json({ message: 'Failed to cancel appointment' });
  }
});

app.use('/admin', express.static(path.join(__dirname, 'admin')));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Doctor service listening on port ${PORT}`);
});
