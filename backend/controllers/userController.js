const pool = require('../config/db');

exports.getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        u.id, u.email, u.role, u.avatar_url AS base_avatar,
        p.full_name, p.avatar_url AS profile_avatar, p.bio
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRow = result.rows[0];

    return res.json({
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      full_name: userRow.full_name,
      avatar_url: userRow.base_avatar || userRow.profile_avatar || null,
      bio: userRow.bio
    });

  } catch (err) {
    console.error('Error fetching user profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/users/search
 * Tìm kiếm người dùng qua email hoặc tên để bắt đầu conversation
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.id; // required authMiddleware

    if (!q || q.trim() === '') {
      return res.json([]);
    }

    const searchTerm = `%${q.trim()}%`;

    const result = await pool.query(`
      SELECT 
        u.id AS user_id, 
        u.email, 
        p.full_name, 
        COALESCE(p.avatar_url, u.avatar_url) AS avatar_url 
      FROM users u 
      LEFT JOIN profiles p ON u.id = p.user_id 
      WHERE u.id != $1 
        AND (u.email ILIKE $2 OR p.full_name ILIKE $2) 
      LIMIT 20
    `, [userId, searchTerm]);

    return res.json(result.rows);
  } catch (err) {
    console.error('Error searching users:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
