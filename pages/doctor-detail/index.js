const { onDoctorsReady } = require('../../utils/doctorHelper');
const { DEFAULT_AVATAR } = require('../../utils/constants');

const buildSchedule = () => {
  const result = [];
  const weekDayMap = ['日', '一', '二', '三', '四', '五', '六'];
  const now = new Date();
  for (let i = 0; i < 5; i += 1) {
    const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    result.push({
      dateText: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')} 周${weekDayMap[date.getDay()]}`,
      remain: 20 + i * 5
    });
  }
  return result;
};

Page({
  data: {
    doctor: null,
    schedules: [],
    activeSection: 'schedule',
    defaultAvatar: DEFAULT_AVATAR
  },

  onLoad(options) {
    this.targetName = options.name ? decodeURIComponent(options.name) : '';
    onDoctorsReady(doctors => {
      const doctor = doctors.find(item => item.name === this.targetName) || null;
      this.setData({ doctor, schedules: buildSchedule() });
      wx.setNavigationBarTitle({ title: doctor ? `${doctor.name} · 医生主页` : '医生主页' });
    });
  },

  handleScheduleBooking(e) {
    const { date } = e.currentTarget.dataset;
    wx.showToast({ title: `${date} 已预约`, icon: 'success' });
  },

  handleSectionChange(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ activeSection: tab });
  }
});
