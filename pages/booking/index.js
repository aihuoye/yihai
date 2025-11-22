const app = getApp();

const weekMap = ['日', '一', '二', '三', '四', '五', '六'];

const buildDates = () => {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 5; i += 1) {
    const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const value = `${date.getFullYear()}-${month}-${day}`;
    dates.push({
      value,
      label: `周${weekMap[date.getDay()]} ${month}-${day}`
    });
  }
  return dates;
};

Page({
  data: {
    hospital: null,
    department: null,
    doctor: null,
    dates: [],
    selectedDate: '',
    selectedSlot: '',
    patientName: '',
    idCard: '',
    mobile: ''
  },

  onLoad(options) {
    const { hospitalId, deptId, doctorId } = options;
    const hospital = (app.globalData.hospitals || []).find(item => item.id === hospitalId);
    const department = hospital ? hospital.departments.find(item => item.id === deptId) : null;
    const doctor = department ? department.doctors.find(item => item.id === doctorId) : null;
    const dates = buildDates();
    this.setData({
      hospital,
      department,
      doctor,
      dates,
      selectedDate: dates[0]?.value || '',
      selectedSlot: doctor?.slots[0] || ''
    });
    wx.setNavigationBarTitle({ title: doctor ? `${doctor.name}挂号` : '预约挂号' });
  },

  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  selectDate(e) {
    this.setData({ selectedDate: e.currentTarget.dataset.value });
  },

  selectSlot(e) {
    this.setData({ selectedSlot: e.currentTarget.dataset.value });
  },

  submit() {
    const { hospital, doctor, selectedDate, selectedSlot, patientName, idCard, mobile } = this.data;
    if (!patientName || !idCard || !mobile) {
      wx.showToast({ title: '请完整填写个人信息', icon: 'none' });
      return;
    }
    app.addAppointment({ hospital, doctor, date: selectedDate, slot: selectedSlot, patientName });
    wx.showToast({ title: '预约成功', icon: 'success' });
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/profile/index?section=appointments' });
    }, 600);
  }
});
