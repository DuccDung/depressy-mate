const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// POST /api/auth/register - Đăng ký tài khoản mới
router.post('/register', register);

// POST /api/auth/login - Đăng nhập
router.post('/login', login);

module.exports = router;
