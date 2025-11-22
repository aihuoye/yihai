const app = getApp();

Page({
  data: {
    hospital: null,
    selectedDeptId: '',
    favorites: []
  },

  onLoad(options) {
    const { id } = options;
    const hospital = (app.globalData.hospitals || []).find(item => item.id === id) || null;
    this.setData({
      hospital,
      selectedDeptId: hospital ? hospital.departments[0].id : ''
    });
    wx.setNavigationBarTitle({ title: hospital ? hospital.name : '医院详情' });
  },

  onShow() {
    this.setData({ favorites: app.globalData.favorites || [] });
  },

  selectDepartment(e) {
    this.setData({ selectedDeptId: e.currentTarget.dataset.id });
  },

  toggleFavorite() {
    if (!this.data.hospital) return;
    const next = app.toggleFavorite(this.data.hospital.id);
    this.setData({ favorites: next });
    wx.showToast({
      title: next.includes(this.data.hospital.id) ? '已关注' : '已取消',
      icon: 'success'
    });
  },

  goBooking(e) {
    const { doctorId } = e.currentTarget.dataset;
    const { hospital, selectedDeptId } = this.data;
    wx.navigateTo({
      url: `/pages/booking/index?hospitalId=${hospital.id}&deptId=${selectedDeptId}&doctorId=${doctorId}`
    });
  }
});
