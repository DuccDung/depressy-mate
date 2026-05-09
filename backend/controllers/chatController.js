const pool = require('../config/db');

/**
 * GET /api/conversations
 * Lấy danh sách hội thoại của user hiện tại, kèm tin nhắn cuối cùng
 * và thông tin người tham gia.
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        c.id,
        c.type,
        c.created_at,
        -- Tin nhắn cuối cùng (lateral join)
        lm.last_message_content,
        lm.last_message_at,
        lm.last_message_sender_id,
        -- Đếm tin nhắn chưa đọc
        (
          SELECT COUNT(*)::int FROM messages m 
          WHERE m.conversation_id = c.id 
            AND m.sender_id != $1 
            AND m.is_read = FALSE
        ) AS unread_count
      FROM conversations c
      INNER JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
      LEFT JOIN LATERAL (
        SELECT m.content AS last_message_content,
               m.created_at AS last_message_at,
               m.sender_id AS last_message_sender_id
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON TRUE
      ORDER BY COALESCE(lm.last_message_at, c.created_at) DESC
    `, [userId]);

    // Lấy danh sách participants cho mỗi conversation
    const conversations = result.rows;
    if (conversations.length > 0) {
      const convIds = conversations.map(c => c.id);
      const participantsResult = await pool.query(`
        SELECT 
          cp.conversation_id,
          cp.user_id,
          pr.full_name,
          pr.avatar_url
        FROM conversation_participants cp
        LEFT JOIN profiles pr ON pr.user_id = cp.user_id
        WHERE cp.conversation_id = ANY($1) AND cp.user_id != $2
      `, [convIds, userId]);

      // Map participants vào conversations
      const participantsMap = {};
      for (const p of participantsResult.rows) {
        if (!participantsMap[p.conversation_id]) {
          participantsMap[p.conversation_id] = [];
        }
        participantsMap[p.conversation_id].push({
          user_id: p.user_id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
        });
      }

      for (const conv of conversations) {
        conv.participants = participantsMap[conv.id] || [];
      }
    }

    res.json(conversations);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/conversations
 * Tạo hội thoại mới (1-1). Body: { participant_id }
 * Nếu đã có conversation 1-1 giữa 2 user, trả về conversation cũ.
 */
exports.createConversation = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { participant_id } = req.body;

    if (!participant_id) {
      return res.status(400).json({ error: 'participant_id is required' });
    }

    if (participant_id === userId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    // Kiểm tra user tồn tại
    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [participant_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Kiểm tra đã có conversation 1-1 giữa 2 user chưa
    const existingConv = await client.query(`
      SELECT c.id FROM conversations c
      WHERE c.type = 'DIRECT'
        AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $1)
        AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $2)
    `, [userId, participant_id]);

    if (existingConv.rows.length > 0) {
      return res.json({ id: existingConv.rows[0].id, existing: true });
    }

    // Tạo conversation mới
    await client.query('BEGIN');

    const convResult = await client.query(
      "INSERT INTO conversations (type) VALUES ('DIRECT') RETURNING *"
    );
    const convId = convResult.rows[0].id;

    // Thêm 2 participants
    await client.query(
      'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
      [convId, userId, participant_id]
    );

    await client.query('COMMIT');

    res.status(201).json({ id: convId, existing: false });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating conversation:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/conversations/:id/messages
 * Lịch sử tin nhắn (cursor-based pagination).
 */
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit) || 30, 50);
    const cursor = req.query.cursor;

    // Kiểm tra user có trong conversation không
    const memberCheck = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [convId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    let query = `
      SELECT 
        m.id, m.content, m.is_read, m.created_at, m.sender_id,
        pr.full_name AS sender_name,
        pr.avatar_url AS sender_avatar
      FROM messages m
      LEFT JOIN profiles pr ON pr.user_id = m.sender_id
      WHERE m.conversation_id = $1
    `;
    const params = [convId];
    let paramIndex = 2;

    if (cursor) {
      query += ` AND m.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);
    const messages = result.rows;
    const nextCursor = messages.length === limit ? messages[messages.length - 1].created_at : null;

    res.json({
      data: messages,
      next_cursor: nextCursor,
      has_more: messages.length === limit,
    });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/conversations/:id/messages
 * Gửi tin nhắn mới (lưu DB + emit socket).
 */
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Kiểm tra user thuộc conversation
    const memberCheck = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [convId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    // Insert message
    const msgResult = await pool.query(`
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [convId, userId, content.trim()]);

    const message = msgResult.rows[0];

    // Lấy profile sender
    const profileResult = await pool.query(
      'SELECT full_name, avatar_url FROM profiles WHERE user_id = $1',
      [userId]
    );
    const senderProfile = profileResult.rows[0] || {};

    const fullMessage = {
      ...message,
      sender_name: senderProfile.full_name,
      sender_avatar: senderProfile.avatar_url,
    };

    // Emit socket event cho các thành viên khác
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();

      // Lấy tất cả participants (trừ sender)
      const participants = await pool.query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
        [convId, userId]
      );

      for (const p of participants.rows) {
        io.to(`user:${p.user_id}`).emit('receive_message', {
          conversation_id: convId,
          message: fullMessage,
        });
      }
    } catch (socketErr) {
      console.warn('Socket emit warning:', socketErr.message);
    }

    res.status(201).json(fullMessage);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/conversations/:convId/messages/read
 * Đánh dấu tất cả tin nhắn trong conversation là đã đọc (cho user hiện tại).
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;

    await pool.query(`
      UPDATE messages SET is_read = TRUE
      WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE
    `, [convId, userId]);

    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
