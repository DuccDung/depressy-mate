const pool = require('../config/db');
const supabase = require('../config/supabase');
const crypto = require('crypto');

/**
 * POST /api/checkins
 * Tạo mới một mood check-in
 * Body: { mood, note, image_url? }
 */
const createCheckin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mood, note, image_url } = req.body;

    // Validate mood
    const validMoods = ['excellent', 'good', 'okay', 'sad', 'terrible'];
    if (!mood || !validMoods.includes(mood)) {
      return res.status(400).json({
        error: `Mood không hợp lệ. Chọn một trong: ${validMoods.join(', ')}`,
      });
    }

    // Validate note length (tối đa 500 ký tự)
    if (note && note.length > 500) {
      return res.status(400).json({
        error: 'Nội dung ghi chú không được vượt quá 500 ký tự.',
      });
    }

    const result = await pool.query(
      `INSERT INTO mood_checkins (user_id, mood, note, image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, mood, note || null, image_url || null]
    );

    res.status(201).json({
      message: 'Ghi nhận trạng thái thành công!',
      checkin: result.rows[0],
    });
  } catch (err) {
    console.error('Error creating checkin:', err);
    res.status(500).json({ error: 'Lỗi server khi ghi nhận trạng thái.' });
  }
};

/**
 * GET /api/checkins
 * Lấy lịch sử check-in của user hiện tại
 * Query params: ?limit=20&offset=0
 */
const getCheckins = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT * FROM mood_checkins
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Đếm tổng số check-in
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM mood_checkins WHERE user_id = $1`,
      [userId]
    );

    res.json({
      checkins: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });
  } catch (err) {
    console.error('Error fetching checkins:', err);
    res.status(500).json({ error: 'Lỗi server khi tải lịch sử trạng thái.' });
  }
};

/**
 * POST /api/checkins/upload-image
 * Upload ảnh lên Supabase Storage bucket 'checkin-images'
 * Sử dụng multer để xử lý multipart upload
 * Trả về public URL cho client gán vào check-in
 */
const uploadCheckinImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không tìm thấy file ảnh.' });
    }

    const userId = req.user.id;
    const file = req.file;
    const fileExt = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('checkin-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return res.status(500).json({ error: 'Upload ảnh thất bại.' });
    }

    // Lấy public URL
    const { data: urlData } = supabase.storage
      .from('checkin-images')
      .getPublicUrl(fileName);

    res.json({
      message: 'Upload ảnh thành công!',
      image_url: urlData.publicUrl,
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ error: 'Lỗi server khi upload ảnh.' });
  }
};

module.exports = { createCheckin, getCheckins, uploadCheckinImage };
