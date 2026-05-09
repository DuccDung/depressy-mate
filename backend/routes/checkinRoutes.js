const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createCheckin, getCheckins, uploadCheckinImage } = require('../controllers/checkinController');
const authMiddleware = require('../middlewares/authMiddleware');

// Multer config: lưu trong memory buffer (không ghi xuống disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, WebP).'));
    }
  },
});

// POST /api/checkins - Tạo check-in mới
router.post('/', authMiddleware, createCheckin);

// GET /api/checkins - Lấy lịch sử check-in
router.get('/', authMiddleware, getCheckins);

// POST /api/checkins/upload-image - Upload ảnh check-in
router.post('/upload-image', authMiddleware, upload.single('image'), uploadCheckinImage);

module.exports = router;
