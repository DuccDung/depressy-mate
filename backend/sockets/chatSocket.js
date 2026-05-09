const pool = require('../config/db');

/**
 * Thiết lập Socket.io event handlers cho tính năng Chat real-time.
 * Gọi hàm này sau khi initSocket() trong config/socket.js.
 * @param {import('socket.io').Server} io
 */
const setupChatSocket = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.user.id;

    // =============================================
    // Event: send_message
    // Client gửi tin nhắn qua socket (thay vì REST API) cho trải nghiệm nhanh hơn
    // =============================================
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversation_id, content } = data;

        if (!conversation_id || !content || !content.trim()) {
          return callback?.({ error: 'conversation_id and content are required' });
        }

        // Kiểm tra membership
        const memberCheck = await pool.query(
          'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [conversation_id, userId]
        );

        if (memberCheck.rows.length === 0) {
          return callback?.({ error: 'Not a member of this conversation' });
        }

        // Lưu vào DB
        const msgResult = await pool.query(`
          INSERT INTO messages (conversation_id, sender_id, content)
          VALUES ($1, $2, $3)
          RETURNING *
        `, [conversation_id, userId, content.trim()]);

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

        // Emit tới tất cả participants của conversation (bao gồm sender)
        const participants = await pool.query(
          'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
          [conversation_id]
        );

        for (const p of participants.rows) {
          io.to(`user:${p.user_id}`).emit('receive_message', {
            conversation_id,
            message: fullMessage,
          });
        }

        // ACK thành công về cho sender
        callback?.({ success: true, message: fullMessage });
      } catch (err) {
        console.error('[Socket] send_message error:', err);
        callback?.({ error: 'Failed to send message' });
      }
    });

    // =============================================
    // Event: mark_read
    // Client thông báo đã đọc tin nhắn trong conversation
    // =============================================
    socket.on('mark_read', async (data) => {
      try {
        const { conversation_id } = data;
        if (!conversation_id) return;

        await pool.query(`
          UPDATE messages SET is_read = TRUE
          WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE
        `, [conversation_id, userId]);

        // Thông báo cho sender biết tin nhắn đã được đọc
        const participants = await pool.query(
          'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
          [conversation_id, userId]
        );

        // Emit "messages_read" event cho các user khác biết
        // (Để hiển thị tick xanh / read receipt)
        for (const p of participants.rows) {
          io.to(`user:${p.user_id}`).emit('messages_read', {
            conversation_id,
            read_by: userId,
          });
        }
      } catch (err) {
        console.error('[Socket] mark_read error:', err);
      }
    });

    // =============================================
    // Event: typing
    // Hiển thị trạng thái "đang nhập..." cho người kia
    // =============================================
    socket.on('typing', (data) => {
      const { conversation_id } = data;
      if (!conversation_id) return;

      // Broadcast typing indicator cho các user khác trong conversation
      socket.to(`conv:${conversation_id}`).emit('user_typing', {
        conversation_id,
        user_id: userId,
      });
    });

    socket.on('stop_typing', (data) => {
      const { conversation_id } = data;
      if (!conversation_id) return;

      socket.to(`conv:${conversation_id}`).emit('user_stop_typing', {
        conversation_id,
        user_id: userId,
      });
    });

    // =============================================
    // Event: join_conversation
    // Client join room conversation để nhận typing events
    // =============================================
    socket.on('join_conversation', async (data) => {
      try {
        const { conversation_id } = data;
        if (!conversation_id) return;

        // Verify membership
        const memberCheck = await pool.query(
          'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [conversation_id, userId]
        );

        if (memberCheck.rows.length > 0) {
          socket.join(`conv:${conversation_id}`);
        }
      } catch (err) {
        console.error('[Socket] join_conversation error:', err);
      }
    });

    socket.on('leave_conversation', (data) => {
      const { conversation_id } = data;
      if (conversation_id) {
        socket.leave(`conv:${conversation_id}`);
      }
    });
  });
};

module.exports = setupChatSocket;
