CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  title VARCHAR(50),
  expertise TEXT,
  intro TEXT,
  hospital_id VARCHAR(20),
  hospital_name VARCHAR(100),
  department_name VARCHAR(100),
  avatar_image LONGTEXT
);

INSERT INTO doctors (name, title, expertise, intro, hospital_id, hospital_name, department_name, avatar_image)
VALUES
('刘志勇', '主任医师', '男性功能障碍(早泄阳痿)、前列腺疾病', '毕业于河南省医学院，从事男科泌尿临床20余年', 'h1', '市第一人民医院', '男科门诊', NULL),
('韦峰', '主任医师', '慢性前列腺炎、前列腺增生、排尿异常', '深耕泌尿外科领域20余年，擅长微创诊疗', 'h1', '市第一人民医院', '泌尿外科', NULL),
('王修伟', '主任医师', '急慢性前列腺炎、包皮系带手术、阳痿', '拥有泌尿外科临床执业经验20余年，专注男性健康', 'h2', '和康中医院', '专家门诊', NULL),
('王晓贺', '主任医师', '男性勃起功能障碍、器质性及心理问题诊疗', '拥有泌尿外科临床经验20余年，擅长综合治疗方案', 'h2', '和康中医院', '男性专病门诊', NULL);
