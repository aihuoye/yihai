const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'medical_points',
  waitForConnections: true,
  connectionLimit: 10
});

const mapDoctorRow = row => ({
  id: row.id,
  name: row.name,
  title: row.title,
  expertise: row.expertise,
  intro: row.intro,
  hospitalId: row.hospital_id,
  hospitalName: row.hospital_name,
  departmentName: row.department_name,
  avatarBg: row.avatar_bg
});

app.get('/api/doctors', async (req, res) => {
  try {
    const keyword = req.query.keyword ? `%${req.query.keyword}%` : null;
    let sql = 'SELECT * FROM doctors';
    const params = [];
    if (keyword) {
      sql += ' WHERE name LIKE ? OR expertise LIKE ?';
      params.push(keyword, keyword);
    }
    const [rows] = await pool.query(sql, params);
    res.json(rows.map(mapDoctorRow));
  } catch (error) {
    console.error('Failed to query doctors', error);
    res.status(500).json({ message: 'Failed to load doctors' });
  }
});

app.get('/api/doctors/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      res.status(404).json({ message: 'Doctor not found' });
      return;
    }
    res.json(mapDoctorRow(rows[0]));
  } catch (error) {
    console.error('Failed to load doctor', error);
    res.status(500).json({ message: 'Failed to load doctor' });
  }
});

app.post('/api/admin/doctors', async (req, res) => {
  const { name, title, expertise, intro, hospitalId, hospitalName, departmentName, avatarBg } = req.body;
  if (!name) {
    res.status(400).json({ message: 'Doctor name is required' });
    return;
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO doctors (name, title, expertise, intro, hospital_id, hospital_name, department_name, avatar_bg) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, title || '', expertise || '', intro || '', hospitalId || '', hospitalName || '', departmentName || '', avatarBg || '#cfe2ff']
    );
    const [rows] = await pool.query('SELECT * FROM doctors WHERE id = ?', [result.insertId]);
    res.status(201).json(mapDoctorRow(rows[0]));
  } catch (error) {
    console.error('Failed to create doctor', error);
    res.status(500).json({ message: 'Create doctor failed' });
  }
});

app.put('/api/admin/doctors/:id', async (req, res) => {
  const { name, title, expertise, intro, hospitalId, hospitalName, departmentName, avatarBg } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE doctors SET name=?, title=?, expertise=?, intro=?, hospital_id=?, hospital_name=?, department_name=?, avatar_bg=? WHERE id=?',
      [name, title, expertise, intro, hospitalId, hospitalName, departmentName, avatarBg, req.params.id]
    );
    if (!result.affectedRows) {
      res.status(404).json({ message: 'Doctor not found' });
      return;
    }
    const [rows] = await pool.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    res.json(mapDoctorRow(rows[0]));
  } catch (error) {
    console.error('Failed to update doctor', error);
    res.status(500).json({ message: 'Update doctor failed' });
  }
});

app.delete('/api/admin/doctors/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM doctors WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) {
      res.status(404).json({ message: 'Doctor not found' });
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error('Failed to delete doctor', error);
    res.status(500).json({ message: 'Delete doctor failed' });
  }
});

app.use('/admin', express.static(path.join(__dirname, 'admin')));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Doctor service listening on port ${PORT}`);
});
