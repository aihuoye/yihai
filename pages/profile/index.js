const app = getApp();

Page({
  data: {
    userName: '微信用户',
    appointments: [],
    phoneAuthorized: false,
    services: [
      { id: 'records', title: '预约记录', icon: '＋' },
      { id: 'contact', title: '联系我们', icon: '💬' },
      { id: 'hospital', title: '了解我院', icon: '📋' }
    ]
  },

  onShow() {
    this.syncStore();
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

  handleGetPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      this.setData({ phoneAuthorized: true });
      wx.showToast({ title: '手机号授权成功', icon: 'success' });
    } else {
      wx.showToast({ title: '授权取消', icon: 'none' });
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
