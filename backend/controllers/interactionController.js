const pool = require('../config/db');
const { getIO } = require('../config/socket');

// =============================================
// LIKE / UNLIKE
// =============================================

/**
 * POST /api/posts/:id/like
 * Toggle like: nếu chưa like thì like, nếu đã like thì unlike.
 * Cập nhật like_count trên bảng posts (denormalized counter).
 * Emit socket notification cho chủ bài viết.
 */
exports.toggleLike = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    await client.query('BEGIN');

    // Kiểm tra bài viết tồn tại
    const postCheck = await client.query(
      'SELECT user_id FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [postId]
    );
    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post not found' });
    }

    const postOwnerId = postCheck.rows[0].user_id;

    // Kiểm tra đã like chưa
    const existingLike = await client.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    let action;
    if (existingLike.rows.length > 0) {
      // Unlike
      await client.query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );
      await client.query(
        'UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1',
        [postId]
      );
      action = 'unliked';
    } else {
      // Like
      await client.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
        [postId, userId]
      );
      await client.query(
        'UPDATE posts SET like_count = like_count + 1 WHERE id = $1',
        [postId]
      );
      action = 'liked';

      // Emit socket notification (chỉ khi like, không khi unlike)
      if (postOwnerId !== userId) {
        try {
          const io = getIO();
          io.to(`user:${postOwnerId}`).emit('new_notification', {
            type: 'LIKE',
            from_user_id: userId,
            post_id: postId,
            message: 'đã thích bài viết của bạn',
            created_at: new Date().toISOString(),
          });
        } catch (socketErr) {
          // Socket chưa init hoặc lỗi — không block request
          console.warn('Socket emit warning:', socketErr.message);
        }
      }
    }

    await client.query('COMMIT');

    // Lấy like_count mới
    const updated = await pool.query(
      'SELECT like_count FROM posts WHERE id = $1',
      [postId]
    );

    res.json({
      action,
      like_count: updated.rows[0].like_count,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error toggling like:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// =============================================
// COMMENTS
// =============================================

/**
 * GET /api/posts/:id/comments
 * Lấy danh sách comments (cursor-based pagination).
 */
exports.getComments = async (req, res) => {
  try {
    const postId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const cursor = req.query.cursor;

    let query = `
      SELECT 
        c.id, c.content, c.created_at, c.user_id,
        pr.full_name AS author_name,
        pr.avatar_url AS author_avatar
      FROM comments c
      LEFT JOIN profiles pr ON pr.user_id = c.user_id
      WHERE c.post_id = $1
    `;
    const params = [postId];
    let paramIndex = 2;

    if (cursor) {
      query += ` AND c.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);
    const comments = result.rows;
    const nextCursor = comments.length === limit ? comments[comments.length - 1].created_at : null;

    res.json({
      data: comments,
      next_cursor: nextCursor,
      has_more: comments.length === limit,
    });
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/posts/:id/comments
 * Tạo comment mới. Cập nhật comment_count. Emit socket notification.
 */
exports.createComment = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const postId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    await client.query('BEGIN');

    // Kiểm tra bài viết tồn tại
    const postCheck = await client.query(
      'SELECT user_id FROM posts WHERE id = $1 AND deleted_at IS NULL',
      [postId]
    );
    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post not found' });
    }

    const postOwnerId = postCheck.rows[0].user_id;

    // Insert comment
    const result = await client.query(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [postId, userId, content.trim()]);

    // Cập nhật comment_count
    await client.query(
      'UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1',
      [postId]
    );

    await client.query('COMMIT');

    // Emit socket notification
    if (postOwnerId !== userId) {
      try {
        const io = getIO();
        io.to(`user:${postOwnerId}`).emit('new_notification', {
          type: 'COMMENT',
          from_user_id: userId,
          post_id: postId,
          comment_id: result.rows[0].id,
          message: 'đã bình luận về bài viết của bạn',
          created_at: new Date().toISOString(),
        });
      } catch (socketErr) {
        console.warn('Socket emit warning:', socketErr.message);
      }
    }

    // JOIN profile info cho response
    const comment = await pool.query(`
      SELECT c.*, pr.full_name AS author_name, pr.avatar_url AS author_avatar
      FROM comments c
      LEFT JOIN profiles pr ON pr.user_id = c.user_id
      WHERE c.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(comment.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/comments/:id
 * Xóa comment (chỉ owner). Cập nhật comment_count.
 */
exports.deleteComment = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const commentId = req.params.id;

    await client.query('BEGIN');

    // Tìm comment
    const commentResult = await client.query(
      'SELECT post_id FROM comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (commentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Comment not found or not authorized' });
    }

    const postId = commentResult.rows[0].post_id;

    // Xóa comment
    await client.query('DELETE FROM comments WHERE id = $1', [commentId]);

    // Cập nhật comment_count
    await client.query(
      'UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1',
      [postId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};
