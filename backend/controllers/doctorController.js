const pool = require('../config/db');

// Lấy danh sách tất cả bác sĩ
exports.getAllDoctors = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM doctors');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Lấy chi tiết 1 bác sĩ
exports.getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM doctors WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching doctor:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Thêm mới bác sĩ
exports.createDoctor = async (req, res) => {
  try {
    const { id, name, specialty, degree, workplace, experience, treatment_focus, price_reference, url_avatar } = req.body;
    const result = await pool.query(
      `INSERT INTO doctors (id, name, specialty, degree, workplace, experience, treatment_focus, price_reference, url_avatar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, name, specialty, degree, workplace, experience, JSON.stringify(treatment_focus), price_reference, url_avatar]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating doctor:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cập nhật thông tin bác sĩ
exports.updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, specialty, degree, workplace, experience, treatment_focus, price_reference, url_avatar } = req.body;
    const result = await pool.query(
      `UPDATE doctors
       SET name = $1, specialty = $2, degree = $3, workplace = $4, experience = $5, treatment_focus = $6, price_reference = $7, url_avatar = $8
       WHERE id = $9 RETURNING *`,
      [name, specialty, degree, workplace, experience, JSON.stringify(treatment_focus), price_reference, url_avatar, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating doctor:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Xóa bác sĩ
exports.deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM doctors WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.status(200).json({ message: 'Doctor deleted successfully' });
  } catch (err) {
    console.error('Error deleting doctor:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
