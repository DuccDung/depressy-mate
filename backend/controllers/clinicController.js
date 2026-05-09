const pool = require('../config/db');

// Lấy danh sách tất cả phòng khám
exports.getAllClinics = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clinics');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching clinics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Lấy chi tiết 1 phòng khám
exports.getClinicById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM clinics WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching clinic:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Thêm mới phòng khám
exports.createClinic = async (req, res) => {
  try {
    const { id, name, address, department, working_hours, services, price_reference, url_avatar } = req.body;
    const result = await pool.query(
      `INSERT INTO clinics (id, name, address, department, working_hours, services, price_reference, url_avatar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, name, address, department, working_hours, JSON.stringify(services), price_reference, url_avatar]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating clinic:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cập nhật thông tin phòng khám
exports.updateClinic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, department, working_hours, services, price_reference, url_avatar } = req.body;
    const result = await pool.query(
      `UPDATE clinics
       SET name = $1, address = $2, department = $3, working_hours = $4, services = $5, price_reference = $6, url_avatar = $7
       WHERE id = $8 RETURNING *`,
      [name, address, department, working_hours, JSON.stringify(services), price_reference, url_avatar, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating clinic:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Xóa phòng khám
exports.deleteClinic = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM clinics WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    res.status(200).json({ message: 'Clinic deleted successfully' });
  } catch (err) {
    console.error('Error deleting clinic:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
