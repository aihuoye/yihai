const API_BASE_URL = 'http://localhost:4000';

function fetchDoctors(params = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}/api/doctors`,
      method: 'GET',
      data: params,
      success: res => resolve(res.data || []),
      fail: reject
    });
  });
}

module.exports = {
  API_BASE_URL,
  fetchDoctors
};
