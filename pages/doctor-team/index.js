const { onDoctorsReady } = require('../../utils/doctorHelper');
const { DEFAULT_AVATAR } = require('../../utils/constants');

Page({
  data: {
    searchKeyword: '',
    doctors: [],
    defaultAvatar: DEFAULT_AVATAR
  },

  onLoad() {
    this.prepareDoctors();
  },

  prepareDoctors() {
    onDoctorsReady(doctors => {
      this.fullDoctors = doctors;
      this.setData({ doctors });
    });
  },

  handleInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  handleSearch() {
    const keyword = this.data.searchKeyword.trim().toLowerCase();
    const source = this.fullDoctors || [];
    const filtered = keyword
      ? source.filter(doctor =>
          doctor.name.toLowerCase().includes(keyword) || doctor.expertise.toLowerCase().includes(keyword)
        )
      : source;
    this.setData({ doctors: filtered });
  },

  openDoctor(e) {
    const { name } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/doctor-detail/index?name=${encodeURIComponent(name)}` });
  }
});
