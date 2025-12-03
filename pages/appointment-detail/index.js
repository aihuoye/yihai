const app = getApp();
const API_BASE = 'http://localhost:4000/api';

Page({
  data: {
    doctor: null,
    selectedDate: '',
    selectedPeriod: '上午',
    phoneNumber: '',
    patientName: '',
    patientGender: '男',
    patientAge: '',
    symptoms: ''
  },

  onLoad(options) {
    // 从URL参数获取医生ID和日期
    const doctorId = options.doctorId;
    const date = options.date;
    
    if (!doctorId || !date) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({
      selectedDate: date
    });
    
    // 加载医生信息
    this.loadDoctorInfo(doctorId);
    
    // 尝试从缓存加载用户信息
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (userInfo && userInfo.nickName) {
      this.setData({
        patientName: userInfo.nickName
      });
    }
  },

  // 加载医生信息
  loadDoctorInfo(doctorId) {
    wx.showLoading({ title: '加载中...' });
    
    wx.request({
      url: `${API_BASE}/doctors/${doctorId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            doctor: res.data
          });
        } else {
          wx.showToast({
            title: '加载医生信息失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 选择时段
  selectPeriod(e) {
    const period = e.currentTarget.dataset.period;
    this.setData({
      selectedPeriod: period
    });
  },

  // 选择性别
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      patientGender: gender
    });
  },

  // 处理输入
  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  // 获取手机号（简化版，直接输入）
  getPhoneNumber() {
    wx.showModal({
      title: '输入手机号',
      editable: true,
      placeholderText: '请输入手机号',
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({
            phoneNumber: res.content
          });
        }
      }
    });
  },

  // 提交预约
  submitAppointment() {
    const { doctor, selectedDate, selectedPeriod, phoneNumber, patientName, patientGender, patientAge, symptoms } = this.data;
    
    // 验证必填字段
    if (!patientName) {
      wx.showToast({
        title: '请输入就诊人姓名',
        icon: 'none'
      });
      return;
    }
    
    if (!phoneNumber) {
      wx.showToast({
        title: '请输入预约电话',
        icon: 'none'
      });
      return;
    }
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '提交中...' });
    
    // 调用预约接口
    wx.request({
      url: `${API_BASE}/appointments`,
      method: 'POST',
      data: {
        doctorId: doctor.id,
        doctorName: doctor.name,
        hospitalName: doctor.hospitalName,
        departmentName: doctor.departmentName,
        scheduleDate: selectedDate,
        period: selectedPeriod,
        patientName: patientName,
        patientGender: patientGender,
        patientAge: patientAge ? parseInt(patientAge) : null,
        patientPhone: phoneNumber,
        symptoms: symptoms,
        registrationFee: doctor.registrationFee
      },
      success: (res) => {
        wx.hideLoading();
        
        if (res.statusCode === 201 && res.data.success) {
          wx.showToast({
            title: '预约成功',
            icon: 'success'
          });
          
          // 保存预约信息到本地（可选）
          const appointment = res.data.appointment;
          app.addAppointment && app.addAppointment(appointment);
          
          // 延迟跳转
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.data.message || '预约失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('预约失败', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  }
});
