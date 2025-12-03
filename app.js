const { hospitals, featuredDoctors } = require('./utils/mockData');
const { fetchDoctors, API_BASE_URL } = require('./utils/api');
const { DEFAULT_AVATAR } = require('./utils/constants');

App({
  onLaunch() {
    this.globalData = {
      hospitals,
      favorites: wx.getStorageSync('favorites') || [],
      appointments: wx.getStorageSync('appointments') || [],
      doctors: [],
      phoneNumber: wx.getStorageSync('phoneNumber') || null
    };
    this.doctorReadyCallbacks = [];
    this.loadDoctors();
  },

  loadDoctors() {
    fetchDoctors()
      .then(doctors => {
        if (Array.isArray(doctors) && doctors.length) {
          this.setDoctors(doctors);
        } else {
          this.setDoctors(featuredDoctors);
        }
      })
      .catch(() => {
        this.setDoctors(featuredDoctors);
      });
  },

  setDoctors(doctors) {
    this.globalData.doctors = doctors.map(doctor => {
      const hasId = doctor && doctor.id;
      const avatarUrl = hasId ? `${API_BASE_URL}/api/doctors/${doctor.id}/avatar` : DEFAULT_AVATAR;
      return {
        ...doctor,
        avatarImage: avatarUrl
      };
    });
    (this.doctorReadyCallbacks || []).forEach(cb => typeof cb === 'function' && cb(this.globalData.doctors));
    this.doctorReadyCallbacks = [];
  },

  toggleFavorite(hospitalId) {
    const favorites = new Set(wx.getStorageSync('favorites') || []);
    if (favorites.has(hospitalId)) {
      favorites.delete(hospitalId);
    } else {
      favorites.add(hospitalId);
    }
    const next = Array.from(favorites);
    wx.setStorageSync('favorites', next);
    this.globalData.favorites = next;
    return next;
  },

  addAppointment(appointment) {
    const appointments = wx.getStorageSync('appointments') || [];
    appointments.unshift({ ...appointment, id: `apt-${Date.now()}` });
    wx.setStorageSync('appointments', appointments);
    this.globalData.appointments = appointments;
    return appointments;
  }
});
