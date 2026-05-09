const pool = require('../config/db');

// Add a journal
const createJournal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, content, audioUrl } = req.body;
    
    if (!content && !audioUrl) {
        return res.status(400).json({ error: 'Nội dung hoặc ghi âm không được để trống.' });
    }

    const result = await pool.query(
      `INSERT INTO journals (user_id, title, content, audio_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, title || null, content || null, audioUrl || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating journal:', err);
    res.status(500).json({ error: 'Lỗi server khi tạo nhật ký.' });
  }
};

// Get journals
const getJournals = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT * FROM journals
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM journals WHERE user_id = $1`,
      [userId]
    );

    res.json({
      journals: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });
  } catch (err) {
    console.error('Error fetching journals:', err);
    res.status(500).json({ error: 'Lỗi server khi tải nhật ký.' });
  }
};

module.exports = {
  createJournal,
  getJournals,
};
