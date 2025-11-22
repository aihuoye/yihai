Page({
  data: {
    patientServices: [
      { id: 'register', title: '患者服务', desc: '在线咨询、预约挂号', icon: '＋', theme: 'blue' },
      { id: 'doctor', title: '医生服务', desc: '在线问诊、健康管理', icon: '👨‍⚕️', theme: 'yellow' }
    ]
  },

  handleServiceTap(e) {
    const { id } = e.currentTarget.dataset;
    if (id === 'register') {
      wx.redirectTo({ url: '/pages/tab-booking/index' });
      return;
    }
    if (id === 'doctor') {
      wx.navigateTo({ url: '/pages/doctor-team/index' });
      return;
    }
  },

  onShareAppMessage() {
    return {
      title: '医院智慧平台',
      path: '/pages/hospital-info/index'
    };
  }
});
