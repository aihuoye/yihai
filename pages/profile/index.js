const app = getApp();

Page({
  data: {
    userName: '微信用户',
    phoneNumber: null,
    appointments: [],
    services: [
      { id: 'records', title: '预约记录', icon: '＋' },
      { id: 'contact', title: '联系我们', icon: '💬' },
      { id: 'hospital', title: '了解我院', icon: '📋' }
    ]
  },

  onLoad() {
    // 加载用户手机号
    this.loadPhoneNumber();
  },

  onShow() {
    this.syncStore();
    this.loadPhoneNumber();
  },

  onPullDownRefresh() {
    this.syncStore();
    wx.stopPullDownRefresh();
  },

  syncStore() {
    this.setData({
      appointments: app.globalData.appointments || []
    });
  },

  loadPhoneNumber() {
    // 从全局数据或缓存中加载手机号
    const phoneNumber = app.globalData.phoneNumber || wx.getStorageSync('phoneNumber');
    if (phoneNumber) {
      this.setData({ phoneNumber });
    }
  },

  async handleGetPhoneNumber(e) {
    console.log('手机号授权结果:', e.detail);
    
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // 获取到加密数据，需要发送到后端解密
      const { code, encryptedData, iv } = e.detail;
      
      wx.showLoading({ title: '登录中...', mask: true });
      
      try {
        // 调用后端接口解密手机号
        const res = await this.decryptPhoneNumber(code, encryptedData, iv);
        
        if (res.success && res.phoneNumber) {
          const phoneNumber = res.phoneNumber;
          
          // 保存手机号到全局数据和缓存
          app.globalData.phoneNumber = phoneNumber;
          wx.setStorageSync('phoneNumber', phoneNumber);
          
          this.setData({ phoneNumber });
          
          wx.hideLoading();
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
        } else {
          throw new Error(res.message || '获取手机号失败');
        }
      } catch (error) {
        console.error('手机号解密失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: error.message || '登录失败，请重试',
          icon: 'none'
        });
      }
    } else {
      wx.showToast({
        title: '取消授权',
        icon: 'none'
      });
    }
  },

  // 调用后端接口解密手机号
  decryptPhoneNumber(code, encryptedData, iv) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://localhost:4000/api/decrypt-phone',
        method: 'POST',
        data: { code, encryptedData, iv },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(new Error('服务器错误'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  handleUserInfoTap() {
    // 点击已登录的用户信息区域，可以显示更多选项
    wx.showActionSheet({
      itemList: ['退出登录'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 退出登录
          this.handleLogout();
        }
      }
    });
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除手机号信息
          app.globalData.phoneNumber = null;
          wx.removeStorageSync('phoneNumber');
          this.setData({ phoneNumber: null });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  handleServiceTap(e) {
    const { id } = e.currentTarget.dataset;
    if (id === 'records') {
      if (this.data.appointments.length) {
        const latest = this.data.appointments[0];
        wx.showToast({ title: `${latest.doctor.name} 就诊中`, icon: 'none' });
      } else {
        wx.showToast({ title: '暂无预约记录', icon: 'none' });
      }
      return;
    }
    if (id === 'contact') {
      wx.showToast({ title: '客服：400-888-8888', icon: 'none' });
      return;
    }
    if (id === 'hospital') {
      wx.navigateTo({ url: '/pages/hospital-info/index' });
    }
  },



  handleTabTap(e) {
    const { tab } = e.currentTarget.dataset;
    if (tab === 'mine') return;
    if (tab === 'home') {
      wx.redirectTo({ url: '/pages/home/index' });
      return;
    }
    if (tab === 'booking') {
      wx.redirectTo({ url: '/pages/tab-booking/index' });
    }
  }
});
