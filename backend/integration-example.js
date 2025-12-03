/**
 * 企业微信通知集成示例
 * 
 * 这个文件展示了如何在小程序预约功能中集成企业微信群消息推送
 * 
 * 使用方法：
 * 1. 将相关代码复制到你的预约页面 JS 文件中
 * 2. 配置 API_BASE_URL 和 WECHAT_WEBHOOK_URL
 * 3. 在预约成功后调用 sendWechatNotification 函数
 */

// ============================================
// 配置部分
// ============================================

// 后端 API 地址
const API_BASE_URL = 'http://your-server.com'; // 替换为你的服务器地址

// 企业微信群机器人 Webhook 地址
// 建议将此配置存储在服务器端，而不是硬编码在小程序中
const WECHAT_WEBHOOK_URL = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY';

// ============================================
// 工具函数
// ============================================

/**
 * 获取今日订单号
 * 这里使用简单的本地存储实现，实际项目中应该从服务器获取
 */
function getTodayOrderNumber() {
  const today = new Date().toDateString();
  const storageKey = 'orderCount_' + today;
  
  let count = wx.getStorageSync(storageKey) || 0;
  count += 1;
  wx.setStorageSync(storageKey, count);
  
  return count;
}

/**
 * 格式化时间
 */
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 发送企业微信通知
 */
function sendWechatNotification(bookingData) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}/api/wechat/send-booking-notification`,
      method: 'POST',
      data: {
        webhookUrl: WECHAT_WEBHOOK_URL,
        orderNumber: bookingData.orderNumber,
        projectName: bookingData.projectName,
        phone: bookingData.phone,
        message: bookingData.message || '授权号码',
        submitTime: bookingData.submitTime,
        mentionAll: true
      },
      success(res) {
        if (res.data && res.data.success) {
          console.log('企业微信通知发送成功', res.data);
          resolve(res.data);
        } else {
          console.error('企业微信通知发送失败', res.data);
          reject(new Error(res.data?.message || '发送失败'));
        }
      },
      fail(err) {
        console.error('企业微信通知请求失败', err);
        reject(err);
      }
    });
  });
}

// ============================================
// 集成到预约页面的示例代码
// ============================================

/**
 * 修改后的 submit 函数
 * 在原有的预约提交逻辑基础上，增加企业微信通知功能
 */
function submit() {
  const { hospital, doctor, selectedDate, selectedSlot, patientName, idCard, mobile } = this.data;
  
  // 验证表单
  if (!patientName || !idCard || !mobile) {
    wx.showToast({ title: '请完整填写个人信息', icon: 'none' });
    return;
  }
  
  // 显示加载提示
  wx.showLoading({ title: '提交中...' });
  
  // 保存预约信息到本地
  const app = getApp();
  app.addAppointment({ 
    hospital, 
    doctor, 
    date: selectedDate, 
    slot: selectedSlot, 
    patientName 
  });
  
  // 准备企业微信通知数据
  const orderNumber = getTodayOrderNumber();
  const notificationData = {
    orderNumber: orderNumber,
    projectName: hospital?.name || '医院预约',
    phone: mobile,
    message: `患者：${patientName}，预约时间：${selectedDate} ${selectedSlot}`,
    submitTime: formatDateTime(new Date())
  };
  
  // 发送企业微信通知
  sendWechatNotification(notificationData)
    .then(() => {
      console.log('通知发送成功');
    })
    .catch((error) => {
      console.error('通知发送失败，但不影响预约', error);
      // 注意：即使通知发送失败，也不影响预约流程
    })
    .finally(() => {
      wx.hideLoading();
      
      // 显示预约成功提示
      wx.showToast({ title: '预约成功', icon: 'success' });
      
      // 跳转到个人中心
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/profile/index?section=appointments' });
      }, 600);
    });
}

// ============================================
// 完整的页面代码示例
// ============================================

/**
 * 这是一个完整的预约页面示例，包含企业微信通知功能
 * 可以直接替换 pages/booking/index.js 的内容
 */

const completePageExample = {
  data: {
    hospital: null,
    department: null,
    doctor: null,
    dates: [],
    selectedDate: '',
    selectedSlot: '',
    patientName: '',
    idCard: '',
    mobile: ''
  },

  onLoad(options) {
    const app = getApp();
    const { hospitalId, deptId, doctorId } = options;
    const hospital = (app.globalData.hospitals || []).find(item => item.id === hospitalId);
    const department = hospital ? hospital.departments.find(item => item.id === deptId) : null;
    const doctor = department ? department.doctors.find(item => item.id === doctorId) : null;
    const dates = this.buildDates();
    
    this.setData({
      hospital,
      department,
      doctor,
      dates,
      selectedDate: dates[0]?.value || '',
      selectedSlot: doctor?.slots[0] || ''
    });
    
    wx.setNavigationBarTitle({ title: doctor ? `${doctor.name}挂号` : '预约挂号' });
  },

  buildDates() {
    const weekMap = ['日', '一', '二', '三', '四', '五', '六'];
    const dates = [];
    const now = new Date();
    
    for (let i = 0; i < 5; i += 1) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const value = `${date.getFullYear()}-${month}-${day}`;
      dates.push({
        value,
        label: `周${weekMap[date.getDay()]} ${month}-${day}`
      });
    }
    
    return dates;
  },

  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  selectDate(e) {
    this.setData({ selectedDate: e.currentTarget.dataset.value });
  },

  selectSlot(e) {
    this.setData({ selectedSlot: e.currentTarget.dataset.value });
  },

  // 提交预约（包含企业微信通知）
  submit() {
    const { hospital, doctor, selectedDate, selectedSlot, patientName, idCard, mobile } = this.data;
    
    // 验证表单
    if (!patientName || !idCard || !mobile) {
      wx.showToast({ title: '请完整填写个人信息', icon: 'none' });
      return;
    }
    
    // 显示加载提示
    wx.showLoading({ title: '提交中...' });
    
    // 保存预约信息
    const app = getApp();
    app.addAppointment({ 
      hospital, 
      doctor, 
      date: selectedDate, 
      slot: selectedSlot, 
      patientName 
    });
    
    // 发送企业微信通知
    this.sendWechatNotification({
      projectName: hospital?.name || '医院预约',
      phone: mobile,
      message: `患者：${patientName}，预约时间：${selectedDate} ${selectedSlot}`
    });
    
    wx.hideLoading();
    wx.showToast({ title: '预约成功', icon: 'success' });
    
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/profile/index?section=appointments' });
    }, 600);
  },

  // 发送企业微信通知
  sendWechatNotification(data) {
    const orderNumber = this.getTodayOrderNumber();
    
    wx.request({
      url: `${API_BASE_URL}/api/wechat/send-booking-notification`,
      method: 'POST',
      data: {
        webhookUrl: WECHAT_WEBHOOK_URL,
        orderNumber: orderNumber,
        projectName: data.projectName,
        phone: data.phone,
        message: data.message,
        submitTime: formatDateTime(new Date()),
        mentionAll: true
      },
      success(res) {
        console.log('企业微信通知发送成功', res.data);
      },
      fail(err) {
        console.error('企业微信通知发送失败', err);
        // 注意：通知发送失败不影响预约流程
      }
    });
  },

  // 获取今日订单号
  getTodayOrderNumber() {
    const today = new Date().toDateString();
    const storageKey = 'orderCount_' + today;
    let count = wx.getStorageSync(storageKey) || 0;
    count += 1;
    wx.setStorageSync(storageKey, count);
    return count;
  }
};

// ============================================
// 导出说明
// ============================================

/**
 * 使用步骤：
 * 
 * 1. 配置常量
 *    - 修改 API_BASE_URL 为你的服务器地址
 *    - 修改 WECHAT_WEBHOOK_URL 为你的企业微信群机器人地址
 * 
 * 2. 集成到现有代码
 *    - 复制 sendWechatNotification 函数
 *    - 复制 getTodayOrderNumber 函数
 *    - 复制 formatDateTime 函数
 *    - 在 submit 函数中调用 sendWechatNotification
 * 
 * 3. 测试
 *    - 提交一个预约
 *    - 检查企业微信群是否收到通知
 * 
 * 注意事项：
 * - 建议将 Webhook 地址存储在服务器端，通过 API 获取
 * - 通知发送失败不应影响预约流程
 * - 可以添加重试机制提高成功率
 * - 注意消息发送频率限制
 */

module.exports = {
  sendWechatNotification,
  getTodayOrderNumber,
  formatDateTime,
  completePageExample
};
