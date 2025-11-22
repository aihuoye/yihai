function ensureCallbacks(appInstance) {
  if (!appInstance.doctorReadyCallbacks) {
    appInstance.doctorReadyCallbacks = [];
  }
  return appInstance.doctorReadyCallbacks;
}

function onDoctorsReady(callback) {
  const appInstance = getApp();
  ensureCallbacks(appInstance);
  const cached = appInstance.globalData && appInstance.globalData.doctors;
  if (cached && cached.length) {
    callback(cached);
  } else {
    appInstance.doctorReadyCallbacks.push(callback);
  }
}

module.exports = {
  onDoctorsReady
};
