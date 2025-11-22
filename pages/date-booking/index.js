const { onDoctorsReady } = require('../../utils/doctorHelper');

const today = new Date();

const buildCalendar = (refDate = today) => {
  const week = [];
  const base = new Date(refDate);
  base.setDate(refDate.getDate() - refDate.getDay());
  for (let i = 0; i < 7; i += 1) {
    const current = new Date(base);
    current.setDate(base.getDate() + i);
    week.push({
      label: current.getDate(),
      full: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(
        current.getDate()
      ).padStart(2, '0')}`
    });
  }
  return week;
};

Page({
  data: {
    deptName: '',
    referenceDate: today,
    currentMonth: `${today.getFullYear()} / ${String(today.getMonth() + 1).padStart(2, '0')}`,
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: buildCalendar(today),
    selectedDayIndex: today.getDay(),
    doctorList: []
  },

  onLoad(options) {
    if (options.dept) {
      this.setData({ deptName: decodeURIComponent(options.dept) });
    }
    this.prepareDoctors();
  },

  prepareDoctors() {
    onDoctorsReady(doctors => {
      this.setData({ doctorList: doctors });
    });
  },

  handleDaySelect(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({ selectedDayIndex: index });
  },

  shiftMonth(direction) {
    const nextDate = new Date(this.data.referenceDate);
    nextDate.setMonth(nextDate.getMonth() + direction);
    this.setData({
      referenceDate: nextDate,
      currentMonth: `${nextDate.getFullYear()} / ${String(nextDate.getMonth() + 1).padStart(2, '0')}`,
      calendarDays: buildCalendar(nextDate),
      selectedDayIndex: 0
    });
  },

  prevMonth() {
    this.shiftMonth(-1);
  },

  nextMonth() {
    this.shiftMonth(1);
  },

  goBooking(e) {
    const { name } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/doctor-detail/index?name=${encodeURIComponent(name)}` });
  },

  handleTabTap(e) {
    const { tab } = e.currentTarget.dataset;
    if (tab === 'home') {
      wx.redirectTo({ url: '/pages/home/index' });
      return;
    }
    if (tab === 'booking') {
      wx.redirectTo({ url: '/pages/tab-booking/index' });
      return;
    }
    if (tab === 'mine') {
      wx.redirectTo({ url: '/pages/profile/index' });
    }
  }
});
