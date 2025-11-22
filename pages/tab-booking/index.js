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
    tabs: [
      { id: 'dept', title: '按科室' },
      { id: 'date', title: '按日期' },
      { id: 'doctor', title: '按医生' }
    ],
    activeTab: 'dept',
    departmentList: ['男科门诊', '性功能障碍门诊', '男性不育门诊', '前列腺专病门诊'],
    referenceDate: today,
    currentMonth: `${today.getFullYear()} / ${String(today.getMonth() + 1).padStart(2, '0')}`,
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: buildCalendar(today),
    selectedDayIndex: today.getDay(),
    doctorList: [],
    searchKeyword: '',
    filteredDoctors: []
  },

  onLoad() {
    this.prepareDoctors();
  },

  prepareDoctors() {
    onDoctorsReady(doctors => {
      this.setData({ doctorList: doctors, filteredDoctors: doctors });
    });
  },

  handleTabChange(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ activeTab: id });
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

  handleDoctorSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  handleDoctorSearchConfirm() {
    const keyword = this.data.searchKeyword.trim().toLowerCase();
    const filtered = keyword
      ? this.data.doctorList.filter(doctor =>
          doctor.name.toLowerCase().includes(keyword) || doctor.expertise.toLowerCase().includes(keyword)
        )
      : this.data.doctorList;
    this.setData({ filteredDoctors: filtered });
  },

  handleDeptSelect(e) {
    const { name } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/date-booking/index?dept=${encodeURIComponent(name)}` });
  },

  handleTabTap(e) {
    const { tab } = e.currentTarget.dataset;
    if (tab === 'booking') return;
    if (tab === 'home') {
      wx.redirectTo({ url: '/pages/home/index' });
      return;
    }
    if (tab === 'mine') {
      wx.redirectTo({ url: '/pages/profile/index' });
    }
  }
});
