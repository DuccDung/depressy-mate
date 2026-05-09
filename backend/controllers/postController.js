const pool = require('../config/db');

/**
 * GET /api/posts
 * Lấy bảng tin (Feed) với Cursor-based Pagination.
 * Query params: limit (default 10), cursor (created_at của bài cuối trang trước)
 * Trả về danh sách bài viết kèm thông tin user + is_liked (cho người dùng hiện tại).
 */
exports.getFeed = async (req, res) => {
  try {
    const userId = req.user?.id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const cursor = req.query.cursor; // ISO timestamp string

    let query = `
      SELECT 
        p.id, p.user_id, p.content, p.media_url, p.media_type,
        p.like_count, p.comment_count, p.created_at,
        pr.full_name AS author_name,
        pr.avatar_url AS author_avatar,
        ${userId ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) AS is_liked` : `FALSE AS is_liked`}
      FROM posts p
      LEFT JOIN profiles pr ON pr.user_id = p.user_id
      WHERE p.deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    if (userId) {
      params.push(userId);
      paramIndex++;
    }

    if (cursor) {
      query += ` AND p.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Tính next_cursor
    const posts = result.rows;
    const nextCursor = posts.length === limit ? posts[posts.length - 1].created_at : null;

    res.json({
      data: posts,
      next_cursor: nextCursor,
      has_more: posts.length === limit,
    });
  } catch (err) {
    console.error('Error fetching feed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/posts/:id
 * Chi tiết bài viết
 */
exports.getPostById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        p.id, p.user_id, p.content, p.media_url, p.media_type,
        p.like_count, p.comment_count, p.created_at,
        pr.full_name AS author_name,
        pr.avatar_url AS author_avatar,
        ${userId ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2) AS is_liked` : `FALSE AS is_liked`}
      FROM posts p
      LEFT JOIN profiles pr ON pr.user_id = p.user_id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `, userId ? [id, userId] : [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/posts
 * Tạo bài viết mới. Body: { content?, media_url, media_type }
 */
exports.createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, media_url, media_type } = req.body;

    if (!content && !media_url) {
      return res.status(400).json({ error: 'Content or media is required' });
    }

    const validTypes = ['IMAGE', 'VIDEO'];
    if (media_type && !validTypes.includes(media_type)) {
      return res.status(400).json({ error: 'media_type must be IMAGE or VIDEO' });
    }

    const result = await pool.query(`
      INSERT INTO posts (user_id, content, media_url, media_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, content || null, media_url || null, media_type || 'IMAGE']);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/posts/:id
 * Sửa bài viết (chỉ owner). Body: { content? }
 */
exports.updatePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { content } = req.body;

    const result = await pool.query(`
      UPDATE posts SET content = $1, updated_at = now()
      WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
      RETURNING *
    `, [content, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found or not authorized' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/posts/:id
 * Soft delete bài viết (chỉ owner).
 */
exports.deletePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE posts SET deleted_at = now()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found or not authorized' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
