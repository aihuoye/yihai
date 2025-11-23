const { DEFAULT_AVATAR } = require('./constants');

const departments = [
  {
    id: 'internal',
    name: '内科',
    desc: '常见内科疾病诊疗',
    doctors: [
      { id: 'd1', name: '张良', title: '主任医师', expertise: '呼吸慢病管理', slots: ['09:00', '10:30', '14:00'] },
      { id: 'd2', name: '李芳', title: '副主任医师', expertise: '心内科、胸痛', slots: ['08:30', '11:00', '15:30'] }
    ]
  },
  {
    id: 'surgery',
    name: '外科',
    desc: '微创、日间手术',
    doctors: [
      { id: 'd3', name: '王林', title: '主任医师', expertise: '普外、甲状腺', slots: ['09:30', '13:30', '16:00'] },
      { id: 'd4', name: '赵越', title: '主治医师', expertise: '创伤、骨科', slots: ['08:00', '10:30', '14:30'] }
    ]
  }
];

const hospitals = [
  {
    id: 'h1',
    name: '市第一人民医院',
    level: '三级甲等',
    address: '市中区健康路88号',
    distance: '1.2km',
    tel: '020-88886666',
    cover: '/assets/hospital-1.jpg',
    tags: ['支持医保', '发热门诊'],
    departments
  },
  {
    id: 'h2',
    name: '和康中医院',
    level: '二级甲等',
    address: '科技大道66号',
    distance: '3.5km',
    tel: '020-88669999',
    cover: '/assets/hospital-2.jpg',
    tags: ['老年友好', '中医特色'],
    departments
  }
];

const featuredDoctors = [
  {
    name: '刘志勇',
    title: '主任医师',
    expertise: '男性功能障碍(早泄阳痿)、前列腺疾病',
    intro: '毕业于河南省医学院，从事男科泌尿临床20余年',
    hospitalId: 'h1',
    hospitalName: '市第一人民医院',
    departmentName: '男科门诊',
    avatarImage: DEFAULT_AVATAR
  },
  {
    name: '韦峰',
    title: '主任医师',
    expertise: '慢性前列腺炎、前列腺增生、排尿异常',
    intro: '深耕泌尿外科领域20余年，擅长微创诊疗',
    hospitalId: 'h1',
    hospitalName: '市第一人民医院',
    departmentName: '泌尿外科',
    avatarImage: DEFAULT_AVATAR
  },
  {
    name: '王修伟',
    title: '主任医师',
    expertise: '急慢性前列腺炎、包皮系带手术、阳痿',
    intro: '拥有泌尿外科临床执业经验20余年，专注男性健康',
    hospitalId: 'h2',
    hospitalName: '和康中医院',
    departmentName: '专家门诊',
    avatarImage: DEFAULT_AVATAR
  },
  {
    name: '王晓贺',
    title: '主任医师',
    expertise: '男性勃起功能障碍、器质性及心理问题诊疗',
    intro: '拥有泌尿外科临床经验20余年，擅长综合治疗方案',
    hospitalId: 'h2',
    hospitalName: '和康中医院',
    departmentName: '男性专病门诊',
    avatarImage: DEFAULT_AVATAR
  }
];

module.exports = {
  hospitals,
  departments,
  featuredDoctors
};
