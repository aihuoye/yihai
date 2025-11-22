const app = getApp();
const { onDoctorsReady } = require('../../utils/doctorHelper');

Page({
  data: {
    hospitals: [],
    filteredHospitals: [],
    searchKeyword: '',
    mainAction: { id: 'register', title: '预约挂号', desc: '线上预约，快速便捷', theme: 'card-blue', iconType: 'diamond' },
    secondaryActions: [
      { id: 'profile', title: '我的预约', desc: '查看个人预约', theme: 'card-cyan', iconType: 'diamond' },
      { id: 'experts', title: '专家团队', desc: '知名医生值班', theme: 'card-peach', iconType: 'medic' }
    ],
    bannerList: [
      { id: 'platform', image: '/assets/banner-1.png' },
      { id: 'experts', image: '/assets/banner-2.png' }
    ],
    specialtyList: [
      { id: 'prostate', title: '前列腺炎', icon: '🌀' },
      { id: 'infertile', title: '男性不育', icon: '🧬' },
      { id: 'premature', title: '阳痿早泄', icon: '💊' },
      { id: 'infection', title: '泌尿感染', icon: '🩺' },
      { id: 'phimosis', title: '包皮包茎', icon: '⚙️' },
      { id: 'asthenos', title: '少精弱精', icon: '🧫' },
      { id: 'reproductive', title: '生殖感染', icon: '🧻' },
      { id: 'others', title: '其他疾病', icon: '➕' }
    ],
    recommendedDoctors: []
  },

  onLoad() {
    const list = (app.globalData && app.globalData.hospitals) || [];
    this.setData({ hospitals: list, filteredHospitals: list });
    this.prepareDoctors();
  },

  onShow() {
    this.setData({ favorites: app.globalData.favorites || [] });
  },

  prepareDoctors() {
    onDoctorsReady(doctors => {
      const next = doctors.slice(0, 4).map(doctor => ({
        ...doctor,
        avatarText: doctor.name.slice(0, 1)
      }));
      this.setData({ recommendedDoctors: next });
    });
  },

  handleSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  handleSearchConfirm() {
    const { searchKeyword, hospitals } = this.data;
    const keyword = searchKeyword.trim().toLowerCase();
    const filtered = keyword
      ? hospitals.filter(hospital => {
          const hospitalMatch =
            hospital.name.toLowerCase().includes(keyword) ||
            hospital.address.toLowerCase().includes(keyword);
          const doctorMatch = (hospital.departments || []).some(dept =>
            (dept.doctors || []).some(doctor => (doctor.name || '').toLowerCase().includes(keyword))
          );
          return hospitalMatch || doctorMatch;
        })
      : hospitals;
    this.setData({ filteredHospitals: filtered });
  },

  navToHospital(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/hospital/index?id=${id}` });
  },

  navToDoctor(e) {
    const { name } = e.currentTarget.dataset;
    if (!name) return;
    wx.navigateTo({ url: `/pages/doctor-detail/index?name=${encodeURIComponent(name)}` });
  },

  navToProfile() {
    wx.navigateTo({ url: '/pages/profile/index' });
  },

  handleActionTap(e) {
    const { id } = e.currentTarget.dataset;
    switch (id) {
      case 'register':
        wx.redirectTo({ url: '/pages/tab-booking/index' });
        break;
      case 'profile':
        this.navToProfile();
        break;
      case 'experts':
        wx.navigateTo({ url: '/pages/doctor-team/index' });
        break;
      default:
        wx.showToast({ title: '敬请期待', icon: 'none' });
        break;
    }
  },

  handleDoctorTeam() {
    wx.navigateTo({ url: '/pages/doctor-team/index' });
  },

  handleTabTap(e) {
    const { tab } = e.currentTarget.dataset;
    if (tab === 'home') {
      return;
    }
    if (tab === 'booking') {
      wx.redirectTo({ url: '/pages/tab-booking/index' });
      return;
    }
    if (tab === 'mine') {
      wx.redirectTo({ url: '/pages/profile/index' });
    }
  },

  handleSpecialtyTap(e) {
    const { name } = e.currentTarget.dataset;
    const dept = encodeURIComponent(name);
    wx.navigateTo({ url: `/pages/date-booking/index?dept=${dept}` });
  }
});
