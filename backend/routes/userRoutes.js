const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

// Tìm kiếm người dùng
router.get('/search', authMiddleware, userController.searchUsers);

// Mọi người (kể cả không login vẫn có thể xem avatar của người khác - nhưng project này đòi login)
router.get('/:id', authMiddleware, userController.getUserProfile);

module.exports = router;
