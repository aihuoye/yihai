const app = getApp();

Page({
  data: {
    userName: '微信用户',
    userInfo: null,
    appointments: [],
    services: [
      { id: 'records', title: '预约记录', icon: '＋' },
      { id: 'contact', title: '联系我们', icon: '💬' },
      { id: 'hospital', title: '了解我院', icon: '📋' }
    ]
  },

  onLoad() {
    // 加载用户信息
    this.loadUserInfo();
  },

  onShow() {
    this.syncStore();
    this.loadUserInfo();
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

  loadUserInfo() {
    // 从全局数据或缓存中加载用户信息
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  handleGetUserInfo(e) {
    console.log('用户信息授权结果:', e.detail);
    
    if (e.detail.userInfo) {
      const userInfo = e.detail.userInfo;
      
      // 保存用户信息到全局数据和缓存
      app.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);
      
      this.setData({ userInfo });
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '取消授权',
        icon: 'none'
      });
    }
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
          // 清除用户信息
          app.globalData.userInfo = null;
          wx.removeStorageSync('userInfo');
          this.setData({ userInfo: null });
          
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
